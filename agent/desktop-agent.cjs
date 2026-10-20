// Desktop Agent Bridge — hardened.
// Run locally with: node desktop-agent.cjs
// (.cjs extension is intentional: the file uses require() so it runs under
// any package type, including "type": "module" projects.)
//
// SECURITY model: this bridge intentionally forwards requests to
// localhost/private networks (that is its job), so it must ONLY accept
// commands from the local user. Protections:
//  1. Pairing token: printed once at startup; the web app must send it as
//     `x-agent-token` on every /api/proxy call. Without it -> 403.
//     (Configure once in the app settings; token persists in localStorage.)
//  2. Strict origin allowlist (no wildcard fallback).
//  3. Binds 127.0.0.1 only (unchanged).
//  4. 5MB request body cap (DoS), 30s upstream timeout.
//  5. Target must be http(s); credentials in URL rejected; sensitive
//     request headers (authorization/cookie) stripped.
//  6. TLS verified by default; set AGENT_ALLOW_SELF_SIGNED=1 to allow
//     self-signed certs for local dev (logged loudly).

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const PORT = parseInt(process.env.AGENT_PORT || '8765', 10);
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 30000;
const ALLOW_SELF_SIGNED = process.env.AGENT_ALLOW_SELF_SIGNED === '1';

// Pairing token: explicit env wins, else random per start (printed to console).
const PAIRING_TOKEN = process.env.AGENT_TOKEN || crypto.randomBytes(24).toString('hex');

const ALLOWED_ORIGIN_PREFIXES = ['http://localhost:', 'http://127.0.0.1:', 'https://localhost:', 'https://127.0.0.1:'];
const ALLOWED_ORIGIN_SUFFIXES = ['.run.app', '.hyvercode.com'];
const EXTRA_ALLOWED_ORIGINS = (process.env.AGENT_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

function isTrustedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGIN_PREFIXES.some((p) => origin.startsWith(p))) return true;
  if (EXTRA_ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (ALLOWED_ORIGIN_SUFFIXES.some((s) => host === s.replace(/^\./, '') || host.endsWith(s))) return true;
  } catch {
    return false;
  }
  return false;
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const trusted = isTrustedOrigin(origin);

  if (origin && !trusted) {
    send(res, 403, { error: 'Origin not allowed for security reasons.' });
    return;
  }

  // Never fall back to '*' — non-browser callers simply get no CORS headers.
  if (trusted) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // 'authorization' is tolerated so older frontend builds (whose axios
  // interceptor attached the app JWT to bridge calls) still pass preflight —
  // the bridge ignores it and authenticates via the pairing token only.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-target-url, x-agent-token');
  res.setHeader('Access-Control-Max-Age', '600');
  // Private Network Access (Chrome 130+): a public https page (e.g. the
  // hosted web app) must receive this on the preflight or the browser
  // blocks every request to this loopback bridge.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && pathname === '/ping') {
    send(res, 200, { status: 'ok', agent: 'DesktopAgentBridge', pairingRequired: true });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/proxy') {
    // Pairing-token gate.
    const token = req.headers['x-agent-token'];
    if (token !== PAIRING_TOKEN) {
      send(res, 403, {
        error: 'Invalid or missing agent pairing token.',
        hint: 'Copy the pairing token printed by desktop-agent.cjs into the app settings.',
      });
      return;
    }

    let received = 0;
    let body = '';
    let aborted = false;
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        aborted = true;
        send(res, 413, { error: 'Request body too large (max 5MB)' });
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      if (aborted) return;
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        send(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const targetUrl = req.headers['x-target-url'] || payload.url;

      if (!targetUrl || typeof targetUrl !== 'string') {
        send(res, 400, { error: 'Missing x-target-url header or url in payload' });
        return;
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        send(res, 400, { error: 'Invalid target URL' });
        return;
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        send(res, 400, { error: 'Only http(s) target URLs are allowed' });
        return;
      }
      if (parsedUrl.username || parsedUrl.password) {
        send(res, 400, { error: 'Credentials in URL are not allowed' });
        return;
      }

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const method = String(payload.method || 'GET').toUpperCase();
      if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method)) {
        send(res, 400, { error: 'Unsupported HTTP method' });
        return;
      }

      const outHeaders = { ...(payload.headers || {}) };
      for (const h of ['host', 'content-length', 'transfer-encoding', 'connection', 'authorization', 'cookie', 'proxy-authorization']) {
        delete outHeaders[h];
        // also case-insensitive variants commonly sent
        delete outHeaders[h.charAt(0).toUpperCase() + h.slice(1)];
      }

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: outHeaders,
        timeout: UPSTREAM_TIMEOUT_MS,
        rejectUnauthorized: !ALLOW_SELF_SIGNED,
      };

      const startTime = Date.now();

      const proxyReq = client.request(options, (proxyRes) => {
        const chunks = [];
        let size = 0;
        proxyRes.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            proxyReq.destroy();
            send(res, 502, { error: 'Upstream response too large (max 5MB)' });
            return;
          }
          chunks.push(chunk);
        });
        proxyRes.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = proxyRes.headers['content-type'] || '';
          const ct = String(contentType).toLowerCase();
          let textual =
            !ct || // no header: verified by strict UTF-8 round-trip below
            ct.includes('text/') ||
            ct.includes('application/json') ||
            ct.includes('application/ld+json') ||
            ct.includes('application/xml') ||
            ct.includes('application/xhtml+xml') ||
            ct.includes('application/javascript') ||
            ct.includes('application/x-javascript') ||
            ct.includes('application/x-www-form-urlencoded') ||
            ct.includes('application/graphql') ||
            ct.includes('image/svg+xml') ||
            ct.includes('+json') ||
            ct.includes('+xml');

          let data;
          let isBase64 = false;
          if (!ct) {
            // No content-type: trust the bytes — a lossy UTF-8 decode (invalid
            // sequences replaced by U+FFFD) means the payload is binary.
            const text = buffer.toString('utf8');
            if (Buffer.from(text, 'utf8').equals(buffer)) {
              data = text;
            } else {
              data = buffer.toString('base64');
              isBase64 = true;
            }
          } else if (!textual) {
            // Binary payload (image, PDF, wasm, ...): base64 so the web app
            // can render it instead of receiving mojibake.
            data = buffer.toString('base64');
            isBase64 = true;
          } else {
            data = buffer.toString('utf8');
            if (ct.includes('application/json')) {
              try {
                data = JSON.parse(data);
              } catch (e) {
                /* malformed JSON: keep raw text instead of failing */
              }
            }
          }

          send(res, 200, {
            status: proxyRes.statusCode,
            statusText: proxyRes.statusMessage,
            headers: proxyRes.headers,
            data,
            isBase64,
            timeMs: Date.now() - startTime,
            size: buffer.length,
            timings: { total: Date.now() - startTime },
          });
        });
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        send(res, 504, { error: 'Upstream request timed out (30s)' });
      });

      proxyReq.on('error', (e) => {
        send(res, 200, {
          status: 0,
          statusText: 'Agent Bridge Connection Failed',
          headers: {},
          data: { error: 'Desktop agent failed to connect to target.' },
          timeMs: Date.now() - startTime,
          size: 0,
          timings: { total: 0 },
        });
      });

      if (payload.body) {
        let writeBody = payload.body;
        if (typeof writeBody === 'object') {
          writeBody = JSON.stringify(writeBody);
        }
        proxyReq.write(String(writeBody).slice(0, MAX_BODY_BYTES));
      }

      proxyReq.end();
    });
  } else {
    send(res, 404, { error: 'Not Found' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Desktop Agent Bridge running at http://127.0.0.1:${PORT}/`);
  console.log(`Pairing token (keep secret, paste into the web app settings):\n  ${PAIRING_TOKEN}`);
  if (ALLOW_SELF_SIGNED) {
    console.warn('WARNING: AGENT_ALLOW_SELF_SIGNED=1 — TLS certificates are NOT verified.');
  }
  console.log(`Select 'Desktop Agent' in the web application to route requests through this bridge.`);
});
