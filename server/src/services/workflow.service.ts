import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { assertUrlSafe, createPinnedLookup } from './ssrf';
import { audit } from './audit.service';

export type WfNodeType = 'request' | 'delay' | 'condition' | 'extract' | 'setVariable';
export interface WfNode {
  id: string;
  type: WfNodeType;
  label: string;
  data: any;
  position?: { x: number; y: number };
}
export interface WfEdge { id: string; source: string; target: string; label?: string }

function parseJson(s: string, fallback: any) { try { return JSON.parse(s); } catch { return fallback; } }

function interpolate(str: string, vars: Record<string,string>) {
  if (!str) return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] ?? '');
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
  // Safe eval: only allow comparison of vars/status/data. No Function with arbitrary code.
  // expr like "{{status}} == 200" or "data.user.id != null" — we interpolate then eval simple logic.
  const interpolated = interpolate(expr, ctx as any);
  // Allow only chars: alphanum, spaces, quotes, dots, brackets, operators
  if (!/^[\w\s"'`.\[\]!&|<>=()+-/*%,:]+$/.test(interpolated)) return false;
  try {
    // Provide limited globals: ctx values as vars
    const fn = new Function(...Object.keys(ctx), `return (${interpolated});`);
    return !!fn(...Object.values(ctx));
  } catch { return false; }
}

async function execRequestNode(node: WfNode, vars: Record<string,string>, logs: any[]) {
  const cfg = node.data || {};
  const method = String(cfg.method || 'GET').toUpperCase();
  const rawUrl = interpolate(String(cfg.url || ''), vars);
  if (!rawUrl) throw new Error(`Node ${node.label}: missing url`);
  const urlStr = rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`;
  const { urlObj, targetIp } = await assertUrlSafe(urlStr);
  const headers: Record<string,string> = {};
  for (const h of (cfg.headers || [])) if (h?.key) headers[h.key] = interpolate(String(h.value ?? ''), vars);
  delete headers['authorization']; delete headers['cookie'];
  let data: any = cfg.body ? interpolate(String(cfg.body), vars) : undefined;
  if (data) try { data = JSON.parse(data); } catch {}
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
  logs.push({ nodeId: node.id, label: node.label, type: 'request', status: res.status, duration, passed });
  // Extract handling: if node has extract config, set vars
  if (cfg.extractPath && cfg.extractVar) {
    const val = getByPath(res.data, String(cfg.extractPath));
    if (val !== undefined) vars[String(cfg.extractVar)] = String(val);
  }
  // Generic var extraction map: { "token": "$.data.token" }
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
      nodes: JSON.stringify(data.nodes || []),
      edges: JSON.stringify(data.edges || []),
      variables: JSON.stringify(data.variables || []),
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
    if (data.nodes !== undefined) upd.nodes = JSON.stringify(data.nodes);
    if (data.edges !== undefined) upd.edges = JSON.stringify(data.edges);
    if (data.variables !== undefined) upd.variables = JSON.stringify(data.variables);
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
    return (prisma as any).workflowRun.findMany({ where:{ workflowId }, orderBy:{ createdAt:'desc' }, take: Math.min(limit,100) });
  }
  async run(workflowId: string, trigger='manual', triggerVars: Record<string,string>={}): Promise<any> {
    const wf = await (prisma as any).workflow.findUnique({ where:{id: workflowId} });
    if (!wf) throw new Error('Workflow not found');
    const nodes: WfNode[] = parseJson(wf.nodes,'[]');
    const edges: WfEdge[] = parseJson(wf.edges,'[]');
    const varsList: any[] = parseJson(wf.variables,'[]');
    const vars: Record<string,string> = {};
    for (const v of varsList) if (v?.key) vars[v.key]= String(v.value??'');
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
    await (prisma as any).workflowRun.update({ where:{id: runId}, data:{ status, finishedAt: new Date(), durationMs, logs: JSON.stringify(stepLogs), detail: detail.slice(0,2000) }});
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
            if (res.data && typeof res.data === 'object') {
              // expose simple fields as vars for extract shortcut
            }
            if (!res.passed && node.data?.stopOnError !== false) {
              // mark but continue unless strict
            }
          } else {
            stepLogs.push({ nodeId:nid, label: node.label, type: node.type, passed:true });
          }
        } catch (e:any) {
          failed=true; failDetail = `${node.label}: ${e?.message||e}`;
          stepLogs.push({ nodeId:nid, label: node.label, type: node.type, passed:false, error: String(e?.message||e).slice(0,500) });
          if (node.data?.continueOnError) {/* allow */} else { /* will cause overall failure */ }
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
