import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { JWT_SECRET } from '../config';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded?.uid || decoded?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    // Token revocation check (PRD #48): logout / password change /
    // account deletion bump tokenVersion, invalidating old tokens.
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    if (typeof decoded.tv === 'number' && (user as any).tokenVersion !== undefined && decoded.tv !== (user as any).tokenVersion) {
      return res.status(401).json({ error: 'Unauthorized: session revoked, please log in again' });
    }
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireWorkspaceAccess = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.uid || (req as any).user?.userId;
  // Try to find workspaceId in various places
  const workspaceId = req.params.id || req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!workspaceId) return next();

  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      },
      include: {
        workspace: true
      }
    });

    if (!membership) {
      // Check if user is owner (redundant if owner is always a member, but safe)
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (workspace && workspace.ownerId === userId) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: You are not a member of this workspace' });
    }

    if (membership.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Forbidden: Your access to this workspace has been suspended' });
    }

    (req as any).workspaceMember = membership;
    next();
  } catch (error) {
    next(error);
  }
};
