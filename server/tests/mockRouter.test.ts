import { describe, it, expect, vi } from 'vitest';
import {
  escapeRegExp,
  extractSubpath,
  getPathFromUrl,
  matchMockRoute,
  renderMockBody,
  defaultMockBody,
  sendMockResponse,
  enforceMockGates,
} from '../src/utils/mockRouter';

const reqs = [
  { method: 'GET', url: 'https://api.example.com/users', name: 'List' },
  { method: 'GET', url: 'https://api.example.com/users/:id', name: 'One' },
  { method: 'POST', url: '{{baseUrl}}/orders', name: 'Create' },
];

describe('extractSubpath', () => {
  it('strips prefix and normalizes slashes', () => {
    expect(extractSubpath('/mock/abc/users/', '/mock/abc')).toBe('/users');
    expect(extractSubpath('/mock/abc', '/mock/abc')).toBe('/');
  });
  it('escapes regex chars in ids', () => {
    expect(extractSubpath('/mock/a.c/users', '/mock/a.c')).toBe('/users');
    expect(escapeRegExp('a.c')).toBe('a\\.c');
  });
});

describe('getPathFromUrl', () => {
  it('strips {{vars}}, host, query and trailing slash', () => {
    expect(getPathFromUrl('{{baseUrl}}/orders/?x=1')).toBe('/orders');
    expect(getPathFromUrl('/users/')).toBe('/users');
    expect(getPathFromUrl('')).toBe('/');
  });
});

describe('matchMockRoute', () => {
  it('matches exact method + path', () => {
    const m = matchMockRoute(reqs, 'GET', '/users');
    expect(m?.request.name).toBe('List');
    expect(m?.params).toEqual({});
  });
  it('matches :param segments case-insensitively on method', () => {
    const m = matchMockRoute(reqs, 'get', '/users/123');
    expect(m?.request.name).toBe('One');
    expect(m?.params).toEqual({ id: '123' });
  });
  it('returns null on method mismatch or segment count', () => {
    expect(matchMockRoute(reqs, 'POST', '/users')).toBeNull();
    expect(matchMockRoute(reqs, 'GET', '/users/1/posts')).toBeNull();
  });
  it('matches {{var}} hosts', () => {
    expect(matchMockRoute(reqs, 'POST', '/orders')?.request.name).toBe('Create');
  });
});

describe('renderMockBody', () => {
  it('replaces {param} and keeps unknown keys', () => {
    expect(renderMockBody('{"id":"{id}","x":"{missing}"}', { id: '7' })).toBe('{"id":"7","x":"{missing}"}');
  });
  it('passes non-strings through', () => {
    expect(renderMockBody({ a: 1 }, { id: '7' })).toEqual({ a: 1 });
  });
});

describe('defaultMockBody + sendMockResponse', () => {
  function mockRes() {
    const headers: Record<string, string> = {};
    return {
      res: {
        setHeader: vi.fn((k: string, v: string) => { headers[k] = v; }),
        status: vi.fn(function (this: any) { return this; }),
        json: vi.fn(),
        send: vi.fn(),
      } as any,
      headers,
    };
  }
  it('sends JSON bodies as JSON', async () => {
    const { res } = mockRes();
    await sendMockResponse(res, defaultMockBody('X'), 0);
    expect(res.json).toHaveBeenCalledWith({ message: 'Mock response for X' });
  });
  it('falls back to raw text', async () => {
    const { res } = mockRes();
    await sendMockResponse(res, { status: 200, body: '<h1>hi</h1>' }, 0);
    expect(res.send).toHaveBeenCalledWith('<h1>hi</h1>');
  });
});

describe('enforceMockGates', () => {
  const isRateLimited = vi.fn(() => false);
  function reqRes(headers: any = {}, query: any = {}) {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    return { req: { headers, query } as any, res: { status, json } as any };
  }
  it('rejects missing api key', () => {
    const { req, res } = reqRes();
    const handled = enforceMockGates(req, res, { apiKey: { enabled: true, key: 'k' } }, 'm1', isRateLimited, 'docs');
    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(401);
  });
  it('passes with correct key and returns false', () => {
    const { req, res } = reqRes({ 'x-api-key': 'k' });
    const handled = enforceMockGates(req, res, { apiKey: { enabled: true, key: 'k' } }, 'm1', isRateLimited, 'docs');
    expect(handled).toBe(false);
  });
  it('rejects when rate limited', () => {
    const { req, res } = reqRes();
    const handled = enforceMockGates(req, res, { rateLimit: { enabled: true, requestsPerMinute: 1 } }, 'm1', () => true, 'docs');
    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
