import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

/**
 * Shared SSRF guard (single source of truth for URL safety).
 * Used by the /api/proxy endpoint (server.ts) and the monitor runner
 * (monitor.service.ts). Covered by server/tests/security.test.ts.
 */

const BLOCKED_HOST_SUFFIXES = ['.internal', '.local', '.localhost', '.lan', '.home', '.corp'];

// Cloud metadata endpoints (IMDS) — not covered by private-range checks.
export const BLOCKED_IPS = new Set([
  '169.254.169.254', // AWS / GCP / Azure / DigitalOcean IMDS
  '100.100.100.100', // Alibaba Cloud IMDS
  'fd00:ec2::254', // AWS IPv6 IMDS
]);

export function ipIsBlocked(ipStr: string): boolean {
  if (BLOCKED_IPS.has(ipStr)) return true;
  let parsed: any = null;
  try {
    parsed = ipaddr.parse(ipStr);
  } catch {
    try {
      parsed = (ipaddr as any).process(ipStr);
    } catch {
      return true;
    }
  }
  if (!parsed) return true;
  // Normalize IPv4-mapped IPv6 (::ffff:127.0.0.1) before range check.
  const range = typeof parsed.range === 'function' ? parsed.range() : 'unicast';
  if (range !== 'unicast' && range !== 'global') return true;
  return false;
}

export function policyError(message: string, status: number, suggestion?: string): Error & { status: number; suggestion?: string } {
  return Object.assign(new Error(message), { status, suggestion });
}

export async function assertUrlSafe(rawUrl: string): Promise<{ urlObj: URL; targetIp: string }> {
  let urlObj: URL;
  try {
    urlObj = new URL(rawUrl);
  } catch {
    throw policyError('Invalid URL', 400);
  }
  // Only http/https — reject file:, gopher:, dict:, ftp:, etc.
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw policyError('Only http(s) URLs are allowed', 400);
  }
  if (urlObj.username || urlObj.password) {
    throw policyError('Credentials in URL are not allowed', 400);
  }
  const host = urlObj.hostname.toLowerCase();
  if (!host || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))) {
    throw policyError('Access to internal or local networks is blocked', 403);
  }
  // Resolve ALL addresses (A + AAAA) — block if ANY is non-public (DNS rebinding defense).
  let records: Array<{ address: string }>;
  try {
    const [v4, v6] = await Promise.all([
      dns.resolve4(host).catch(() => [] as string[]),
      dns.resolve6(host).catch(() => [] as string[]),
    ]);
    records = [...v4.map((a) => ({ address: a })), ...v6.map((a) => ({ address: a }))];
    if (records.length === 0) {
      const fallback = await dns.lookup(host);
      records = [{ address: fallback.address }];
    }
  } catch {
    throw policyError('DNS resolution failed', 400);
  }
  for (const r of records) {
    if (ipIsBlocked(r.address)) {
      throw policyError(
        'SSRF Protection: Access to internal or local networks is blocked.',
        403,
        'To test local APIs, please use the Desktop Agent Bridge.'
      );
    }
  }
  return { urlObj, targetIp: records[0].address };
}

/**
 * DNS lookup pinned to one pre-validated IP.
 * NOTE: Node 20+ uses autoSelectFamily and calls lookup with { all: true }
 * expecting an ARRAY. Ignoring that crashes with
 * "Invalid IP address: undefined".
 */
export function createPinnedLookup(hostname: string, ip: string) {
  const family = ip.includes(':') ? 6 : 4;
  return (_h: string, options: any, callback: any) => {
    if (_h === hostname && ip) {
      if (options && typeof options === 'object' && options.all) {
        callback(null, [{ address: ip, family }]);
      } else {
        callback(null, ip, family);
      }
    } else {
      callback(new Error('DNS resolution denied by SSRF policy'));
    }
  };
}
