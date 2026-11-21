import { describe, it, expect } from 'vitest';
import {
  interpolate,
  getByPath,
  evalCondition,
  sanitizeDag,
  isWorkflowDue,
} from '../src/services/workflow.service';

describe('interpolate', () => {
  it('replaces {{vars}} and existing {pathParams}', () => {
    expect(interpolate('/item/{{id}}/{code}', { id: '1', code: 'A' } as any)).toBe('/item/1/A');
  });
  it('keeps missing single-brace params visible', () => {
    expect(interpolate('/item/{missing}', {} as any)).toBe('/item/{missing}');
  });
  it('empties missing double-brace vars', () => {
    expect(interpolate('hi {{name}}', {} as any)).toBe('hi ');
  });
});

describe('getByPath', () => {
  const obj = { data: { token: 'abc', list: [{ id: 1 }, { id: 2 }] } };
  it('resolves $.paths and indexes', () => {
    expect(getByPath(obj, '$.data.token')).toBe('abc');
    expect(getByPath(obj, 'data.list[1].id')).toBe(2);
  });
  it('returns undefined for missing paths', () => {
    expect(getByPath(obj, '$.data.nope')).toBeUndefined();
  });
});

describe('evalCondition', () => {
  it('evaluates interpolated comparisons', () => {
    expect(evalCondition('{{status}} == 200', { status: 200 } as any)).toBe(true);
    expect(evalCondition('{{status}} == 200', { status: 500 } as any)).toBe(false);
  });
  it('fails closed on unknown identifiers', () => {
    expect(evalCondition('undefinedVar == 1', {} as any)).toBe(false);
  });
  it('rejects dangerous characters', () => {
    expect(evalCondition('status == 200; rm -rf /', { status: 200 } as any)).toBe(false);
  });
  it('supports bare identifiers', () => {
    expect(evalCondition('status === 200', { status: 200 } as any)).toBe(true);
  });
});

describe('sanitizeDag', () => {
  it('caps nodes/edges/variables', () => {
    const nodes = Array.from({ length: 101 }, (_, i) => ({ id: `n${i}` }));
    expect(() => sanitizeDag({ nodes, edges: [], variables: [] })).toThrow(/Too many nodes/);
  });
  it('passes normal DAGs through', () => {
    const dag = sanitizeDag({ nodes: [{ id: 'a' }], edges: [], variables: [{ key: 'k' }] });
    expect(dag.nodes).toHaveLength(1);
  });
});

describe('isWorkflowDue', () => {
  const at9 = new Date(2026, 5, 15, 9, 0, 0);
  it('cron mode matches and runs once per minute', () => {
    expect(isWorkflowDue({ scheduleCron: '0 9 * * *' }, 0, at9)).toBe(true);
    expect(isWorkflowDue({ scheduleCron: '0 9 * * *' }, at9.getTime(), at9)).toBe(false);
    expect(isWorkflowDue({ scheduleCron: '0 10 * * *' }, 0, at9)).toBe(false);
  });
  it('invalid cron never due', () => {
    expect(isWorkflowDue({ scheduleCron: 'bogus' }, 0, at9)).toBe(false);
  });
  it('interval mode uses elapsed time', () => {
    expect(isWorkflowDue({ intervalMinutes: 60 }, 0, at9)).toBe(true);
    expect(isWorkflowDue({ intervalMinutes: 60 }, at9.getTime(), at9)).toBe(false);
  });
});
