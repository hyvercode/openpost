import { Request, Response, NextFunction } from 'express';

/**
 * Admin gate (PRD #59). Admins are declared via ADMIN_EMAILS env
 * (comma-separated). No admin concept in DB keeps this simple and
 * auditable; the user record must exist and be email-verified.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prisma } = await import('../db');
    const userId = (req as any).user?.uid || (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { uid: userId } });
    const email = user?.email?.toLowerCase();
    if (!email || !adminEmails().includes(email)) {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    next();
  } catch (error) {
    next(error);
  }
};
