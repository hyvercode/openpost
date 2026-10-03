import "dotenv/config";
// Validate security-critical config FIRST (fail-fast in production).
import "./server/src/config";
import express from "express";
import ipaddr from "ipaddr.js";
import dns from "dns/promises";
import cors from "cors";
import helmet from "helmet";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import { GoogleGenAI } from "@google/genai";

// New Prisma Routes
import workspaceRoutes from './server/src/routes/workspace.routes';
import collectionRoutes from './server/src/routes/collection.routes';
import environmentRoutes from './server/src/routes/environment.routes';
import deploymentRoutes from './server/src/routes/deployment.routes';
import userRoutes from './server/src/routes/user.routes';
import authRoutes from './server/src/routes/auth.routes';
import commentRoutes from './server/src/routes/comment.routes';
import versionRoutes from './server/src/routes/version.routes';
import { prisma } from './server/src/db';
import { requireAuth } from './server/src/middleware/auth';
import { rateLimiter } from './server/src/middleware/rateLimiter';

// Resolve the application root across dev and packaged (Electron) layouts:
// - dev (tsx server.ts):        cwd = <project>/
// - bundled (node dist/server.cjs): cwd = <project>/
// - packaged (asar:false):      OPENPOST_APP_ROOT=<resources>/app (set by Electron)
// The Electron child process sets cwd to the userData dir (writable), so
// process.cwd() must NOT be used to locate bundled assets.
// NOTE: no __dirname here — this file runs as ESM under tsx (no __dirname)
// and as bundled CJS under esbuild; process.argv[1] works in both.
function resolveAppRoot(): string {
  if (process.env.OPENPOST_APP_ROOT && fs.existsSync(process.env.OPENPOST_APP_ROOT)) {
    return process.env.OPENPOST_APP_ROOT;
  }
  const resourcesPath = (process as any).resourcesPath as string | undefined;
  if (resourcesPath) {
    const candidate = path.join(resourcesPath, 'app');
    if (fs.existsSync(candidate)) return candidate;
  }
  const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
  if (scriptPath && path.basename(path.dirname(scriptPath)) === 'dist') {
    return path.dirname(path.dirname(scriptPath));
  }
  return process.cwd();
}

const APP_ROOT = resolveAppRoot();

async function startServer() {
  const app = express();

  // Dev server must always run on port 3000 per AI Studio environment constraints
  const PORT = process.env.PORT || 3000;

  // SECURITY headers (CSP, HSTS, X-Frame-Options, noSniff, ...).
  // Google sign-in scripts are allow-listed so GIS login keeps working.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://accounts.google.com"],
          frameSrc: ["https://accounts.google.com"],
          connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com", "https://oauth2.googleapis.com"],
          imgSrc: ["'self'", "data:", "https:"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.disable('x-powered-by');

  // Restrict CORS instead of reflecting any origin.
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / non-browser (curl, Electron) have no Origin header.
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed'));
      },
      credentials: true,
    })
  );
  // Request bodies: 1MB default (raises DoS cost); import endpoints that need
  // more should set their own limit explicitly.
  app.use(express.json({ limit: "1mb" }));

  // Mount Prisma API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/environments', environmentRoutes);
  app.use('/api/deployments', deploymentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/versions', versionRoutes);

  app.post("/api/generate-code", async (req, res) => {
    try {
      const { requestConfig, language } = req.body;
      if (!requestConfig) {
        return res.status(400).json({ error: "requestConfig is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Convert the following HTTP request to ${language || 'a curl command'} code.
Return ONLY the raw code block with no markdown formatting. Do not wrap in \`\`\`.

Request URL: ${requestConfig.url}
Method: ${requestConfig.method}
Headers: ${JSON.stringify(requestConfig.headers || [])}
Params: ${JSON.stringify(requestConfig.params || [])}
Body: ${JSON.stringify(requestConfig.body || {})}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt
      });

      let code = response.text || "";
      code = code.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();

      res.json({ code });
    } catch (error: any) {
      console.error("Code generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate code" });
    }
  });

  app.post("/api/collections/generate-docs", async (req, res) => {
    try {
      const { collectionName, folders, requests, targetType, targetName } = req.body;
      if (!collectionName) {
        return res.status(400).json({ error: "collectionName is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const folderList = (folders || []).map((f: any) => f.name).join(", ");
      const requestList = (requests || []).map((r: any) => `- ${r.method} ${r.url || '/'} (${r.name})`).join("\n");

      let prompt = '';
      if (targetType === 'folder' && targetName) {
        prompt = `You are a world-class technical writer and API documentation expert.
Generate a comprehensive, professional Markdown guide specifically for the API Folder / Category: "${targetName}" within the "${collectionName}" collection.

The folder contains the following endpoints:
${requestList || "No endpoints defined yet."}

Please output a beautifully-structured Markdown document containing:
1. # ${targetName} (Folder Documentation)
2. A brief overview of what this category of endpoints is used for.
3. ## Endpoints (a neat Markdown table detailing methods, paths, and descriptions).
4. ## Common Usage Patterns (tips for using these specific endpoints).

Write directly in Markdown without any meta-introductions.`;
      } else if (targetType === 'request' && targetName) {
        const reqItem = requests[0] || {};
        prompt = `You are a world-class technical writer and API documentation expert.
Generate a comprehensive, professional Markdown guide specifically for the API Request: "${targetName}" (${reqItem.method} ${reqItem.url || '/'}).

Context: It belongs to the collection "${collectionName}".

Please output a beautifully-structured Markdown document containing:
1. # ${targetName}
2. A detailed description of what this single endpoint does.
3. ## Request (Explain the URL parameters, headers, and body if applicable).
4. ## Response (Explain expected success and error responses).

Write directly in Markdown without any meta-introductions.`;
      } else {
        prompt = `You are a world-class technical writer and API documentation expert.
Generate a comprehensive, professional, and visually stunning API User Guide and Developer Documentation for the API Collection: "${collectionName}".

The collection is structured as follows:
${folderList ? `- Key Categories/Folders: ${folderList}` : ""}
- Endpoints & Routes:
${requestList || "No endpoints defined yet."}

Please output a beautifully-structured Markdown document containing the following sections:
1. # ${collectionName} API Documentation (include a brief high-level overview of the API's purpose)
2. ## Getting Started (step-by-step instructions on base URLs, environments, and first steps)
3. ## Authentication (explain how to authenticate, where to place bearer tokens/API keys, e.g., Bearer token or custom headers)
4. ## Category Breakdown (a structured section mapping out the folders: ${folderList || "General Endpoints"} and describing what kinds of operations reside in each)
5. ## Endpoint Details & Methods (provide a neat Markdown table detailing methods, paths, and descriptions based on the routes provided)
6. ## Response Codes & Error Handling (explain standard HTTP status codes like 200, 201, 400, 401, 403, 404, 500 in this context)

Write with clarity, high-contrast structural formatting, tables, list items, and clear headings. Do NOT include any meta-introductions (like "Here is your documentation"). Start directly with the markdown.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      const markdown = response.text || "";
      res.json({ markdown });
    } catch (error: any) {
      console.error("Documentation generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate documentation" });
    }
  });

  // Basic healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve desktop agent binary/script downloads directly with attachment disposition
  app.get("/downloads/:filename", (req, res) => {
    const filename = req.params.filename;

    // Bundled downloads live next to dist/ (dev: dist/downloads or
    // public/downloads; packaged: <resources>/app/dist/downloads).
    const searchDirs = [
      path.join(APP_ROOT, "dist", "downloads"),
      path.join(APP_ROOT, "public", "downloads"),
      path.join(process.cwd(), "dist", "downloads"),
      path.join(process.cwd(), "public", "downloads"),
      path.join(process.cwd(), "agent"),
    ];
    let filePath = "";
    for (const dir of searchDirs) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    // Fallback to agent/desktop-agent.js source if requesting a script
    if (!filePath && (filename.includes("js") || filename.includes("node"))) {
      const fallbackCandidates = [
        path.join(APP_ROOT, "agent", "desktop-agent.js"),
        path.join(process.cwd(), "agent", "desktop-agent.js"),
      ];
      filePath = fallbackCandidates.find((c) => fs.existsSync(c)) || "";
    }

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (filename.endsWith('.exe')) {
        res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
      } else if (filename.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      return res.sendFile(filePath);
    }
    
    // Fallback script if binary not found
    const fallbackCandidates = [
      path.join(APP_ROOT, "agent", "desktop-agent.js"),
      path.join(process.cwd(), "agent", "desktop-agent.js"),
    ];
    const fallbackScript = fallbackCandidates.find((c) => fs.existsSync(c)) || fallbackCandidates[0];
    if (fs.existsSync(fallbackScript)) {
      res.setHeader('Content-Disposition', `attachment; filename="desktop-agent.js"`);
      res.setHeader('Content-Type', 'application/javascript');
      return res.sendFile(fallbackScript);
    }

    return res.status(404).json({ error: "Agent file not found" });
  });

  // The proxy endpoint - Rate limited to 60 req/min per user
  app.all("/api/proxy", requireAuth, rateLimiter(60), async (req, res) => {
    const startTime = performance.now();

    // --- SSRF guard helpers (single source of truth for URL safety) ---
    const BLOCKED_HOST_SUFFIXES = ['.internal', '.local', '.localhost', '.lan', '.home', '.corp'];
    // Cloud metadata endpoints (IMDS) — not covered by private-range checks.
    const BLOCKED_IPS = new Set([
      '169.254.169.254', // AWS / GCP / Azure / DigitalOcean IMDS
      '100.100.100.100', // Alibaba Cloud IMDS
      'fd00:ec2::254',   // AWS IPv6 IMDS
    ]);

    function ipIsBlocked(ipStr: string): boolean {
      if (BLOCKED_IPS.has(ipStr)) return true;
      let parsed: any = null;
      try { parsed = ipaddr.parse(ipStr); } catch { try { parsed = (ipaddr as any).process(ipStr); } catch { return true; } }
      if (!parsed) return true;
      // Normalize IPv4-mapped IPv6 (::ffff:127.0.0.1) before range check.
      const range = typeof parsed.range === 'function' ? parsed.range() : 'unicast';
      if (range !== 'unicast' && range !== 'global') return true;
      return false;
    }

    async function assertUrlSafe(rawUrl: string): Promise<{ urlObj: URL; targetIp: string }> {
      let urlObj: URL;
      try {
        urlObj = new URL(rawUrl);
      } catch {
        throw Object.assign(new Error('Invalid URL'), { status: 400 });
      }
      // Only http/https — reject file:, gopher:, dict:, ftp:, etc.
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        throw Object.assign(new Error('Only http(s) URLs are allowed'), { status: 400 });
      }
      if (urlObj.username || urlObj.password) {
        throw Object.assign(new Error('Credentials in URL are not allowed'), { status: 400 });
      }
      const host = urlObj.hostname.toLowerCase();
      if (!host || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))) {
        throw Object.assign(new Error('Access to internal or local networks is blocked'), { status: 403 });
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
        throw Object.assign(new Error('DNS resolution failed'), { status: 400 });
      }
      for (const r of records) {
        if (ipIsBlocked(r.address)) {
          throw Object.assign(
            new Error('SSRF Protection: Access to internal or local networks is blocked.'),
            { status: 403, suggestion: 'To test local APIs, please use the Desktop Agent Bridge.' }
          );
        }
      }
      return { urlObj, targetIp: records[0].address };
    }

    try {
      const targetUrl = (req.headers["x-target-url"] as string) || req.body?.url;
      if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.length > 2048) {
        return res.status(400).json({ error: "Missing or invalid x-target-url header or url in request body" });
      }

      const { urlObj, targetIp } = await assertUrlSafe(targetUrl);

      const isBodyConfig = req.body && req.body.url && req.body.method;
      const rawMethod = (isBodyConfig ? req.body.method : req.method) || 'GET';
      const method = String(rawMethod).toUpperCase();
      if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method)) {
        return res.status(400).json({ error: 'Unsupported HTTP method' });
      }
      const clientHeaders = (isBodyConfig && typeof req.body.headers === 'object' && req.body.headers) || {};

      const headers: Record<string, any> = { ...req.headers, ...clientHeaders };

      // Strip headers that must never be forwarded (credential relay / request smuggling).
      const STRIP = [
        'host', 'content-length', 'transfer-encoding', 'connection',
        'x-target-url', 'authorization', 'cookie', 'set-cookie',
        'proxy-authorization', 'proxy-authenticate', 'proxy-connection',
      ];
      for (const h of STRIP) delete headers[h];

      let data = isBodyConfig
        ? req.body.body
        : (req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined);

      let isGrpcRequest = false;
      if (headers["x-grpc-protobuf-base64"] === "true") {
        isGrpcRequest = true;
        if (typeof data === "string") {
          data = Buffer.from(data, "base64");
        }
        delete headers["x-grpc-protobuf-base64"];
      }

      // Upstream proxy config (user's own egress proxy). Validate to avoid
      // turning this endpoint into an unrestricted relay.
      const proxyConfig = req.body?.proxyConfig;
      let httpsAgent: any = undefined;
      let httpAgent: any = undefined;

      // Pin DNS: every connection (including redirects) resolves through this
      // lookup, which only ever returns the pre-validated IP.
      const pinnedLookup = (hostname: string, options: any, callback: any) => {
        if (hostname === urlObj.hostname && targetIp) {
          const family = targetIp.includes(':') ? 6 : 4;
          callback(null, targetIp, family);
        } else {
          // Redirects to a different host go through full re-validation below
          // via beforeRedirect; anything else is denied.
          callback(new Error('DNS resolution denied by SSRF policy'));
        }
      };

      if (proxyConfig && proxyConfig.enabled && proxyConfig.url) {
        const proxyUrl = String(proxyConfig.url).includes('://') ? String(proxyConfig.url) : `${proxyConfig.protocol}://${proxyConfig.url}`;
        let pUrlObj: URL;
        try {
          pUrlObj = new URL(proxyUrl);
        } catch {
          return res.status(400).json({ error: 'Invalid proxyConfig.url' });
        }
        if (pUrlObj.protocol !== 'http:' && pUrlObj.protocol !== 'https:' && pUrlObj.protocol !== 'socks5:') {
          return res.status(400).json({ error: 'Unsupported proxy protocol' });
        }

        if (proxyConfig.useAuth && proxyConfig.username) {
          pUrlObj.username = String(proxyConfig.username);
          pUrlObj.password = String(proxyConfig.password || '');
        }

        if (proxyConfig.protocol === 'socks5') {
          httpsAgent = new SocksProxyAgent(pUrlObj.toString());
          httpAgent = new SocksProxyAgent(pUrlObj.toString());
        } else {
          httpsAgent = new HttpsProxyAgent(pUrlObj.toString());
          httpAgent = new HttpsProxyAgent(pUrlObj.toString());
        }
      } else {
        httpAgent = new http.Agent({ lookup: pinnedLookup });
        httpsAgent = new https.Agent({ lookup: pinnedLookup });
      }

      const config: any = {
        method,
        url: targetUrl,
        headers,
        data,
        validateStatus: () => true, // resolve promise for any status code
        httpsAgent,
        httpAgent,
        proxy: false, // Disable axios default proxy handling when using custom agents
        maxRedirects: 0, // Never follow redirects blindly — each hop is re-validated below
        timeout: 30000,
        maxBodyLength: 10 * 1024 * 1024,
        maxContentLength: 10 * 1024 * 1024,
      };

      if (isGrpcRequest) {
        config.responseType = 'arraybuffer';
      }

      // Manual redirect loop: max 3 hops, every Location re-validated with the
      // same SSRF policy (kills redirect-to-internal bypasses).
      let response: any = null;
      let currentUrl = targetUrl;
      let currentIp = targetIp;
      for (let hop = 0; hop <= 3; hop++) {
        response = await axios({ ...config, url: currentUrl });
        const status = response.status;
        if (status < 300 || status > 399) break;
        const location = response.headers?.location;
        if (!location || hop === 3) {
          if (!location) break;
          return res.status(502).json({ error: 'Too many redirects (max 3)' });
        }
        let nextUrl: string;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          return res.status(502).json({ error: 'Invalid redirect location' });
        }
        try {
          const checked = await assertUrlSafe(nextUrl);
          currentUrl = nextUrl;
          currentIp = checked.targetIp;
          // Re-pin DNS to the new hop's validated IP.
          const hopIp = checked.targetIp;
          const hopLookup = (hostname: string, options: any, callback: any) => {
            if (hostname === checked.urlObj.hostname) {
              callback(null, hopIp, hopIp.includes(':') ? 6 : 4);
            } else {
              callback(new Error('DNS resolution denied by SSRF policy'));
            }
          };
          if (!proxyConfig?.enabled) {
            config.httpAgent = new http.Agent({ lookup: hopLookup });
            config.httpsAgent = new https.Agent({ lookup: hopLookup });
          }
          void currentIp;
        } catch (e: any) {
          return res.status(e?.status || 403).json({
            error: e?.message || 'Redirect target blocked by SSRF policy',
            ...(e?.suggestion ? { suggestion: e.suggestion } : {}),
          });
        }
      }
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Forward a safe subset of response headers (never hop-by-hop or cookies).
      const HOP_BY_HOP = new Set([
        'transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate',
        'proxy-authorization', 'te', 'trailer', 'upgrade', 'set-cookie',
      ]);
      Object.entries(response.headers || {}).forEach(([key, value]) => {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
          res.setHeader(key, value as any);
        }
      });

      const responseData = response.data;
      const isBufferResponse = Buffer.isBuffer(responseData) || responseData instanceof ArrayBuffer;
      const dataToSend = isBufferResponse ? Buffer.from(responseData).toString("base64") : responseData;
      const size = isBufferResponse ? Buffer.from(responseData).length : (typeof responseData === 'string' ? Buffer.byteLength(responseData) : JSON.stringify(responseData).length);

      res.json({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: dataToSend,
        isBase64: isBufferResponse,
        timeMs: Math.round(totalTime),
        size: size,
        timings: {
          total: Math.round(totalTime)
        }
      });
    } catch (error: any) {
      const endTime = performance.now();
      res.status(500).json({
        error: "Proxy Request Failed",
        code: error.code,
        timeMs: Math.round(endTime - startTime)
      });
    }
  });

  // Mock server rate limiting map
  const mockRateLimits = new Map<string, { count: number, resetTime: number }>();

  function isRateLimited(mockId: string, limit: number): boolean {
    const now = Date.now();
    let record = mockRateLimits.get(mockId);
    
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + 60000 }; // 1 minute window
      mockRateLimits.set(mockId, record);
      return false;
    }
    
    record.count++;
    return record.count > limit;
  }

  // Dynamic Mock Server Endpoints (Collections)
  app.all("/mock/collection/:collectionId*", async (req, res) => {
    const collectionId = (req.params as any).collectionId || (req.params as any)["collectionId*"];
    if (!collectionId) {
      return res.status(400).json({ error: "Missing collectionId in path" });
    }

    // Capture the subpath
    const fullPath = req.path;
    let subpath = fullPath.replace(new RegExp(`^/mock/collection/${collectionId}`), "");
    if (!subpath.startsWith("/")) subpath = "/" + subpath;
    if (subpath.length > 1 && subpath.endsWith("/")) subpath = subpath.slice(0, -1);

    try {
      const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    });
    
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const mockConfig: any = collection.mockConfig || { enabled: false };

      if (!mockConfig.enabled) {
        return res.status(403).json({ error: "Mock API is disabled for this collection" });
      }

      // API Key Enforcement
      if (mockConfig.apiKey?.enabled) {
        const providedKey = req.headers["x-api-key"] || req.query.apiKey;
        if (!providedKey || providedKey !== mockConfig.apiKey.key) {
          return res.status(401).json({ 
            error: "Unauthorized. Valid X-API-Key header or apiKey query parameter required for this collection.",
            documentation: "Check your Collection -> Documentation -> Mock Settings for the correct key."
          });
        }
      }

      // Check Rate Limit
      if (mockConfig.rateLimit?.enabled) {
        const limit = Number(mockConfig.rateLimit.requestsPerMinute) || 60;
        if (isRateLimited(collectionId, limit)) {
          return res.status(429).json({ error: "Too many requests. Rate limit exceeded." });
        }
      }

      const requests = (collection.requests as any) || [];
      
      const getPathFromUrl = (urlStr: string) => {
        try {
          if (!urlStr) return "/";
          let cleaned = urlStr.replace(/\{\{[^}]+\}\}/g, "");
          if (!cleaned.startsWith("http") && !cleaned.startsWith("/")) cleaned = "/" + cleaned;
          const u = new URL(cleaned, "http://dummy.com");
          let p = u.pathname;
          if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
          return p;
        } catch (e) { return urlStr || "/"; }
      };

      const matchingRequest = requests.find((r: any) => {
        const sameMethod = r.method.toUpperCase() === req.method.toUpperCase();
        const rPath = getPathFromUrl(r.url);
        return sameMethod && rPath === subpath;
      });

      if (!matchingRequest) {
        return res.status(404).json({
          error: `No mock route found for [${req.method}] "${subpath}"`,
          availableRoutes: requests.map((r: any) => `[${r.method}] ${getPathFromUrl(r.url)}`)
        });
      }

      if (matchingRequest.mockResponse && matchingRequest.mockResponse.enabled === false) {
        return res.status(403).json({
          error: `Mock route for [${req.method}] "${subpath}" is currently disabled.`
        });
      }

      const mockRes = matchingRequest.mockResponse || {
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        body: JSON.stringify({ message: `Mock response for ${matchingRequest.name}` })
      };

      if (mockRes.headers && Array.isArray(mockRes.headers)) {
        mockRes.headers.forEach((h: any) => {
          if (h.enabled && h.key && h.value) res.setHeader(h.key, h.value);
        });
      } else {
        res.setHeader("Content-Type", "application/json");
      }

      const sendResponse = () => {
        res.status(Number(mockRes.status) || 200);
        try {
          const parsedBody = JSON.parse(mockRes.body);
          res.json(parsedBody);
        } catch (e) {
          res.send(mockRes.body);
        }
      };

      if (mockConfig.latencyMs && mockConfig.latencyMs > 0) {
        setTimeout(sendResponse, mockConfig.latencyMs);
      } else {
        sendResponse();
      }
    } catch (err: any) {
      console.error("Mock API Router Error:", err);
      res.status(500).json({ error: "Internal Mock Server Error", details: err.message });
    }
  });

  // Dynamic Mock Server Endpoints (Deployments)
  app.all("/mock/:deployId*", async (req, res) => {
    const deployId = (req.params as any).deployId || (req.params as any)["deployId*"];
    if (!deployId) {
      return res.status(400).json({ error: "Missing deployId in path" });
    }

    // Capture the subpath
    const fullPath = req.path; // e.g. "/mock/abc123v1/users" or "/mock/abc123v1"
    let subpath = fullPath.replace(new RegExp(`^/mock/${deployId}`), "");
    if (!subpath.startsWith("/")) {
      subpath = "/" + subpath;
    }
    // Remove trailing slash for consistency
    if (subpath.length > 1 && subpath.endsWith("/")) {
      subpath = subpath.slice(0, -1);
    }

    try {
      // Fetch deployment from database
      const deployment = await prisma.deployment.findUnique({
      where: { id: deployId }
    });
    
      if (!deployment) {
        return res.status(404).json({ error: `Mock Deployment with ID "${deployId}" not found` });
      }

      const mockConfig: any = deployment.mockConfig || { enabled: true };

      // 1. API Key Enforcement
      if (mockConfig.apiKey?.enabled) {
        const providedKey = req.headers["x-api-key"] || req.query.apiKey;
        if (!providedKey || providedKey !== mockConfig.apiKey.key) {
          return res.status(401).json({ 
            error: "Unauthorized. Valid X-API-Key header or apiKey query parameter required.",
            documentation: "Contact the collection owner for access keys."
          });
        }
      }

      // 2. Rate Limiting Enforcement
      if (mockConfig.rateLimit?.enabled) {
        const limit = Number(mockConfig.rateLimit.requestsPerMinute) || 60;
        if (isRateLimited(deployId, limit)) {
          return res.status(429).json({ error: "Too many requests. Rate limit exceeded for this mock server." });
        }
      }

      const requests = (deployment.requests as any) || [];
      
      // Clean up helper to extract path
      const getPathFromUrl = (urlStr: string) => {
        try {
          if (!urlStr) return "/";
          // Replace environment variable placeholders like {{baseUrl}} with empty string
          let cleaned = urlStr.replace(/\{\{[^}]+\}\}/g, "");
          if (!cleaned.startsWith("http") && !cleaned.startsWith("/")) {
            cleaned = "/" + cleaned;
          }
          const u = new URL(cleaned, "http://dummy.com");
          let p = u.pathname;
          if (p.length > 1 && p.endsWith("/")) {
            p = p.slice(0, -1);
          }
          return p;
        } catch (e) {
          return urlStr || "/";
        }
      };

      const matchingRequest = requests.find((r: any) => {
        const sameMethod = r.method.toUpperCase() === req.method.toUpperCase();
        const rPath = getPathFromUrl(r.url);
        return sameMethod && rPath === subpath;
      });

      if (!matchingRequest) {
        return res.status(404).json({
          error: `No mock route found for [${req.method}] "${subpath}"`,
          deployment: {
            id: deployId,
            collectionName: deployment.collectionName,
            version: deployment.version
          },
          availableRoutes: requests.map((r: any) => `[${r.method}] ${getPathFromUrl(r.url)}`)
        });
      }

      if (matchingRequest.mockResponse && matchingRequest.mockResponse.enabled === false) {
        return res.status(403).json({
          error: `Mock route for [${req.method}] "${subpath}" is currently disabled.`
        });
      }

      // Return the mock response
      const mockRes = matchingRequest.mockResponse || {
        status: 200,
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        body: JSON.stringify({ message: `Mock response for ${matchingRequest.name}` })
      };

      // Set headers
      if (mockRes.headers && Array.isArray(mockRes.headers)) {
        mockRes.headers.forEach((h: any) => {
          if (h.enabled && h.key && h.value) {
            res.setHeader(h.key, h.value);
          }
        });
      } else {
        res.setHeader("Content-Type", "application/json");
      }

      res.status(Number(mockRes.status) || 200);

      // Try JSON, fallback to raw text
      try {
        const parsedBody = JSON.parse(mockRes.body);
        res.json(parsedBody);
      } catch (e) {
        res.send(mockRes.body);
      }
    } catch (err: any) {
      console.error("Mock API Router Error:", err);
      res.status(500).json({ error: "Internal Mock Server Error", details: err.message });
    }
  });

  // Vite middleware or static serving (skipped in backend-only mode)
  if (process.env.BACKEND_ONLY === "true") {
    console.log("Running in BACKEND_ONLY mode. Skipping frontend static file serving/Vite integration.");
    app.get("/", (req, res) => {
      res.json({ status: "ok", mode: "backend-only", message: "OpenPost API Backend is active" });
    });
  } else {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      // Packaged dist path resolves relative to the app root, not cwd
      // (cwd is the userData dir under Electron).
      const distCandidates = [
        path.join(APP_ROOT, "dist"),
        path.join(process.cwd(), "dist"),
      ];
      const distPath = distCandidates.find((c) => fs.existsSync(c)) || distCandidates[0];
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  // 404 for unknown API routes (the SPA fallback above only serves GET *).
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler: never leak stack traces or internal messages to
  // clients. Log server-side, return a generic 500.
  // (Must be registered after all routes — Express detects it by arity.)
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[unhandled-error]', err?.message || err);
    if (res.headersSent) return;
    const status = typeof err?.status === 'number' ? err.status : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : err?.message || 'Request failed' });
  });

  app.listen(Number(PORT) || 3000, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
