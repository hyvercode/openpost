import { Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Resource-level authorization helper (fixes IDOR).
 * Every data controller must call one of these before touching a record:
 * the caller's userId (from the verified JWT, never from query/body)
 * must be an ACTIVE member (or the owner) of the record's workspace.
 */

function tokenUserId(req: Request): string | null {
  const u = (req as any).user;
  return u?.uid || u?.userId || null;
}

export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (membership) return membership.status === 'ACTIVE';
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  return !!workspace && workspace.ownerId === userId;
}

/** For list/create endpoints scoped by workspaceId. Sends 404 on failure (no ID oracle). */
export async function assertWorkspaceAccess(
  req: Request, res: Response, workspaceId: string | undefined
): Promise<boolean> {
  const userId = tokenUserId(req);
  if (!userId || !workspaceId) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  if (!(await isWorkspaceMember(userId, workspaceId))) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }
  return true;
}

/**
 * For update/delete endpoints addressed by record id.
 * `load` fetches the record and returns its workspaceId (or null if missing).
 * Sends 404 when the record is missing OR the caller has no access (no oracle).
 */
export async function assertRecordAccess(
  req: Request,
  res: Response,
  load: () => Promise<{ workspaceId?: string | null } | null>
): Promise<boolean> {
  const userId = tokenUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  let record: { workspaceId?: string | null } | null = null;
  try {
    record = await load();
  } catch {
    record = null;
  }
  if (!record?.workspaceId || !(await isWorkspaceMember(userId, record.workspaceId))) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }
  return true;
}
