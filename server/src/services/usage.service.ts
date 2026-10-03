import { prisma } from '../db';

/** Billable actions (PRD #58). */
export type MeteredAction = 'proxy_call' | 'ai_call';

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Increment a monthly usage counter. Fire-and-forget: never throw. */
export async function meter(userId: string | null | undefined, action: MeteredAction, amount = 1): Promise<void> {
  if (!userId) return;
  try {
    const yearMonth = currentYearMonth();
    await (prisma as any).usageMeter.upsert({
      where: { userId_action_yearMonth: { userId, action, yearMonth } },
      update: { count: { increment: amount } },
      create: { userId, action, yearMonth, count: amount },
    });
  } catch {
    // metering must never break the request
  }
}

export async function getUsage(userId: string, yearMonth?: string) {
  const ym = yearMonth || currentYearMonth();
  const rows = await (prisma as any).usageMeter.findMany({ where: { userId, yearMonth: ym } });
  const totals: Record<string, number> = {};
  for (const r of rows) totals[r.action] = r.count;
  return { userId, yearMonth: ym, totals };
}
