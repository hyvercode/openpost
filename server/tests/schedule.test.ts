import { describe, it, expect } from 'vitest';
import { matchesCron, validateCron, inActiveWindow, isPaused, shouldRunMonitor } from '../src/services/schedule';

const D = (h: number, mi: number, day = 15) => new Date(2026, 5, day, h, mi, 0); // Mon Jun 15 2026

describe('matchesCron', () => {
  it('matches every-minute wildcard', () => {
    expect(matchesCron('* * * * *', D(3, 22))).toBe(true);
  });
  it('matches step values', () => {
    expect(matchesCron('*/15 * * * *', D(10, 30))).toBe(true);
    expect(matchesCron('*/15 * * * *', D(10, 31))).toBe(false);
  });
  it('matches lists and ranges', () => {
    expect(matchesCron('0 9-17 * * *', D(12, 0))).toBe(true);
    expect(matchesCron('0 9-17 * * *', D(18, 0))).toBe(false);
    expect(matchesCron('0 9,12 * * *', D(12, 0))).toBe(true);
  });
  it('rejects wrong field count', () => {
    expect(validateCron('*/5 * * *')).toMatch(/5 fields/);
    expect(validateCron('0 9 * * 1')).toBeNull();
  });
  it('treats Sunday as 0 and 7', () => {
    const sunday = new Date(2026, 5, 21, 9, 0, 0); // a Sunday
    expect(matchesCron('0 9 * * 0', sunday)).toBe(true);
    expect(matchesCron('0 9 * * 7', sunday)).toBe(true);
  });
});

describe('inActiveWindow', () => {
  it('is always on when unset', () => {
    expect(inActiveWindow(null, null, D(3, 0))).toBe(true);
  });
  it('handles day windows', () => {
    expect(inActiveWindow('09:00', '17:00', D(12, 0))).toBe(true);
    expect(inActiveWindow('09:00', '17:00', D(8, 59))).toBe(false);
    expect(inActiveWindow('09:00', '17:00', D(17, 0))).toBe(false);
  });
  it('handles overnight windows', () => {
    expect(inActiveWindow('22:00', '06:00', D(23, 30))).toBe(true);
    expect(inActiveWindow('22:00', '06:00', D(5, 59))).toBe(true);
    expect(inActiveWindow('22:00', '06:00', D(12, 0))).toBe(false);
  });
});

describe('isPaused / shouldRunMonitor', () => {
  const base = { enabled: true, intervalMinutes: 60, lastRunAt: null as any };

  it('pauses until pausedUntil', () => {
    expect(isPaused(new Date(Date.now() + 3600000))).toBe(true);
    expect(isPaused(new Date(Date.now() - 1000))).toBe(false);
    expect(shouldRunMonitor({ ...base, pausedUntil: new Date(Date.now() + 3600000) }, new Date())).toBe(false);
  });

  it('interval mode respects interval', () => {
    expect(shouldRunMonitor(base, new Date())).toBe(true);
    expect(shouldRunMonitor({ ...base, lastRunAt: new Date() }, new Date())).toBe(false);
  });

  it('cron mode runs once per matching minute', () => {
    const m = { ...base, scheduleMode: 'cron', cronExpr: '* * * * *', lastRunAt: null as any };
    const now = new Date();
    expect(shouldRunMonitor(m, now)).toBe(true);
    expect(shouldRunMonitor({ ...m, lastRunAt: now }, now)).toBe(false);
  });

  it('cron mode ignores non-matching minutes', () => {
    const m = { ...base, scheduleMode: 'cron', cronExpr: '0 9 * * *', lastRunAt: null as any };
    expect(shouldRunMonitor(m, D(10, 0))).toBe(false);
    expect(shouldRunMonitor(m, D(9, 0))).toBe(true);
  });

  it('invalid cron never runs', () => {
    const m = { ...base, scheduleMode: 'cron', cronExpr: 'bogus', lastRunAt: null as any };
    expect(shouldRunMonitor(m, new Date())).toBe(false);
  });

  it('disabled monitors never run', () => {
    expect(shouldRunMonitor({ ...base, enabled: false }, new Date())).toBe(false);
  });
});
