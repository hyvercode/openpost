/**
 * Flexible monitor scheduling: cron expressions, manual pause
 * (maintenance windows), and daily active-hours windows.
 *
 * Times are interpreted in the server's local timezone; `timezone` is
 * stored as a label for display. Cron uses standard 5-field syntax:
 * `minute hour dayOfMonth month dayOfWeek`, supporting `*`, `*\/n`,
 * `a-b`, and comma lists.
 */

function parseField(field: string, min: number, max: number): Set<number> | null {
  // null = wildcard
  const out = new Set<number>();
  for (const part of field.split(',')) {
    const p = part.trim();
    if (p === '*') return null;
    let step = 1;
    let range = p;
    const slash = p.indexOf('/');
    if (slash >= 0) {
      range = p.slice(0, slash);
      step = parseInt(p.slice(slash + 1), 10);
      if (!Number.isFinite(step) || step < 1) throw new Error(`Invalid cron step: ${p}`);
    }
    let lo = min;
    let hi = max;
    if (range !== '' && range !== '*') {
      const dash = range.indexOf('-');
      if (dash >= 0) {
        lo = parseInt(range.slice(0, dash), 10);
        hi = parseInt(range.slice(dash + 1), 10);
      } else {
        lo = hi = parseInt(range, 10);
      }
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error(`Invalid cron field: ${p}`);
    }
    for (let v = lo; v <= hi; v += step) {
      if (v >= min && v <= max) out.add(v);
    }
  }
  return out;
}

export function matchesCron(expr: string, at: Date = new Date()): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Cron expression must have 5 fields (minute hour dom month dow)');
  const [mi, hr, dom, mon, dow] = [
    parseField(fields[0], 0, 59),
    parseField(fields[1], 0, 23),
    parseField(fields[2], 1, 31),
    parseField(fields[3], 1, 12),
    parseField(fields[4], 0, 7),
  ];
  const minute = at.getMinutes();
  const hour = at.getHours();
  const day = at.getDate();
  const month = at.getMonth() + 1;
  // cron: 0 and 7 both mean Sunday
  const rawDow = at.getDay();
  const inSet = (set: Set<number> | null, v: number, alt?: number) =>
    set === null || set.has(v) || (alt !== undefined && set.has(alt));
  return (
    inSet(mi, minute) &&
    inSet(hr, hour) &&
    inSet(dom, day) &&
    inSet(mon, month) &&
    inSet(dow, rawDow, rawDow === 0 ? 7 : rawDow === 7 ? 0 : undefined)
  );
}

export function validateCron(expr: string): string | null {
  try {
    matchesCron(expr);
    return null;
  } catch (e: any) {
    return e?.message || 'Invalid cron expression';
  }
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateHhMm(v: string): boolean {
  return HHMM.test(v);
}

function toMinutes(v: string): number {
  const [h, m] = v.split(':').map(Number);
  return h * 60 + m;
}

/** True when `at` falls inside [activeStart, activeEnd). Empty bounds = always. Overnight ranges wrap. */
export function inActiveWindow(activeStart?: string | null, activeEnd?: string | null, at: Date = new Date()): boolean {
  if (!activeStart && !activeEnd) return true;
  if (!activeStart || !activeEnd) return true;
  if (!validateHhMm(activeStart) || !validateHhMm(activeEnd)) return true;
  const now = at.getHours() * 60 + at.getMinutes();
  const s = toMinutes(activeStart);
  const e = toMinutes(activeEnd);
  if (s === e) return true;
  if (s < e) return now >= s && now < e;
  return now >= s || now < e;
}

export function isPaused(pausedUntil?: string | Date | null, at: Date = new Date()): boolean {
  if (!pausedUntil) return false;
  return new Date(pausedUntil).getTime() > at.getTime();
}

export interface Schedulable {
  enabled: boolean;
  intervalMinutes: number;
  scheduleMode?: string | null;
  cronExpr?: string | null;
  activeStart?: string | null;
  activeEnd?: string | null;
  pausedUntil?: string | Date | null;
  lastRunAt?: string | Date | null;
}

/** Single scheduling decision used by the scheduler tick. Never throws. */
export function shouldRunMonitor(m: Schedulable, at: Date = new Date()): boolean {
  try {
    if (!m.enabled) return false;
    if (isPaused(m.pausedUntil, at)) return false;
    if (!inActiveWindow(m.activeStart, m.activeEnd, at)) return false;
    if ((m.scheduleMode || 'interval') === 'cron') {
      if (!m.cronExpr || validateCron(m.cronExpr)) return false;
      if (!matchesCron(m.cronExpr, at)) return false;
      // One run per matching minute: skip if already ran this minute.
      if (m.lastRunAt) {
        const last = new Date(m.lastRunAt);
        if (
          last.getFullYear() === at.getFullYear() &&
          last.getMonth() === at.getMonth() &&
          last.getDate() === at.getDate() &&
          last.getHours() === at.getHours() &&
          last.getMinutes() === at.getMinutes()
        ) {
          return false;
        }
      }
      return true;
    }
    const last = m.lastRunAt ? new Date(m.lastRunAt).getTime() : 0;
    return at.getTime() - last >= Math.max(1, m.intervalMinutes || 60) * 60000;
  } catch {
    return false;
  }
}
