import { Request, Response } from 'express';
import { prisma } from '../db';

export class AdminController {
  stats = async (_req: Request, res: Response) => {
    try {
      const db: any = prisma as any;
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const [users, workspaces, collections, monitors, runs24h, audit24h] = await Promise.all([
        db.user.count(),
        db.workspace.count({ where: { deletedAt: null } }),
        db.collection.count({ where: { deletedAt: null } }),
        db.monitor.count(),
        db.monitorRun.count({ where: { createdAt: { gte: since } } }),
        db.auditLog.count({ where: { createdAt: { gte: since } } }),
      ]);
      res.json({ users, workspaces, collections, monitors, runs24h, audit24h });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  };

  audit = async (req: Request, res: Response) => {
    try {
      const db: any = prisma as any;
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
      const where: any = {};
      if (req.query.workspaceId) where.workspaceId = String(req.query.workspaceId);
      if (req.query.userId) where.userId = String(req.query.userId);
      if (req.query.action) where.action = String(req.query.action);
      res.json(await db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }));
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  };

  usage = async (req: Request, res: Response) => {
    try {
      const db: any = prisma as any;
      const d = new Date();
      const yearMonth =
        String(req.query.month || `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
      const rows = await db.usageMeter.findMany({ where: { yearMonth } });
      const byAction: Record<string, number> = {};
      const byUser: Record<string, number> = {};
      for (const r of rows) {
        byAction[r.action] = (byAction[r.action] || 0) + r.count;
        byUser[r.userId] = (byUser[r.userId] || 0) + r.count;
      }
      const topUsers = Object.entries(byUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([userId, total]) => ({ userId, total }));
      res.json({ yearMonth, byAction, topUsers, meteredUsers: Object.keys(byUser).length });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
  };
}
