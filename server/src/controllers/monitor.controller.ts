import { Request, Response } from 'express';
import { MonitorService } from '../services/monitor.service';
import { assertWorkspaceAccess } from '../middleware/ownership';
import { prisma } from '../db';

function tokenUserId(req: Request): string | null {
  const u = (req as any).user;
  return u?.uid || u?.userId || null;
}

async function assertMonitorAccess(req: Request, res: Response, monitorId: string): Promise<any | null> {
  const monitor = await (prisma as any).monitor.findUnique({ where: { id: monitorId } });
  if (!monitor) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }
  if (!(await assertWorkspaceAccess(req, res, monitor.workspaceId))) return null;
  return monitor;
}

export class MonitorController {
  private monitorService = new MonitorService();

  list = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      res.json(await this.monitorService.listByWorkspace(workspaceId));
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch monitors' });
    }
  };

  runs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertMonitorAccess(req, res, id))) return;
      const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 100);
      res.json(await this.monitorService.getRuns(id, limit));
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch monitor runs' });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const created = await this.monitorService.create(
        { ...req.body, workspaceId },
        tokenUserId(req) || undefined
      );
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to create monitor' });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertMonitorAccess(req, res, id))) return;
      const updated = await this.monitorService.update(id, req.body, tokenUserId(req) || undefined);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update monitor' });
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertMonitorAccess(req, res, id))) return;
      res.json(await this.monitorService.remove(id, tokenUserId(req) || undefined));
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete monitor' });
    }
  };

  runNow = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertMonitorAccess(req, res, id))) return;
      res.json(await this.monitorService.runMonitor(id));
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to run monitor' });
    }
  };
}
