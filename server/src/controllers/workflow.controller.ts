import { Request, Response } from 'express';
import { WorkflowService } from '../services/workflow.service';
import { assertWorkspaceAccess } from '../middleware/ownership';
import { prisma } from '../db';
function uid(req: Request): string | null { const u=(req as any).user; return u?.uid||u?.userId||null; }
async function assertWf(req: Request, res: Response, id: string) {
  const wf = await (prisma as any).workflow.findUnique({ where:{id} });
  if (!wf) { res.status(404).json({ error:'Workflow not found' }); return null; }
  if (!(await assertWorkspaceAccess(req,res,wf.workspaceId))) return null;
  return wf;
}
export class WorkflowController {
  private svc = new WorkflowService();
  list = async (req:Request,res:Response)=>{
    try{ const {workspaceId}=req.params; if(!(await assertWorkspaceAccess(req,res,workspaceId))) return; res.json(await this.svc.listByWorkspace(workspaceId)); }catch(e:any){ res.status(500).json({error:'Failed to fetch workflows'}); }
  };
  get = async (req:Request,res:Response)=>{
    try{ const wf=await assertWf(req,res,req.params.id); if(!wf) return; res.json(await this.svc.getById(wf.id)); }catch(e:any){ res.status(500).json({error:'Failed'}); }
  };
  create = async (req:Request,res:Response)=>{
    try{ const {workspaceId}=req.params; if(!(await assertWorkspaceAccess(req,res,workspaceId))) return; const c=await this.svc.create({...req.body, workspaceId}, uid(req)||undefined); res.status(201).json(c); }catch(e:any){ res.status(400).json({error:e.message||'Failed to create workflow'}); }
  };
  update = async (req:Request,res:Response)=>{
    try{ const wf=await assertWf(req,res,req.params.id); if(!wf) return; res.json(await this.svc.update(wf.id, req.body, uid(req)||undefined)); }catch(e:any){ res.status(400).json({error:e.message||'Failed to update'}); }
  };
  remove = async (req:Request,res:Response)=>{
    try{ const wf=await assertWf(req,res,req.params.id); if(!wf) return; res.json(await this.svc.remove(wf.id, uid(req)||undefined)); }catch(e:any){ res.status(500).json({error:'Failed to delete'}); }
  };
  runs = async (req:Request,res:Response)=>{
    try{ const wf=await assertWf(req,res,req.params.id); if(!wf) return; const limit=Math.min(parseInt(String(req.query.limit||'20'))||20,100); res.json(await this.svc.getRuns(wf.id, limit)); }catch(e:any){ res.status(500).json({error:'Failed'}); }
  };
  runNow = async (req:Request,res:Response)=>{
    try{ const wf=await assertWf(req,res,req.params.id); if(!wf) return; const vars=req.body?.variables||{}; res.json(await this.svc.run(wf.id, 'manual', vars)); }catch(e:any){ res.status(400).json({error:e.message||'Failed to run'}); }
  };
  webhook = async (req:Request,res:Response)=>{
    try{
      const token=String(req.params.token||'');
      const wf=await (prisma as any).workflow.findUnique({ where:{ webhookToken: token }});
      if(!wf || wf.trigger!=='webhook') return res.status(404).json({error:'Webhook not found'});
      // No auth — token is secret. Rate limit already via global? add 20/min per workflow
      const result=await this.svc.run(wf.id, 'webhook', req.body||{});
      res.json({ ok:true, workflowId: wf.id, ...result });
    }catch(e:any){ res.status(400).json({error:e.message}); }
  };
}
