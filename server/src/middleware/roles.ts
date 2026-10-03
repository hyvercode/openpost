import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/**
 * Workspace role matrix (PRD #46).
 * OWNER > ADMIN > EDITOR > VIEWER. Workspace ownerId always acts as OWNER.
 */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

const RANK: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function normalizeRole(role: unknown): WorkspaceRole | null {
  if (typeof role !== 'string') return null;
  const r = role.toUpperCase();
  if (r === 'OWNER' || r === 'ADMIN' || r === 'EDITOR' || r === 'VIEWER') return r;
  // Legacy MEMBER maps to EDITOR.
  if (r === 'MEMBER') return 'EDITOR';
  return null;
}

export async function getMemberRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return null;
  if (workspace.ownerId === userId) return 'OWNER';
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership || membership.status !== 'ACTIVE') return null;
  return normalizeRole(membership.role) || 'VIEWER';
}

/**
 * Require at least `minRole` on the workspace addressed by req.params.id.
 * Attaches req.workspaceRole for downstream handlers.
 */
export function requireRole(minRole: WorkspaceRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.uid || (req as any).user?.userId;
    const workspaceId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workspaceId) return res.status(400).json({ error: 'Workspace id is required' });
    try {
      const role = await getMemberRole(userId, workspaceId);
      if (!role || RANK[role] < RANK[minRole]) {
        return res.status(403).json({ error: 'Forbidden: insufficient workspace role' });
      }
      (req as any).workspaceRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
