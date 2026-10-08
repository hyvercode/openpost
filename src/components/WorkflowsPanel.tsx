import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../lib/api';
import { Workflow, WorkflowNode, WorkflowEdge } from '../types';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { GitBranch, Plus, Trash2, Play, Copy, X, Save, Clock, Webhook, Settings2, ChevronDown, ChevronRight, ExternalLink, Pause, Check, AlertCircle, Link2 } from 'lucide-react';

const NODE_COLOR: Record<string,string> = {
  request: 'border-[var(--primary)] bg-[var(--primary)]/10',
  condition: 'border-amber-500 bg-amber-500/10',
  delay: 'border-sky-500 bg-sky-500/10',
  extract: 'border-emerald-500 bg-emerald-500/10',
  setVariable: 'border-violet-500 bg-violet-500/10',
};
const NODE_LABEL: Record<string,string> = { request:'Request', condition:'Condition', delay:'Delay', extract:'Extract', setVariable:'Set Var' };

function WorkflowCanvas({ nodes, edges, selectedId, onSelect, onMove, onConnect }: {
  nodes: WorkflowNode[]; edges: WorkflowEdge[]; selectedId: string | null;
  onSelect: (id:string)=>void; onMove: (id:string, pos:{x:number,y:number})=>void; onConnect: (a:string,b:string)=>void;
}) {
  const [drag, setDrag] = useState<{id:string,dx:number,dy:number}|null>(null);
  const [connectFrom, setConnectFrom] = useState<string|null>(null);
  const handleDown = (e: React.MouseEvent, n: WorkflowNode) => {
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    setDrag({ id: n.id, dx: e.clientX - rect.left - (n.position?.x||0), dy: e.clientY - rect.top - (n.position?.y||0) });
  };
  useEffect(()=>{
    if(!drag) return;
    const mv=(e:MouseEvent)=>{
      const canvas=document.getElementById('wf-canvas');
      if(!canvas) return;
      const r=canvas.getBoundingClientRect();
      onMove(drag.id, { x: Math.max(0, e.clientX - r.left - drag.dx), y: Math.max(0, e.clientY - r.top - drag.dy) });
    };
    const up=()=>setDrag(null);
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
    return()=>{ window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up); };
  },[drag]);
  return (
    <div id="wf-canvas" className="relative w-full h-[520px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded overflow-auto select-none"
      style={{ backgroundImage:'radial-gradient(circle at 1px 1px, var(--border-subtle) 1px, transparent 0)', backgroundSize:'20px 20px' }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width:2000, height:1000 }}>
        {edges.map(e=>{
          const s=nodes.find(n=>n.id===e.source); const t=nodes.find(n=>n.id===e.target);
          if(!s||!t) return null;
          const x1=(s.position?.x||0)+110, y1=(s.position?.y||0)+36, x2=(t.position?.x||0)+110, y2=(t.position?.y||0)+8;
          const midY=(y1+y2)/2;
          const isTrue=(e.label||'').toLowerCase()==='true', isFalse=(e.label||'').toLowerCase()==='false';
          const col=isTrue?'#22c55e':isFalse?'#ef4444':'var(--border-strong)';
          return <g key={e.id}>
            <path d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`} fill="none" stroke={col} strokeWidth={2} markerEnd="url(#arr)" />
            {e.label && <text x={(x1+x2)/2} y={midY-4} fontSize={10} fill={col} textAnchor="middle" fontWeight={700}>{e.label}</text>}
          </g>;
        })}
        <defs><marker id="arr" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" /></marker></defs>
      </svg>
      {nodes.map(n=>(
        <div key={n.id}
          onMouseDown={(e)=>handleDown(e,n)}
          onClick={()=> {
            if(connectFrom && connectFrom!==n.id){ onConnect(connectFrom, n.id); setConnectFrom(null); }
            else onSelect(n.id);
          }}
          className={cn("absolute w-[220px] rounded border-2 shadow-sm cursor-move flex flex-col overflow-hidden", NODE_COLOR[n.type]||'border-[var(--border-subtle)] bg-[var(--bg-panel)]', selectedId===n.id && "ring-2 ring-[var(--primary)]")}
          style={{ left: n.position?.x||0, top: n.position?.y||0 }}>
          <div className="px-2.5 py-1.5 flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 opacity-60" />{NODE_LABEL[n.type]||n.type}</span>
            <span className="opacity-60">{connectFrom===n.id?'connecting…':''}</span>
          </div>
          <div className="px-2.5 pb-2 text-xs font-semibold truncate text-[var(--text-primary)]">{n.label}</div>
          <div className="px-2 pb-1.5 flex gap-1">
            <button onClick={(e)=>{e.stopPropagation(); setConnectFrom(connectFrom===n.id?null:n.id);}} className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold", connectFrom===n.id?"bg-[var(--primary)] text-white":"bg-[var(--bg-panel)]")} title="Connect to another node"><Link2 className="w-3 h-3 inline mr-1" />{connectFrom===n.id?'Cancel':'Connect'}</button>
          </div>
        </div>
      ))}
      {connectFrom && <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">Click target node to connect — Esc to cancel</div>}
    </div>
  );
}

export const WorkflowsPanel: React.FC = () => {
  const { currentWorkspace, addToast } = useStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Workflow|null>(null);
  const [form, setForm] = useState({ name:'', description:'', trigger:'manual' as Workflow['trigger'], intervalMinutes:60 });
  const [builderWf, setBuilderWf] = useState<Workflow|null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [expandedRun, setExpandedRun] = useState<string|null>(null);
  const [runs, setRuns] = useState<Record<string,any[]>>({});

  const load = useCallback(async()=>{
    if(!currentWorkspace) return;
    setLoading(true);
    try{ setWorkflows(await apiService.getWorkflows(currentWorkspace.id)); }catch{ addToast('Failed to load workflows','error'); }finally{ setLoading(false); }
  },[currentWorkspace, addToast]);
  useEffect(()=>{ load(); },[load]);

  const handleCreate = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!currentWorkspace || !form.name.trim()){ addToast('Name required','error'); return; }
    try{
      await apiService.createWorkflow(currentWorkspace.id, { name: form.name.trim(), description: form.description.trim()||undefined, trigger: form.trigger, intervalMinutes: form.trigger==='schedule'?Number(form.intervalMinutes):undefined, nodes:[], edges:[], variables:[] });
      setShowCreate(false); setForm({ name:'', description:'', trigger:'manual', intervalMinutes:60 }); addToast('Workflow created','success'); load();
    }catch(err:any){ addToast(err.response?.data?.error||'Create failed','error'); }
  };
  const handleUpdateMeta = async()=>{
    if(!editing) return;
    try{
      await apiService.updateWorkflow(editing.id, { name: editing.name, description: editing.description||'', trigger: editing.trigger, intervalMinutes: editing.intervalMinutes, enabled: editing.enabled });
      addToast('Workflow updated','success'); setEditing(null); load();
    }catch(err:any){ addToast(err.response?.data?.error||'Update failed','error'); }
  };
  const remove = async(w: Workflow)=>{
    if(!window.confirm(`Delete workflow "${w.name}"?`)) return;
    try{ await apiService.deleteWorkflow(w.id); addToast('Workflow deleted','success'); load(); }catch{ addToast('Delete failed','error'); }
  };
  const openBuilder = (w: Workflow)=>{
    setBuilderWf(w); setNodes(w.nodes||[]); setEdges(w.edges||[]); setVariables(w.variables||[]); setSelectedId(null);
  };
  const saveBuilder = async()=>{
    if(!builderWf) return;
    try{
      await apiService.updateWorkflow(builderWf.id, { nodes, edges, variables });
      addToast('Workflow saved','success'); load();
      const updated = await apiService.getWorkflow(builderWf.id);
      setBuilderWf(updated);
    }catch(err:any){ addToast(err.response?.data?.error||'Save failed','error'); }
  };
  const addNode = (type: WorkflowNode['type'])=>{
    const base: Record<string,any> = {
      request: { method:'GET', url:'https://example.com/api', headers:[], body:'', extractVar:'', extractPath:'' },
      delay: { ms: 1000 },
      condition: { expression: '{{lastStatus}} == 200' },
      extract: { path: '$.data.token', varName: 'token' },
      setVariable: { key:'myVar', value:'hello' },
    };
    const id='n_'+uuidv4().slice(0,8);
    const idx=nodes.length;
    setNodes([...nodes, { id, type, label: `${NODE_LABEL[type]} ${idx+1}`, data: base[type]||{}, position:{ x: 40 + (idx%5)*240, y: 40 + Math.floor(idx/5)*120 } }]);
  };
  const updateNode = (id:string, patch: Partial<WorkflowNode>)=> setNodes(nodes.map(n=>n.id===id?{...n,...patch}:n));
  const updateNodeData = (id:string, dataPatch: Record<string,any>)=> setNodes(nodes.map(n=>n.id===id?{...n, data:{...n.data, ...dataPatch}}:n));
  const deleteNode = (id:string)=>{ setNodes(nodes.filter(n=>n.id!==id)); setEdges(edges.filter(e=>e.source!==id&&e.target!==id)); if(selectedId===id) setSelectedId(null); };
  const runNow = async(w: Workflow)=>{
    try{ addToast(`Running "${w.name}"…`,'info'); const r=await apiService.runWorkflow(w.id); addToast(`Workflow ${r.status}: ${r.durationMs}ms` , r.status==='success'?'success':'error'); load(); if(builderWf?.id===w.id){ const rr=await apiService.getWorkflowRuns(w.id); setRuns(prev=>({...prev,[w.id]:rr})); } }catch(err:any){ addToast(err.response?.data?.error||'Run failed','error'); }
  };
  const loadRuns = async(id:string)=>{
    try{ const r=await apiService.getWorkflowRuns(id); setRuns(prev=>({...prev,[id]:r})); }catch{}
  };
  const toggleRuns = (w: Workflow)=>{
    if(expandedRun===w.id) setExpandedRun(null); else { setExpandedRun(w.id); loadRuns(w.id); }
  };
  const duplicate = async(w: Workflow)=>{
    if(!currentWorkspace) return;
    try{ await apiService.createWorkflow(currentWorkspace.id, { name: w.name+' (copy)', description: w.description||undefined, trigger: w.trigger, nodes: w.nodes, edges: w.edges, variables: w.variables }); addToast('Workflow duplicated','success'); load(); }catch(err:any){ addToast(err.response?.data?.error||'Duplicate failed','error'); }
  };

  const selected = nodes.find(n=>n.id===selectedId) || null;

  if(builderWf){
    const webhookUrl = builderWf.webhookToken ? `${window.location.origin}/api/workflows/webhook/${builderWf.webhookToken}` : null;
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={()=>{ setBuilderWf(null); load(); }} className="text-xs font-bold border border-[var(--border-subtle)] rounded px-2 py-1 hover:bg-[var(--bg-hover)]">← Back</button>
            <span className="font-bold text-sm truncate">{builderWf.name}</span>
            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">Full DAG — drag nodes, Connect to add edges (parallel = multi out, branch = condition true/false)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={saveBuilder} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded text-xs font-bold"><Save className="w-3.5 h-3.5"/>Save</button>
            <button onClick={()=>runNow(builderWf)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold"><Play className="w-3.5 h-3.5"/>Run</button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex-wrap">
          <span className="text-[11px] font-bold uppercase text-[var(--text-secondary)] mr-1">Add node:</span>
          {(['request','condition','extract','setVariable','delay'] as const).map(t=>(
            <button key={t} onClick={()=>addNode(t)} className="px-2.5 py-1 rounded border text-xs font-bold bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]">{NODE_LABEL[t]}</button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-[var(--text-secondary)]">{nodes.length} nodes · {edges.length} edges {variables.length?`· ${variables.length} vars`:''}</span>
          </div>
        </div>
        {webhookUrl && <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs flex-wrap">
          <Webhook className="w-3.5 h-3.5 text-amber-600"/><span className="font-bold">Webhook:</span>
          <code className="bg-white border rounded px-1.5 py-0.5 break-all">{webhookUrl}</code>
          <button onClick={()=>{navigator.clipboard.writeText(webhookUrl); addToast('Webhook URL copied','success');}} className="px-2 py-1 bg-white border rounded text-xs font-bold flex items-center gap-1"><Copy className="w-3 h-3"/>Copy</button>
          <a href={webhookUrl} target="_blank" rel="noreferrer" className="text-amber-700 underline flex items-center gap-1">POST example<ExternalLink className="w-3 h-3"/></a>
        </div>}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 p-3 overflow-auto bg-[var(--bg-base)]">
            <WorkflowCanvas nodes={nodes} edges={edges} selectedId={selectedId} onSelect={setSelectedId} onMove={(id,pos)=>updateNode(id,{position:pos})} onConnect={(a,b)=>{
              if(a===b) return;
              if(edges.some(e=>e.source===a&&e.target===b)){ addToast('Edge already exists','warning'); return; }
              // Prevent cycle quick check
              const test=[...edges,{id:'tmp',source:a,target:b}];
              // naive cycle detection handled server-side as well
              const fromNode=nodes.find(n=>n.id===a);
              let label: string|undefined;
              if(fromNode?.type==='condition'){
                // Prompt for branch
                const ans=window.prompt('Condition branch label (true / false or empty):','true');
                if(ans!==null) label=ans.trim()||undefined;
              }
              setEdges([...edges, { id: uuidv4().slice(0,8), source:a, target:b, label }]);
            }} />
            {edges.length>0 && <div className="mt-3 border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] p-2">
              <div className="text-xs font-bold mb-1.5">Edges (DAG)</div>
              <div className="space-y-1">
                {edges.map(e=>{
                  const s=nodes.find(n=>n.id===e.source)?.label||e.source, t=nodes.find(n=>n.id===e.target)?.label||e.target;
                  return <div key={e.id} className="flex items-center gap-2 text-xs bg-[var(--bg-panel)] border rounded px-2 py-1">
                    <span className="truncate">{s} → {t}</span>
                    <input value={e.label||''} onChange={ev=>setEdges(edges.map(x=>x.id===e.id?{...x,label:ev.target.value||undefined}:x))} placeholder="label (true/false for condition)" className="ml-auto w-32 bg-[var(--bg-surface)] border rounded px-1.5 py-0.5 text-xs" />
                    <button onClick={()=>setEdges(edges.filter(x=>x.id!==e.id))} className="p-1 hover:text-[var(--danger)]"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>;
                })}
              </div>
            </div>}
          </div>
          <div className="w-[340px] border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-y-auto p-3 flex flex-col gap-3 shrink-0">
            <div className="border border-[var(--border-subtle)] rounded p-2.5 bg-[var(--bg-panel)]">
              <div className="text-xs font-bold mb-2 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5"/>Workflow variables (for {"{{var}}"})</div>
              {variables.map((v:any,i:number)=>(
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <input value={v.key} onChange={e=>{ const nv=[...variables]; nv[i]={...nv[i],key:e.target.value}; setVariables(nv); }} placeholder="key" className="w-24 bg-[var(--bg-surface)] border rounded px-2 py-1 text-xs" />
                  <input value={v.value} onChange={e=>{ const nv=[...variables]; nv[i]={...nv[i],value:e.target.value}; setVariables(nv); }} placeholder="value" className="flex-1 bg-[var(--bg-surface)] border rounded px-2 py-1 text-xs" />
                  <button onClick={()=>setVariables(variables.filter((_,j)=>j!==i))} className="p-1.5 hover:text-[var(--danger)]"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
              <button onClick={()=>setVariables([...variables,{id:uuidv4(),key:'',value:'',enabled:true}])} className="text-xs font-bold text-[var(--primary)] flex items-center gap-1"><Plus className="w-3.5 h-3.5"/>Add variable</button>
            </div>
            {!selected ? (
              <div className="text-xs text-[var(--text-secondary)] border border-dashed rounded p-4 text-center">Select a node to edit. Drag to reposition. Use Connect + click target to create edges. Parallel = one node → many. Branch = condition → true / false edges.</div>
            ) : (
              <div className="border border-[var(--border-subtle)] rounded p-3 bg-[var(--bg-panel)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase">{selected.type}</span>
                  <button onClick={()=>deleteNode(selected.id)} className="text-xs text-[var(--danger)] flex items-center gap-1"><Trash2 className="w-3.5 h-3.5"/>Delete</button>
                </div>
                <label className="text-xs text-[var(--text-secondary)]">Label<input value={selected.label} onChange={e=>updateNode(selected.id!,{label:e.target.value})} className="mt-1 w-full bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /></label>
                {selected.type==='request' && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      <select value={selected.data.method||'GET'} onChange={e=>updateNodeData(selected.id!,{method:e.target.value})} className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs font-bold">
                        {['GET','POST','PUT','PATCH','DELETE','HEAD'].map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                      <input value={selected.data.url||''} onChange={e=>updateNodeData(selected.id!,{url:e.target.value})} placeholder="https://api.example.com/…" className="col-span-2 bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" />
                    </div>
                    <label className="text-xs text-[var(--text-secondary)]">Body (supports {"{{var}}"})<textarea value={selected.data.body||''} onChange={e=>updateNodeData(selected.id!,{body:e.target.value})} rows={3} className="mt-1 w-full bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs font-mono" placeholder='{"key":"{{var}}"}' /></label>
                    <label className="text-xs text-[var(--text-secondary)]">Extract (optional)<div className="grid grid-cols-2 gap-1.5 mt-1"><input value={selected.data.extractVar||''} onChange={e=>updateNodeData(selected.id!,{extractVar:e.target.value})} placeholder="varName" className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /><input value={selected.data.extractPath||''} onChange={e=>updateNodeData(selected.id!,{extractPath:e.target.value})} placeholder="$.data.token" className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /></div></label>
                  </div>
                )}
                {selected.type==='delay' && <label className="text-xs text-[var(--text-secondary)] mt-2 block">Delay ms<input type="number" value={selected.data.ms??1000} onChange={e=>updateNodeData(selected.id!,{ms:Number(e.target.value)})} className="mt-1 w-full bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /></label>}
                {selected.type==='condition' && <label className="text-xs text-[var(--text-secondary)] mt-2 block">Expression (use {'{{var}}'} and status)<input value={selected.data.expression||''} onChange={e=>updateNodeData(selected.id!,{expression:e.target.value})} placeholder="{{lastStatus}} == 200" className="mt-1 w-full bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs font-mono" /><span className="text-[11px] text-[var(--text-secondary)]">True → edge label true, False → label false</span></label>}
                {selected.type==='extract' && <div className="mt-2 grid grid-cols-2 gap-1.5"><input value={selected.data.varName||''} onChange={e=>updateNodeData(selected.id!,{varName:e.target.value})} placeholder="varName" className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /><input value={selected.data.path||''} onChange={e=>updateNodeData(selected.id!,{path:e.target.value})} placeholder="$.data.id" className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /></div>}
                {selected.type==='setVariable' && <div className="mt-2 grid grid-cols-2 gap-1.5"><input value={selected.data.key||''} onChange={e=>updateNodeData(selected.id!,{key:e.target.value})} placeholder="key" className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /><input value={selected.data.value||''} onChange={e=>updateNodeData(selected.id!,{value:e.target.value})} placeholder="value ({{var}} ok)" className="bg-[var(--bg-surface)] border rounded px-2 py-1.5 text-xs" /></div>}
              </div>
            )}
            <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed border border-[var(--border-subtle)] rounded p-2 bg-[var(--bg-panel)]">
              <strong>How it runs:</strong> DAG level-by-level, parallel within same level. Request nodes use SSRF-safe fetch with {"{{var}}"} interpolation. Branch via condition. Webhook: POST to URL with JSON vars. Schedule via interval.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if(!currentWorkspace) return <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">Select a workspace.</div>;
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[var(--icon-color)]" />
          <h2 className="text-sm font-bold">Workflows</h2>
          <span className="text-xs text-[var(--text-secondary)]">{workflows.length} · Full DAG · webhook · schedule</span>
        </div>
        <button onClick={()=>setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded text-xs font-bold">{showCreate?<X className="w-3.5 h-3.5"/>:<Plus className="w-3.5 h-3.5"/>}{showCreate?'Cancel':'New Workflow'}</button>
      </div>
      {showCreate && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs text-[var(--text-secondary)]">Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs" required placeholder="Login → Create → Verify" /></label>
          <label className="text-xs text-[var(--text-secondary)]">Trigger<select value={form.trigger} onChange={e=>setForm({...form,trigger:e.target.value as any})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs"><option value="manual">Manual</option><option value="webhook">Webhook</option><option value="schedule">Schedule</option></select></label>
          {form.trigger==='schedule' && <label className="text-xs text-[var(--text-secondary)]">Interval (min, ≥5)<input type="number" min={5} max={1440} value={form.intervalMinutes} onChange={e=>setForm({...form,intervalMinutes:Number(e.target.value)})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs" /></label>}
          <label className="text-xs text-[var(--text-secondary)] md:col-span-3">Description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs" placeholder="Optional" /></label>
          <div className="md:col-span-3"><button type="submit" className="px-4 py-1.5 bg-[var(--primary)] text-white rounded text-xs font-bold">Create</button></div>
        </form>
      )}
      {/* Inline edit */}
      {editing && (
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs">Name<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs" /></label>
          <label className="text-xs">Trigger<select value={editing.trigger} onChange={e=>setEditing({...editing,trigger:e.target.value as any})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs"><option value="manual">Manual</option><option value="webhook">Webhook</option><option value="schedule">Schedule</option></select></label>
          <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={!!editing.enabled} onChange={e=>setEditing({...editing,enabled:e.target.checked})} />Enabled</label>
          <label className="text-xs md:col-span-3">Description<input value={editing.description||''} onChange={e=>setEditing({...editing,description:e.target.value})} className="mt-1 w-full bg-[var(--bg-input)] border rounded px-2 py-1.5 text-xs" /></label>
          <div className="md:col-span-3 flex gap-2"><button onClick={handleUpdateMeta} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded text-xs font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5"/>Save</button><button onClick={()=>setEditing(null)} className="px-3 py-1.5 border rounded text-xs">Cancel</button></div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <div className="text-xs text-[var(--text-secondary)]">Loading…</div>}
        {!loading && workflows.length===0 && <div className="text-xs text-[var(--text-secondary)] border rounded p-6 text-center bg-[var(--bg-surface)]">No workflows. Create one — then Open to build DAG (request/condition/parallel branch + webhook).</div>}
        {workflows.map(w=>(
          <div key={w.id} className="border rounded bg-[var(--bg-surface)]">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", !w.enabled?"bg-[var(--text-tertiary)]": w.trigger==='webhook'?"bg-violet-500": w.trigger==='schedule'?"bg-sky-500":"bg-emerald-500")} title={w.trigger} />
              <button onClick={()=>toggleRuns(w)} className="flex-1 text-left min-w-0">
                <div className="text-sm font-bold truncate flex items-center gap-1.5">{w.name} <span className="text-[11px] font-mono bg-[var(--bg-panel)] border rounded px-1">{w.trigger}</span> {!w.enabled && <span className="text-[11px] bg-[var(--text-tertiary)] text-white rounded px-1">disabled</span>}</div>
                <div className="text-xs text-[var(--text-secondary)] truncate">{w.nodes?.length||0} nodes · {w.edges?.length||0} edges {w.description?`· ${w.description}`:''}</div>
              </button>
              <button onClick={()=>openBuilder(w)} className="px-2 py-1 border rounded text-xs font-bold hover:bg-[var(--bg-panel)] flex items-center gap-1"><GitBranch className="w-3.5 h-3.5"/>Open</button>
              <button onClick={()=>runNow(w)} className="p-1.5 hover:text-[var(--primary)]"><Play className="w-4 h-4"/></button>
              <button onClick={()=>setEditing(w)} className="p-1.5 hover:text-[var(--primary)]"><Settings2 className="w-4 h-4"/></button>
              <button onClick={()=>duplicate(w)} className="p-1.5 hover:text-[var(--primary)]"><Copy className="w-4 h-4"/></button>
              <button onClick={()=>remove(w)} className="p-1.5 hover:text-[var(--danger)]"><Trash2 className="w-4 h-4"/></button>
              <button onClick={()=>toggleRuns(w)} className="p-1">{expandedRun===w.id?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}</button>
            </div>
            {expandedRun===w.id && (
              <div className="border-t px-3 py-2">
                {w.webhookToken && <div className="text-xs mb-2 flex items-center gap-1.5 flex-wrap"><Webhook className="w-3.5 h-3.5"/>Webhook: <code className="bg-[var(--bg-panel)] border rounded px-1 py-0.5 break-all">{window.location.origin}/api/workflows/webhook/{w.webhookToken}</code><button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/api/workflows/webhook/${w.webhookToken}`); addToast('Copied','success');}} className="text-xs border rounded px-1.5 py-0.5">Copy</button></div>}
                <div className="text-xs font-bold mb-1.5">Recent runs</div>
                {(runs[w.id]||[]).length===0 && <div className="text-xs text-[var(--text-tertiary)]">No runs.</div>}
                {(runs[w.id]||[]).map((r:any)=>(
                  <div key={r.id} className="flex items-center gap-2 text-xs py-1 border-b last:border-0">
                    {r.status==='success'?<Check className="w-3.5 h-3.5 text-emerald-500"/>:r.status==='failed'?<AlertCircle className="w-3.5 h-3.5 text-red-500"/>:<Clock className="w-3.5 h-3.5 text-amber-500"/>}
                    <span className="font-semibold">{r.status}</span><span className="text-[var(--text-secondary)]">{r.durationMs}ms · {r.trigger}</span><span className="ml-auto text-[var(--text-tertiary)]">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {(runs[w.id]||[]).map((r:any)=> r.logs ? <pre key={r.id+"-logs"} className="mt-1 bg-[var(--bg-panel)] border rounded p-2 text-[11px] overflow-auto max-h-40">{(() => { try{ const j=JSON.parse(r.logs); return JSON.stringify(j,null,2);}catch{ return String(r.logs).slice(0,2000);} })()}</pre> : null)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
