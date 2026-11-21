import type { TestAssertion } from '../types';

export interface AssertionOutcome { pass: boolean; message: string }

function bodyTextOf(data: any): string {
  if (typeof data === 'string') return data;
  try { return JSON.stringify(data); } catch { return String(data ?? ''); }
}

/** Evaluate every TestAssertion type. Unknown types fail closed (never silent-pass). */
export function evaluateAssertion(
  assertion: TestAssertion,
  res: { status: number; data: any; headers?: Record<string, string> },
  durationMs: number
): AssertionOutcome {
  const expected = (assertion.expectedValue ?? '').trim();
  switch (assertion.type) {
    case 'status_code': {
      const want = Number(expected);
      const pass = Number.isFinite(want) && res.status === want;
      return { pass, message: pass ? `status is ${want}` : `expected status ${expected || '(empty)'}, got ${res.status}` };
    }
    case 'response_time_less_than': {
      const want = Number(expected);
      const pass = Number.isFinite(want) && durationMs < want;
      return { pass, message: pass ? `${durationMs}ms < ${want}ms` : `expected < ${expected || '(empty)'}ms, got ${durationMs}ms` };
    }
    case 'body_contains': {
      const pass = expected !== '' && bodyTextOf(res.data).includes(expected);
      return { pass, message: pass ? `body contains "${expected}"` : `body does not contain "${expected}"` };
    }
    case 'body_equals': {
      const pass = bodyTextOf(res.data).trim() === expected;
      return { pass, message: pass ? 'body equals expected' : 'body differs from expected' };
    }
    case 'header_exists': {
      const headers = res.headers || {};
      const found = Object.keys(headers).some(k => k.toLowerCase() === expected.toLowerCase());
      return { pass: expected !== '' && found, message: found ? `header "${expected}" present` : `header "${expected || '(empty)'}" missing` };
    }
    default:
      return { pass: false, message: `unknown assertion type "${(assertion as any)?.type}"` };
  }
}
