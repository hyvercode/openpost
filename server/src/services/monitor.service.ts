import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { EmailService } from './email.service';
import { audit } from './audit.service';
import { assertUrlSafe, createPinnedLookup } from './ssrf';

const TIMEOUT_MS = 20000;
const MAX_BYTES = 5 * 1024 * 1024;

async function safeGet(urlStr: string, headers: Record<string, string>): Promise<{ status: number; timeMs: number; bytes: number }> {
  const { urlObj, targetIp } = await assertUrlSafe(urlStr);
  const agentOpts = { lookup: createPinnedLookup(urlObj.hostname, targetIp) };
  const start = Date.now();
  const res = await axios.get(urlObj.toString(), {
    headers,
    timeout: TIMEOUT_MS,
    maxRedirects: 0,
    maxBodyLength: MAX_BYTES,
    maxContentLength: MAX_BYTES,
    httpAgent: new http.Agent(agentOpts as any),
    httpsAgent: new https.Agent(agentOpts as any),
    validateStatus: () => true,
  });
  const timeMs = Date.now() - start;
  const bytes = typeof res.data === 'string' ? Buffer.byteLength(res.data) : JSON.stringify(res.data ?? '').length;
  return { status: res.status, timeMs, bytes };
}

export interface MonitorInput {
  id?: string;
  workspaceId: string;
  collectionId: string;
  name: string;
  enabled?: boolean;
  intervalMinutes?: number;
  alertEmail?: string | null;
  slackWebhookUrl?: string | null;
  failThreshold?: number;
}

function sanitizeMonitorInput(data: Partial<MonitorInput>) {
  const interval = Math.max(5, Math.min(1440, Number(data.intervalMinutes) || 60));
  const failThreshold = Math.max(1, Math.min(20, Number(data.failThreshold) || 2));
  if (data.alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.alertEmail)) {
    throw new Error('Invalid alertEmail');
  }
  if (data.slackWebhookUrl && !/^https:\/\/(hooks\.slack\.com|discord\.com)\//.test(data.slackWebhookUrl)) {
    throw new Error('slackWebhookUrl must be an https hooks URL');
  }
  return { intervalMinutes: interval, failThreshold };
}

export class MonitorService {
  private emailService = new EmailService();

  async listByWorkspace(workspaceId: string) {
    return (prisma as any).monitor.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRuns(monitorId: string, limit = 20) {
    return (prisma as any).monitorRun.findMany({
      where: { monitorId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async create(data: MonitorInput, actorUserId?: string) {
    if (!data.workspaceId || !data.collectionId || !data.name?.trim()) {
      throw new Error('workspaceId, collectionId and name are required');
    }
    const collection = await prisma.collection.findUnique({ where: { id: data.collectionId } });
    if (!collection || (collection as any).deletedAt || (collection as any).workspaceId !== data.workspaceId) {
      throw new Error('Collection not found in this workspace');
    }
    const { intervalMinutes, failThreshold } = sanitizeMonitorInput(data);
    const created = await (prisma as any).monitor.create({
      data: {
        id: data.id || uuidv4(),
        workspaceId: data.workspaceId,
        collectionId: data.collectionId,
        name: data.name.trim().slice(0, 120),
        enabled: data.enabled !== false,
        intervalMinutes,
        alertEmail: data.alertEmail || null,
        slackWebhookUrl: data.slackWebhookUrl || null,
        failThreshold,
      },
    });
    await audit('monitor.create', { workspaceId: data.workspaceId, userId: actorUserId, entityType: 'monitor', entityId: created.id, detail: created.name });
    return created;
  }

  async update(id: string, data: Partial<MonitorInput>, actorUserId?: string) {
    const { intervalMinutes, failThreshold } = sanitizeMonitorInput({ ...data, intervalMinutes: data.intervalMinutes, failThreshold: data.failThreshold });
    const updated = await (prisma as any).monitor.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: String(data.name).trim().slice(0, 120) }),
        ...(data.enabled !== undefined && { enabled: !!data.enabled }),
        ...(data.intervalMinutes !== undefined && { intervalMinutes }),
        ...(data.failThreshold !== undefined && { failThreshold }),
        ...(data.alertEmail !== undefined && { alertEmail: data.alertEmail || null }),
        ...(data.slackWebhookUrl !== undefined && { slackWebhookUrl: data.slackWebhookUrl || null }),
      },
    });
    await audit('monitor.update', { workspaceId: updated.workspaceId, userId: actorUserId, entityType: 'monitor', entityId: id });
    return updated;
  }

  async remove(id: string, actorUserId?: string) {
    const existing = await (prisma as any).monitor.findUnique({ where: { id } });
    await (prisma as any).monitorRun.deleteMany({ where: { monitorId: id } });
    await (prisma as any).monitor.delete({ where: { id } });
    await audit('monitor.delete', { workspaceId: existing?.workspaceId, userId: actorUserId, entityType: 'monitor', entityId: id });
    return { success: true };
  }

  /** Execute one monitor immediately. Used by scheduler and Run-now. */
  async runMonitor(monitorId: string): Promise<{ status: string; passed: number; failed: number; timeMs: number }> {
    const monitor = await (prisma as any).monitor.findUnique({ where: { id: monitorId } });
    if (!monitor) throw new Error('Monitor not found');
    const collection: any = await prisma.collection.findUnique({ where: { id: monitor.collectionId } });
    if (!collection || collection.deletedAt) throw new Error('Monitored collection not found');

    let requests: any[] = [];
    try {
      requests = JSON.parse(collection.requests || '[]');
    } catch {
      requests = [];
    }
    // Only top-level GET/HEAD checks are executed by monitors (no bodies,
    // no scripts) — deterministic and safe.
    const checks = requests.filter((r) => ['GET', 'HEAD'].includes(String(r.method || 'GET').toUpperCase())).slice(0, 50);

    let passed = 0;
    let failed = 0;
    let timeMs = 0;
    const failures: string[] = [];
    for (const r of checks) {
      const url = this.interpolate(String(r.url || ''), {});
      if (!url) continue;
      try {
        const headers: Record<string, string> = {};
        for (const h of r.headers || []) {
          if (h?.enabled !== false && h?.key) headers[h.key] = String(h.value ?? '');
        }
        delete headers['authorization'];
        delete headers['cookie'];
        const t0 = Date.now();
        const res = await safeGet(url.startsWith('http') ? url : `http://${url}`, headers);
        timeMs += Date.now() - t0;
        if (res.status >= 200 && res.status < 400) passed++;
        else {
          failed++;
          failures.push(`${r.method} ${url} -> ${res.status}`);
        }
      } catch (e: any) {
        failed++;
        failures.push(`${r.method} ${url} -> ${String(e?.message || e).slice(0, 120)}`);
      }
    }

    const status = failed === 0 ? 'up' : 'down';
    const prevFailures = monitor.consecutiveFailures || 0;
    const consecutiveFailures = failed === 0 ? 0 : prevFailures + 1;
    await (prisma as any).monitor.update({
      where: { id: monitorId },
      data: { lastRunAt: new Date(), lastStatus: status, consecutiveFailures },
    });
    await (prisma as any).monitorRun.create({
      data: {
        id: uuidv4(),
        monitorId,
        status,
        passed,
        failed,
        timeMs,
        detail: failures.slice(0, 10).join('\n').slice(0, 2000),
      },
    });
    // Keep only the last 100 runs per monitor.
    const oldRuns = await (prisma as any).monitorRun.findMany({
      where: { monitorId },
      orderBy: { createdAt: 'desc' },
      skip: 100,
      select: { id: true },
    });
    if (oldRuns.length) {
      await (prisma as any).monitorRun.deleteMany({ where: { id: { in: oldRuns.map((r: any) => r.id) } } });
    }

    // Alert on transition into failing-at-threshold (not on every run).
    if (failed > 0 && prevFailures < monitor.failThreshold && consecutiveFailures >= monitor.failThreshold) {
      await this.sendAlert(monitor, failures);
    }
    await audit('monitor.run', { workspaceId: monitor.workspaceId, entityType: 'monitor', entityId: monitorId, detail: `${status} passed=${passed} failed=${failed}` });
    return { status, passed, failed, timeMs };
  }

  private interpolate(url: string, _vars: Record<string, string>): string {
    return url.replace(/\{\{[^}]+\}\}/g, '').trim();
  }

  private async sendAlert(monitor: any, failures: string[]): Promise<void> {
    const subject = `[OpenPost] Monitor DOWN: ${monitor.name}`;
    const text = `Monitor "${monitor.name}" failed ${monitor.failThreshold}+ consecutive checks.\n\n${failures.slice(0, 10).join('\n')}`;
    const jobs: Promise<unknown>[] = [];
    if (monitor.alertEmail) {
      jobs.push(
        this.emailService.sendMonitorAlert(monitor.alertEmail, subject, text).catch((e) => console.error('[monitor] email alert failed:', e?.message))
      );
    }
    if (monitor.slackWebhookUrl) {
      jobs.push(
        axios.post(monitor.slackWebhookUrl, { text: `*${subject}*\n${text.slice(0, 1500)}` }, { timeout: 10000 }).catch((e) => console.error('[monitor] slack alert failed:', e?.message))
      );
    }
    await Promise.all(jobs);
  }
}

// ---- In-process scheduler (single interval, overlap-guarded) ----
const running = new Set<string>();

export function startMonitorScheduler(intervalMs = 60000): void {
  if ((global as any).__openpostMonitorScheduler) return;
  (global as any).__openpostMonitorScheduler = true;
  setInterval(async () => {
    try {
      const due = await (prisma as any).monitor.findMany({ where: { enabled: true } });
      const now = Date.now();
      const svc = new MonitorService();
      for (const m of due) {
        const last = m.lastRunAt ? new Date(m.lastRunAt).getTime() : 0;
        if (now - last < m.intervalMinutes * 60000) continue;
        if (running.has(m.id)) continue;
        running.add(m.id);
        // Mark run start first so a crash doesn't spin tight loops.
        await (prisma as any).monitor.update({ where: { id: m.id }, data: { lastRunAt: new Date() } }).catch(() => {});
        svc.runMonitor(m.id).catch((e) => console.error(`[monitor] ${m.id} failed:`, e?.message)).finally(() => running.delete(m.id));
      }
    } catch (e: any) {
      console.error('[monitor] scheduler tick failed:', e?.message);
    }
  }, intervalMs);
}
