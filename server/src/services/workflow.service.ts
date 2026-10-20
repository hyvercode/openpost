import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { assertUrlSafe, createPinnedLookup } from './ssrf';
import { audit } from './audit.service';
import { encField, decField } from '../utils/secretCrypto';

export type WfNodeType = 'request' | 'delay' | 'condition' | 'extract' | 'setVariable';
export interface WfNode {
  id: string;
  type: WfNodeType;
  label: string;
  data: any;
  position?: { x: number; y: number };
}
export interface WfEdge { id: string; source: string; target: string; label?: string }

// decrypt-aware: secret-bearing columns (variables) are stored as enc:v1:...
// ciphertext; non-encrypted fields (nodes/edges) pass through unchanged.
function parseJson(s: string, fallback: any) { try { return JSON.parse(decField(s)); } catch { return fallback; } }

// Bound DAG size so one workflow cannot burn unbounded CPU/time on run.
const MAX_NODES = 100, MAX_EDGES = 300, MAX_VARS = 100;
function sanitizeDag(data: any) {
  const nodes = Array.isArray(data.nodes) ? data.nodes.slice(0, MAX_NODES) : [];
  const edges = Array.isArray(data.edges) ? data.edges.slice(0, MAX_EDGES) : [];
  const variables = Array.isArray(data.variables) ? data.variables.slice(0, MAX_VARS) : [];
  if (Array.isArray(data.nodes) && data.nodes.length > MAX_NODES) throw new Error(`Too many nodes (max ${MAX_NODES})`);
  if (Array.isArray(data.edges) && data.edges.length > MAX_EDGES) throw new Error(`Too many edges (max ${MAX_EDGES})`);
  if (Array.isArray(data.variables) && data.variables.length > MAX_VARS) throw new Error(`Too many variables (max ${MAX_VARS})`);
  return { nodes, edges, variables };
}

function interpolate(str: string, vars: Record<string,string>) {
  if (!str) return str;
  // {{var}} from environment / workflow variables / extracts
  let out = str.replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] ?? '');
  // {pathParam} single-brace (collection URLs like /item/{productCode}): only
  // replace when the var exists, otherwise keep literal so missing params stay visible.
  out = out.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return out;
}
function getByPath(obj: any, path: string) {
  if (!path) return obj;
  const clean = path.replace(/^\$\.?/, '');
  const parts = clean.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    const m = p.match(/^(\w+)\[(\d+)\]$/);
    if (m) cur = cur?.[m[1]]?.[Number(m[2])];
    else cur = cur?.[p];
    if (cur === undefined) break;
  }
  return cur;
}
function evalCondition(expr: string, ctx: Record<string,any>): boolean {
  // expr like "{{status}} == 200" — interpolate first, then eval the literal expression.
  const interpolated = interpolate(expr, ctx as any);
  // Allow only chars: alphanum, spaces, quotes, dots, brackets, operators
  if (!/^[\w\s"'`.\[\]!&|<>=()+-/*%,:]+$/.test(interpolated)) return false;
  try {
    // Only identifier-safe keys may become Function params. Env keys like
    // "base-url" or "core-url\n" are NOT valid identifiers and previously made
    // EVERY condition throw (silently evaluated as false). They remain usable
    // via {{var}} interpolation above; bare identifiers keep working.
    const safeEntries = Object.entries(ctx).filter(([k]) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k));
    const fn = new Function(...safeEntries.map(([k]) => k), `return (${interpolated});`);
    return !!fn(...safeEntries.map(([, v]) => v));
  } catch { return false; }
}

async function resolveNodeRequest(node: WfNode, vars: Record<string,string>): Promise<{ method:string; url:string; headers: any[]; params: any[]; body?: string }> {
  const cfg = node.data || {};
  // Auto-fill from collection API but keep editable: DB template merged with
  // user-edited overrides (edited fields win per-key). Headers union by key so
  // node edits never silently drop collection headers; same for query params.
  if (cfg.requestId && cfg.collectionId) {
    try {
      const col: any = await prisma.collection.findUnique({ where: { id: String(cfg.collectionId) } });
      if (col) {
        const reqs = JSON.parse(decField(col.requests || '[]'));
        const found = reqs.find((r:any)=> String(r.id)===String(cfg.requestId));
        if (found) {
          const dbHeaders = Array.isArray(found.headers) ? found.headers : [];
          const dbParams = Array.isArray(found.params) ? found.params : [];
          const dbBody = found.body?.content;
          const mergeKv = (db: any[], edited: any[]) => {
            const map = new Map<string, any>();
            for (const h of db || []) if (h?.key) map.set(String(h.key).toLowerCase(), { ...h });
            for (const h of edited || []) {
              if (!h?.key) continue;
              const k = String(h.key).toLowerCase();
              if (map.has(k)) map.set(k, { ...map.get(k), ...h });
              else map.set(k, { ...h });
            }
            return [...map.values()];
          };
          const hasEditedHeaders = Array.isArray(cfg.headers) && cfg.headers.some((h:any)=>h?.key);
          const hasEditedParams = Array.isArray(cfg.params) && cfg.params.some((p:any)=>p?.key);
          return {
            method: String(cfg.method || found.method || 'GET'),
            url: String(cfg.url ?? found.url ?? ''),
            headers: hasEditedHeaders ? mergeKv(dbHeaders, cfg.headers) : dbHeaders.length ? dbHeaders : (cfg.headers || []),
            params: hasEditedParams ? mergeKv(dbParams, cfg.params) : dbParams.length ? dbParams : (cfg.params || []),
            body: cfg.body !== undefined && cfg.body !== '' ? cfg.body : (dbBody ?? cfg.body),
          };
        }
      }
    } catch {}
  }
  return { method: String(cfg.method||'GET'), url: String(cfg.url||''), headers: cfg.headers||[], params: cfg.params||[], body: cfg.body };
}

async function execRequestNode(node: WfNode, vars: Record<string,string>, logs: any[]) {
  const resolved = await resolveNodeRequest(node, vars);
  const method = String(resolved.method || 'GET').toUpperCase();
  const rawUrl = interpolate(String(resolved.url || ''), vars);
  if (!rawUrl) throw new Error(`Node ${node.label}: missing url`);
  if (/\{\{[^}]+\}\}/.test(rawUrl)) throw new Error(`Node ${node.label}: unresolved variable in URL "${rawUrl}" — check Environment and workflow variables (e.g. {{baseUrl}})`);
  // Append enabled query params (collection params auto-mapped, interpolated)
  let urlWithParams = rawUrl;
  const qps: string[] = [];
  for (const p of (resolved.params || [])) {
    if (!p?.key || p.enabled === false) continue;
    qps.push(`${encodeURIComponent(interpolate(String(p.key), vars))}=${encodeURIComponent(interpolate(String(p.value ?? ''), vars))}`);
  }
  if (qps.length) urlWithParams += (urlWithParams.includes('?') ? '&' : '?') + qps.join('&');
  const urlStr = urlWithParams.startsWith('http') ? urlWithParams : `http://${urlWithParams}`;
  const { urlObj, targetIp } = await assertUrlSafe(urlStr);
  const headers: Record<string,string> = {};
  for (const h of (resolved.headers || [])) if (h?.key) headers[h.key] = interpolate(String(h.value ?? ''), vars);
  // NOTE: no Authorization/Cookie stripping here (unlike /api/proxy). Workflow
  // headers are explicit user configuration (e.g. "Authorization: Bearer {{token}}"
  // from a login extract) — sending them to the SSRF-checked target is the point.
  let data: any = resolved.body ? interpolate(String(resolved.body), vars) : undefined;
  let parsedObj = false;
  if (data) try { data = JSON.parse(data); parsedObj = typeof data === 'object'; } catch {}
  if (parsedObj && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }
  const lookup = createPinnedLookup(urlObj.hostname, targetIp);
  const t0 = Date.now();
  const res = await axios({
    method, url: urlObj.toString(), headers, data,
    timeout: 20000, maxRedirects: 0, maxBodyLength: 5*1024*1024, maxContentLength: 5*1024*1024,
    httpAgent: new http.Agent({ lookup } as any),
    httpsAgent: new https.Agent({ lookup } as any),
    validateStatus: () => true,
  });
  const duration = Date.now() - t0;
  const passed = res.status >= 200 && res.status < 400;
  // Include truncated response body/headers in logs so users can map
  // extract paths ($.data.token) for conditions and downstream nodes.
  let respPreview: string;
  try { respPreview = (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)); } catch { respPreview = String(res.data ?? ''); }
  logs.push({ nodeId: node.id, label: node.label, type: 'request', method, url: urlObj.toString(), status: res.status, duration, passed, responseBody: respPreview.slice(0, 4000), responseHeaders: res.headers });
  const cfg = node.data || {};
  if (cfg.extractPath && cfg.extractVar) {
    const val = getByPath(res.data, String(cfg.extractPath));
    if (val !== undefined) vars[String(cfg.extractVar)] = String(val);
  }
  if (cfg.extracts && typeof cfg.extracts === 'object') {
    for (const [k,v] of Object.entries(cfg.extracts as Record<string,string>)) {
      const val = getByPath(res.data, String(v));
      if (val !== undefined) vars[k] = String(val);
    }
  }
  return { status: res.status, data: res.data, headers: res.headers, duration, passed };
}

export class WorkflowService {
  async listByWorkspace(workspaceId: string) {
    const rows = await (prisma as any).workflow.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
    return rows.map((r:any)=>({...r, nodes: parseJson(r.nodes,'[]'), edges: parseJson(r.edges,'[]'), variables: parseJson(r.variables,'[]')}));
  }
  async getById(id: string) {
    const r = await (prisma as any).workflow.findUnique({ where: { id } });
    if (!r) return null;
    return { ...r, nodes: parseJson(r.nodes,'[]'), edges: parseJson(r.edges,'[]'), variables: parseJson(r.variables,'[]') };
  }
  async create(data: any, actorUserId?: string) {
    if (!data.workspaceId || !data.name?.trim()) throw new Error('workspaceId and name required');
    const ws = await prisma.workspace.findUnique({ where: { id: data.workspaceId } });
    if (!ws) throw new Error('Workspace not found');
    const isWebhook = data.trigger === 'webhook';
    const dag = sanitizeDag(data);
    const row = await (prisma as any).workflow.create({ data: {
      id: data.id || uuidv4(),
      workspaceId: data.workspaceId,
      name: String(data.name).trim().slice(0,120),
      description: data.description ? String(data.description).slice(0,1000) : null,
      enabled: data.enabled !== false,
      trigger: ['manual','webhook','schedule'].includes(data.trigger) ? data.trigger : 'manual',
      scheduleCron: data.scheduleCron || null,
      intervalMinutes: data.intervalMinutes ? Math.max(5, Math.min(1440, Number(data.intervalMinutes))) : null,
      webhookToken: isWebhook ? uuidv4().replace(/-/g,'') : null,
      environmentId: data.environmentId ? String(data.environmentId) : null,
      nodes: JSON.stringify(dag.nodes),
      edges: JSON.stringify(dag.edges),
      variables: encField(JSON.stringify(dag.variables)),
    }});
    await audit('workflow.create', { workspaceId: data.workspaceId, userId: actorUserId, entityType:'workflow', entityId: row.id, detail: row.name });
    return { ...row, nodes: parseJson(row.nodes,'[]'), edges: parseJson(row.edges,'[]'), variables: parseJson(row.variables,'[]') };
  }
  async update(id: string, data: any, actorUserId?: string) {
    const existing = await (prisma as any).workflow.findUnique({ where: { id } });
    if (!existing) throw new Error('Workflow not found');
    const upd:any = {};
    if (data.name !== undefined) upd.name = String(data.name).trim().slice(0,120);
    if (data.description !== undefined) upd.description = data.description ? String(data.description).slice(0,1000) : null;
    if (data.enabled !== undefined) upd.enabled = !!data.enabled;
    if (data.trigger !== undefined) upd.trigger = ['manual','webhook','schedule'].includes(data.trigger) ? data.trigger : 'manual';
    if (data.scheduleCron !== undefined) upd.scheduleCron = data.scheduleCron || null;
    if (data.intervalMinutes !== undefined) upd.intervalMinutes = data.intervalMinutes ? Math.max(5, Math.min(1440, Number(data.intervalMinutes))) : null;
    if (data.nodes !== undefined || data.edges !== undefined || data.variables !== undefined) {
      const dag = sanitizeDag({ nodes: data.nodes ?? parseJson(existing.nodes, []), edges: data.edges ?? parseJson(existing.edges, []), variables: data.variables ?? parseJson(existing.variables, []) });
      upd.nodes = JSON.stringify(dag.nodes);
      upd.edges = JSON.stringify(dag.edges);
      upd.variables = encField(JSON.stringify(dag.variables));
    }
    if (data.environmentId !== undefined) upd.environmentId = data.environmentId ? String(data.environmentId) : null;
    if (data.trigger === 'webhook' && !existing.webhookToken) upd.webhookToken = uuidv4().replace(/-/g,'');
    const row = await (prisma as any).workflow.update({ where:{id}, data: upd });
    await audit('workflow.update', { workspaceId: row.workspaceId, userId: actorUserId, entityType:'workflow', entityId: id });
    return { ...row, nodes: parseJson(row.nodes,'[]'), edges: parseJson(row.edges,'[]'), variables: parseJson(row.variables,'[]') };
  }
  async remove(id: string, actorUserId?: string) {
    const ex = await (prisma as any).workflow.findUnique({ where:{id} });
    await (prisma as any).workflowRun.deleteMany({ where:{ workflowId: id } });
    await (prisma as any).workflow.delete({ where:{id} });
    await audit('workflow.delete', { workspaceId: ex?.workspaceId, userId: actorUserId, entityType:'workflow', entityId:id });
    return { success:true };
  }
  async getRuns(workflowId: string, limit=20) {
    const rows = await (prisma as any).workflowRun.findMany({ where:{ workflowId }, orderBy:{ createdAt:'desc' }, take: Math.min(limit,100) });
    // logs/detail are encrypted at rest (step logs embed response bodies);
    // clients have always received them as JSON strings — keep that contract.
    return rows.map((r: any) => ({
      ...r,
      logs: r.logs ? decField(r.logs) : r.logs,
      detail: r.detail ? decField(r.detail) : r.detail,
    }));
  }
  async run(workflowId: string, trigger='manual', triggerVars: Record<string,string>={}): Promise<any> {
    const wf = await (prisma as any).workflow.findUnique({ where:{id: workflowId} });
    if (!wf) throw new Error('Workflow not found');
    const nodes: WfNode[] = parseJson(wf.nodes,'[]');
    const edges: WfEdge[] = parseJson(wf.edges,'[]');
    const varsList: any[] = parseJson(wf.variables,'[]');
    const vars: Record<string,string> = {};
    for (const v of varsList) if (v?.key) vars[v.key]= String(v.value??'');
    // Workflow environment is the ONLY env source (plus workflow vars + trigger).
    // No cross-env fallback: several envs may define the same key (baseUrl) with
    // different values — merging them picks the wrong host nondeterministically.
    // Without a selected env, {{vars}} stay empty and the unresolved-variable
    // error tells the user exactly which env to select.
    const selectedEnvId = (wf as any).environmentId ? String((wf as any).environmentId) : null;
    if (selectedEnvId) {
      try {
        const env: any = await prisma.environment.findUnique({ where: { id: selectedEnvId } });
        if (env && String(env.workspaceId)===String(wf.workspaceId) && !env.deletedAt) {
          const evs = JSON.parse(decField(env.variables || '[]'));
          for (const v of evs) if (v?.key && String(v.key).trim() && v.enabled !== false) vars[String(v.key).trim()] = String(v.value ?? '');
        }
      } catch {}
    }
    Object.assign(vars, triggerVars);
    // Check cycles
    if (this.hasCycle(nodes, edges)) throw new Error('Workflow has a cycle');
    const runId = uuidv4();
    const run = await (prisma as any).workflowRun.create({ data:{ id: runId, workflowId, workspaceId: wf.workspaceId, status:'running', trigger, startedAt: new Date(), logs: JSON.stringify([]) }});
    const t0 = Date.now();
    const stepLogs: any[] = [];
    let status: string = 'success';
    let detail = '';
    try {
      const result = await this.executeDAG(nodes, edges, vars, stepLogs);
      if (!result.success) { status='failed'; detail = result.detail || 'One or more steps failed'; }
    } catch (e:any) {
      status='failed'; detail = String(e?.message || e).slice(0,2000);
      stepLogs.push({ error: detail });
    }
    const durationMs = Date.now() - t0;
    await (prisma as any).workflowRun.update({ where:{id: runId}, data:{ status, finishedAt: new Date(), durationMs, logs: encField(JSON.stringify(stepLogs)), detail: encField(detail.slice(0,2000)) }});
    await audit('workflow.run', { workspaceId: wf.workspaceId, entityType:'workflow', entityId: workflowId, detail: `${trigger} ${status}` });
    return { id: runId, status, durationMs, logs: stepLogs, detail };
  }

  private hasCycle(nodes: WfNode[], edges: WfEdge[]): boolean {
    const adj = new Map<string,string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) adj.get(e.source)?.push(e.target);
    const visiting = new Set<string>(); const visited = new Set<string>();
    const dfs = (u:string): boolean => {
      if (visiting.has(u)) return true;
      if (visited.has(u)) return false;
      visiting.add(u);
      for (const v of adj.get(u) || []) if (dfs(v)) return true;
      visiting.delete(u); visited.add(u); return false;
    };
    for (const n of nodes) if (dfs(n.id)) return true;
    return false;
  }

  private async executeDAG(nodes: WfNode[], edges: WfEdge[], vars: Record<string,string>, stepLogs: any[]): Promise<{success:boolean; detail?:string}> {
    if (nodes.length===0) return { success:true };
    const indeg = new Map<string,number>(); const out = new Map<string,WfEdge[]>();
    for (const n of nodes) { indeg.set(n.id,0); out.set(n.id,[]); }
    for (const e of edges) { indeg.set(e.target, (indeg.get(e.target)||0)+1); out.get(e.source)?.push(e); }
    const nodeMap = new Map(nodes.map(n=>[n.id,n]));
    // Kahn — level by level, parallel within same level
    const queue: string[] = [...indeg.entries()].filter(([,d])=>d===0).map(([k])=>k);
    if (queue.length===0) throw new Error('No starting node (cycle or missing root)');
    const executed = new Set<string>();
    let lastResponse: any = null;
    let failed = false; let failDetail='';
    // Process level by level: all ready nodes in parallel
    while (queue.length) {
      const level = [...queue]; queue.length=0;
      const promises = level.map(async (nid)=>{
        if (executed.has(nid)) return;
        const node = nodeMap.get(nid)!;
        // Condition nodes may have incoming edge label; we check during traversal.
        // For now, each level node runs if its predecessor condition allows — handled by skipping enqueuing.
        try {
          if (node.type==='delay') {
            const ms = Math.max(0, Math.min(60000, Number(node.data?.ms ?? node.data?.delayMs ?? 0)));
            await new Promise(r=>setTimeout(r, ms));
            stepLogs.push({ nodeId:nid, label: node.label, type:'delay', ms, passed:true });
          } else if (node.type==='setVariable') {
            const k = String(node.data?.key||'').trim(); const v = interpolate(String(node.data?.value||''), vars);
            if (k) vars[k]=v;
            stepLogs.push({ nodeId:nid, label: node.label, type:'setVariable', key:k, value:v, passed:true });
          } else if (node.type==='condition') {
            const expr = String(node.data?.expression || node.data?.condition || '');
            const ctx = { ...vars, status: lastResponse?.status, data: lastResponse?.data };
            const result = evalCondition(expr, ctx);
            stepLogs.push({ nodeId:nid, label: node.label, type:'condition', expression:expr, result, passed:true });
            // Store result for edge filtering
            (node as any)._condResult = result;
          } else if (node.type==='extract') {
            const path = String(node.data?.path || node.data?.extractPath || '');
            const varName = String(node.data?.varName || node.data?.extractVar || '');
            const val = getByPath(lastResponse?.data, path);
            if (varName && val!==undefined) vars[varName]=String(val);
            stepLogs.push({ nodeId:nid, label: node.label, type:'extract', path, varName, value: val, passed:true });
          } else if (node.type==='request') {
            const res = await execRequestNode(node, vars, stepLogs);
            lastResponse = res;
            vars['lastStatus'] = String(res.status);
            // HTTP 4xx/5xx fails the run (testing semantics) unless the node
            // explicitly opts out via continueOnError. DAG continues regardless.
            if (!res.passed && !node.data?.continueOnError) {
              failed = true;
              if (!failDetail) failDetail = `${node.label}: HTTP ${res.status}`;
            }
          } else {
            stepLogs.push({ nodeId:nid, label: node.label, type: node.type, passed:true });
          }
        } catch (e:any) {
          const msg = String(e?.message||e).slice(0,500);
          stepLogs.push({ nodeId:nid, label: node.label, type: node.type, passed:false, error: msg });
          if (!node.data?.continueOnError) {
            failed=true; failDetail = `${node.label}: ${e?.message||e}`;
          }
        }
        executed.add(nid);
      });
      await Promise.all(promises);
      // Enqueue next level respecting condition branches
      for (const nid of level) {
        const node = nodeMap.get(nid)!;
        const isCondition = node.type==='condition';
        const condResult = (node as any)._condResult;
        for (const e of out.get(nid) || []) {
          // If source is condition, only follow branch matching label
          if (isCondition) {
            const lbl = String(e.label||'').toLowerCase();
            const wantTrue = lbl==='true' || lbl==='success' || lbl==='yes';
            const wantFalse = lbl==='false' || lbl==='failure' || lbl==='no';
            if (wantTrue && condResult!==true) continue;
            if (wantFalse && condResult!==false) continue;
            if (!wantTrue && !wantFalse && edges.filter(x=>x.source===nid).length>1) {
              // No label but branching — skip mismatch? default allow
            }
          }
          const d = (indeg.get(e.target)||1)-1;
          indeg.set(e.target, d);
          if (d===0) queue.push(e.target);
        }
      }
      if (failed && level.some(id=> nodeMap.get(id)?.data?.stopOnError !== false && nodeMap.get(id)?.type==='request')) {
        // optional early exit on failure — continue to respect DAG completeness but mark failed
      }
    }
    if (executed.size !== nodes.length) {
      // Unreachable nodes = filtered by condition branch — not failure
    }
    return { success: !failed, detail: failDetail };
  }
}

// ---- Schedule-trigger scheduler (mirrors monitor.service pattern) ----
// Runs workflows with trigger='schedule' every intervalMinutes (>=5).
// Overlap-guarded per workflow; uses lastRunAt-equivalent = latest WorkflowRun.
const wfRunning = new Set<string>();

export function startWorkflowScheduler(intervalMs = 60000): void {
  if ((global as any).__openpostWorkflowScheduler) return;
  (global as any).__openpostWorkflowScheduler = true;
  setInterval(async () => {
    try {
      const due = await (prisma as any).workflow.findMany({ where: { enabled: true, trigger: 'schedule' } });
      const now = Date.now();
      const svc = new WorkflowService();
      for (const w of due) {
        const interval = Math.max(5, Math.min(1440, Number(w.intervalMinutes) || 60)) * 60000;
        const last: any = await (prisma as any).workflowRun.findFirst({ where: { workflowId: w.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }).catch(() => null);
        const lastTs = last?.createdAt ? new Date(last.createdAt).getTime() : 0;
        if (now - lastTs < interval) continue;
        if (wfRunning.has(w.id)) continue;
        wfRunning.add(w.id);
        svc.run(w.id, 'schedule', {}).catch((e) => console.error(`[workflow-scheduler] ${w.id} failed:`, e?.message)).finally(() => wfRunning.delete(w.id));
      }
    } catch (e: any) {
      console.error('[workflow-scheduler] tick failed:', e?.message);
    }
  }, intervalMs);
}
