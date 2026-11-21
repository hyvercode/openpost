import type { Request, Response } from 'express';

/**
 * Shared mock-server routing (used by both /mock/collection/:id and
 * /mock/:deployId routers in server.ts, which were copy-pasted drifts).
 *
 * - Prefix stripping escapes regex chars (ids are user-influenced).
 * - Route matching supports `:param` segments: stored `/users/:id`
 *   matches `/users/123`, with params available for body interpolation.
 * - `{param}` placeholders in the mock body are replaced from path params.
 * - Optional latencyMs delays the response (chaos/latency testing).
 */

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSubpath(fullPath: string, prefix: string): string {
  let sub = fullPath.replace(new RegExp(`^${escapeRegExp(prefix)}`), '');
  if (!sub.startsWith('/')) sub = '/' + sub;
  if (sub.length > 1 && sub.endsWith('/')) sub = sub.slice(0, -1);
  return sub;
}

export function getPathFromUrl(urlStr: string): string {
  try {
    if (!urlStr) return '/';
    let cleaned = String(urlStr).replace(/\{\{[^}]+\}\}/g, '');
    if (!cleaned.startsWith('http') && !cleaned.startsWith('/')) cleaned = '/' + cleaned;
    const u = new URL(cleaned, 'http://dummy.com');
    let p = u.pathname;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  } catch {
    return urlStr || '/';
  }
}

export interface MockMatch {
  request: any;
  params: Record<string, string>;
}

function splitSegs(p: string): string[] {
  return p.split('/').filter(Boolean);
}

/** Match method + path; `:param` segments match anything and are captured. */
export function matchMockRoute(requests: any[], method: string, subpath: string): MockMatch | null {
  const wantSegs = splitSegs(subpath);
  for (const r of requests || []) {
    if (String(r?.method || '').toUpperCase() !== String(method || '').toUpperCase()) continue;
    const routeSegs = splitSegs(getPathFromUrl(r?.url));
    if (routeSegs.length !== wantSegs.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < routeSegs.length; i++) {
      const rs = routeSegs[i];
      if (rs.startsWith(':')) {
        params[rs.slice(1)] = decodeURIComponent(wantSegs[i]);
      } else if (rs !== wantSegs[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { request: r, params };
  }
  return null;
}

/** Replace `{param}` placeholders with captured path params. Unknown keys stay literal. */
export function renderMockBody(body: unknown, params: Record<string, string>): unknown {
  if (typeof body !== 'string' || !params || Object.keys(params).length === 0) return body;
  return body.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (m, k) => (k in params ? params[k] : m));
}

export interface MockResponseShape {
  status?: number;
  headers?: Array<{ key?: string; value?: string; enabled?: boolean }>;
  body?: unknown;
}

export function defaultMockBody(name: string): MockResponseShape {
  return {
    status: 200,
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    body: JSON.stringify({ message: `Mock response for ${name}` }),
  };
}

/** Set headers + status + body (JSON when parseable). Resolves after optional latency. */
export function sendMockResponse(res: Response, mockRes: MockResponseShape, latencyMs = 0): Promise<void> {
  return new Promise((resolve) => {
    const send = () => {
      const headers = Array.isArray(mockRes.headers) ? mockRes.headers : null;
      if (headers) {
        for (const h of headers) {
          if (h?.enabled && h?.key && h?.value) res.setHeader(h.key, h.value);
        }
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      res.status(Number(mockRes.status) || 200);
      const body = mockRes.body;
      if (typeof body === 'string') {
        try {
          res.json(JSON.parse(body));
        } catch {
          res.send(body);
        }
      } else if (body !== undefined) {
        res.json(body);
      } else {
        res.send('');
      }
      resolve();
    };
    if (latencyMs > 0) setTimeout(send, latencyMs);
    else send();
  });
}

/** Rate-limit + apiKey gates shared by both mock routers. Returns true when the request was answered. */
export function enforceMockGates(
  req: Request,
  res: Response,
  mockConfig: any,
  rateKey: string,
  isRateLimited: (key: string, limit: number) => boolean,
  keyDocs: string
): boolean {
  if (mockConfig?.apiKey?.enabled) {
    const providedKey = (req.headers as any)['x-api-key'] || (req.query as any)?.apiKey;
    if (!providedKey || providedKey !== mockConfig.apiKey.key) {
      res.status(401).json({
        error: 'Unauthorized. Valid X-API-Key header or apiKey query parameter required.',
        documentation: keyDocs,
      });
      return true;
    }
  }
  if (mockConfig?.rateLimit?.enabled) {
    const limit = Number(mockConfig.rateLimit.requestsPerMinute) || 60;
    if (isRateLimited(rateKey, limit)) {
      res.status(429).json({ error: 'Too many requests. Rate limit exceeded.' });
      return true;
    }
  }
  return false;
}
