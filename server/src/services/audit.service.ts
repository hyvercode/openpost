import { prisma } from '../db';

/** Append-only audit log (PRD #50). Fire-and-forget: never throw. */
export async function audit(
  action: string,
  opts?: { workspaceId?: string; userId?: string; entityType?: string; entityId?: string; detail?: string }
): Promise<void> {
  try {
    await (prisma as any).auditLog.create({
      data: {
        workspaceId: opts?.workspaceId,
        userId: opts?.userId,
        action,
        entityType: opts?.entityType,
        entityId: opts?.entityId,
        detail: opts?.detail?.slice(0, 2000),
      },
    });
  } catch {
    // audit must never break the main flow (e.g. table missing on old DBs)
  }
}
