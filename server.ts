import "./server/src/env";
// Validate security-critical config FIRST (fail-fast in production).
import "./server/src/config";
import express from "express";
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
import { z } from "zod";

// New Prisma Routes
import workspaceRoutes from './server/src/routes/workspace.routes';
import collectionRoutes from './server/src/routes/collection.routes';
import environmentRoutes from './server/src/routes/environment.routes';
import deploymentRoutes from './server/src/routes/deployment.routes';
import userRoutes from './server/src/routes/user.routes';
import authRoutes from './server/src/routes/auth.routes';
import commentRoutes from './server/src/routes/comment.routes';
import versionRoutes from './server/src/routes/version.routes';
import monitorRoutes from './server/src/routes/monitor.routes';
import workflowRoutes from './server/src/routes/workflow.routes';
import adminRoutes from './server/src/routes/admin.routes';
import { prisma } from './server/src/db';
import { requireAuth } from './server/src/middleware/auth';
import { rateLimiter } from './server/src/middleware/rateLimiter';
import { meter } from './server/src/services/usage.service';
import { getUsage } from './server/src/services/usage.service';

function meterProxyCall(req: any): void {
  const userId = req?.user?.uid || req?.user?.userId;
  meter(userId, 'proxy_call').catch(() => {});
}

function meterAiCall(req: any): void {
  const userId = req?.user?.uid || req?.user?.userId;
  meter(userId, 'ai_call').catch(() => {});
}

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
  // Trust X-Forwarded-For when behind proxy (correct rateLimit req.ip). One hop only.
  app.set('trust proxy', 1);

  // Dev server must always run on port 3000 per AI Studio environment constraints
  const PORT = process.env.PORT || 3000;

  // SECURITY headers (CSP, HSTS, X-Frame-Options, noSniff, ...).
  // Google sign-in scripts are allow-listed so GIS login keeps working.
  // NOTE: helmet CSP is production-only. In dev, Vite injects an inline
  // `<script type="module">` preamble (react-refresh) plus /@vite/client HMR
  // over ws:. The production CSP below has no 'unsafe-inline'/'unsafe-eval'
  // in scriptSrc and no ws: in connectSrc, so it blocks that preamble —
  // window.$RefreshReg$ is never set and every transformed module throws
  // "@vitejs/plugin-react can't detect preamble. Something is wrong."
  if (process.env.NODE_ENV === "production") {
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
  } else {
    // Dev: keep basic hardening but leave CSP off so Vite HMR works.
    app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  }
  app.disable('x-powered-by');

  // Restrict CORS instead of reflecting any origin.
  // Set CORS_ORIGINS (comma-separated, e.g. "https://app.example.com,https://admin.example.com")
  // when the public DNS differs from APP_URL; APP_URL alone is the default.
  const normalizeOrigin = (s: string): string => {
    const t = s.trim().replace(/\/+$/, '');
    try {
      const u = new URL(t);
      return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}`;
    } catch {
      return t;
    }
  };
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  console.log(`[cors] allowed origins: ${allowedOrigins.join(', ') || '(none)'}`);
  app.use(
    cors({
      origin: (origin, cb) => {
        // Same-origin / non-browser (curl, Electron) have no Origin header.
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(normalizeOrigin(origin))) return cb(null, true);
        console.warn(`[cors] blocked origin: ${origin} (set CORS_ORIGINS or APP_URL to allow it)`);
        return cb(new Error('CORS: origin not allowed'));
      },
      credentials: true,
    })
  );
  // Request bodies: 1MB default (raises DoS cost); import endpoints that need
  // more should set their own limit explicitly.
  // Exception: avatar upload carries a base64 image (up to 2 MB binary ≈
  // 2.8 MB JSON), so that single route gets a 4 MB limit. The controller
  // still enforces the 2 MB decoded-image cap.
  const jsonParser = express.json({ limit: "1mb" });
  const avatarJsonParser = express.json({ limit: "4mb" });
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.path === '/api/users/avatar') {
      return avatarJsonParser(req, res, next);
    }
    return jsonParser(req, res, next);
  });

  // Mount Prisma API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/collections', collectionRoutes);
  app.use('/api/environments', environmentRoutes);
  app.use('/api/deployments', deploymentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/versions', versionRoutes);
  app.use('/api/monitors', monitorRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/admin', adminRoutes);

  // AI helpers — provider/model/key/baseUrl can be overridden per-request from Settings → AI (aiConfig), fallback env.
  // Providers: gemini, openai, ollama (local), custom (any OpenAI-compatible baseUrl)
  // P0 SSRF hardening: provider allowlist, model/apiKey/baseUrl length caps, baseUrl
  // validated via SSRF guard (reuse server/src/services/ssrf) before any server-side fetch.
  const AI_ALLOWED_PROVIDERS = new Set(['gemini','openai','ollama','custom']);
  function resolveAi(req) {
    const cfg = req.body?.aiConfig || {};
    let provider = String(cfg.provider || process.env.AI_PROVIDER || "gemini").toLowerCase().trim();
    if (!AI_ALLOWED_PROVIDERS.has(provider)) return { provider, model: '', apiKey: '', baseUrl: '', error: 'Invalid AI provider. Allowed: gemini, openai, ollama, custom.' };
    const defaultModel = provider === "openai" ? "gpt-4o-mini" : provider === "ollama" ? "llama3.2" : provider === "custom" ? "gpt-4o-mini" : "gemini-1.5-flash";
    let model = String(cfg.model || process.env.AI_MODEL || defaultModel).trim();
    if (!model) model = defaultModel;
    if (model.length > 64) return { provider, model: '', apiKey: '', baseUrl: '', error: 'AI model name too long (max 64).' };
    const rawBaseUrl = String(cfg.baseUrl || process.env.AI_BASE_URL || (provider === "ollama" ? process.env.OLLAMA_BASE_URL : process.env.CUSTOM_AI_BASE_URL) || "").trim().replace(/\/+$/, "");
    let apiKey = String(cfg.apiKey || (provider === "openai" ? process.env.OPENAI_API_KEY : provider === "custom" ? process.env.CUSTOM_AI_API_KEY : provider === "ollama" ? process.env.OLLAMA_API_KEY : process.env.GEMINI_API_KEY) || "").trim();
    if (apiKey.length > 512) return { provider, model: '', apiKey: '', baseUrl: '', error: 'AI API key too long.' };
    if (rawBaseUrl.length > 2048) return { provider, model: '', apiKey: '', baseUrl: '', error: 'AI baseUrl too long.' };
    // Pre-validate baseUrl syntax early (no fetch yet). Full SSRF DNS check happens in callAi.
    if (rawBaseUrl) {
      try {
        const u = new URL(rawBaseUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return { provider, model: '', apiKey: '', baseUrl: '', error: 'AI baseUrl must be http(s).' };
        if (u.username || u.password) return { provider, model: '', apiKey: '', baseUrl: '', error: 'AI baseUrl must not contain credentials.' };
        if (!u.hostname) return { provider, model: '', apiKey: '', baseUrl: '', error: 'Invalid AI baseUrl.' };
      } catch { return { provider, model: '', apiKey: '', baseUrl: '', error: 'Invalid AI baseUrl.' }; }
    }
    const baseUrl = rawBaseUrl || (provider === "ollama" ? "http://localhost:11434" : "");
    if (provider === "ollama" || provider === "custom") {
      if (!baseUrl) return { provider, model, apiKey, baseUrl: "", error: provider === "ollama" ? "Ollama base URL not set. Set Settings → AI baseUrl (e.g. http://localhost:11434) or env OLLAMA_BASE_URL." : "Custom provider base URL not set. Set Settings → AI baseUrl (e.g. http://localhost:1234/v1) or env CUSTOM_AI_BASE_URL." };
      return { provider, model, apiKey, baseUrl };
    }
    if (!apiKey) return { provider, model, apiKey: "", baseUrl, error: provider === "openai" ? "OpenAI API key is not configured. Set it in Settings → AI or env OPENAI_API_KEY." : "Gemini API key is not configured. Set it in Settings → AI or env GEMINI_API_KEY." };
    // openai with optional custom baseUrl — if supplied it will be SSRF-checked in callAi
    return { provider, model, apiKey, baseUrl };
  }
  async function assertAiBaseUrlSafe(rawUrl: string, allowLocal: boolean) {
    // Reuse SSRF guard — blocks IMDS 169.254.169.254/100.100.100.100, private ranges, .internal/.local etc.
    // For ollama/custom we allow loopback (localhost/127.0.0.1/::1) which assertUrlSafe normally blocks.
    // Loopback is gated by ALLOW_AI_LOCAL: default 1 in dev (ollama local), 0 in production if explicitly set.
    const allowLocalEffective = allowLocal && (process.env.ALLOW_AI_LOCAL !== '0');
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === '::ffff:127.0.0.1';
    if (isLoopback) {
      if (!allowLocalEffective) throw Object.assign(new Error('Access to local network via AI baseUrl is blocked. Set ALLOW_AI_LOCAL=1 to allow.'), { status: 403 });
      // Still block IMDS literal even when loopback allowed — belt and suspenders
      const { BLOCKED_IPS } = await import('./server/src/services/ssrf');
      if (BLOCKED_IPS.has(host) || BLOCKED_IPS.has(u.hostname)) throw Object.assign(new Error('SSRF Protection: metadata IP blocked'), { status: 403 });
      return;
    }
    const { assertUrlSafe } = await import('./server/src/services/ssrf');
    await assertUrlSafe(rawUrl);
  }
  async function callAi(provider, model, apiKey, baseUrl, prompt) {
    // SSRF check for any user-controlled baseUrl before server-side fetch
    if (provider === "ollama") {
      const raw = (baseUrl || "http://localhost:11434").replace(/\/+$/, "");
      await assertAiBaseUrlSafe(raw, true);
      const url = raw + "/api/chat";
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000);
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}) }, body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false }), redirect: 'error', signal: ctrl.signal as any });
        if (!r.ok) { const tt = await r.text(); throw new Error("Ollama " + r.status + ": " + tt.slice(0, 600)); }
        const j: any = await r.json();
        return j.message?.content || j.response || "";
      } finally { clearTimeout(t); }
    }
    if (provider === "custom" || provider === "openai") {
      const rawBase = provider === "openai" && !baseUrl ? "https://api.openai.com/v1" : (baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
      // Only SSRF-check when baseUrl is user-supplied (custom or openai override). Default openai is trusted.
      const isDefaultOpenAi = provider === "openai" && !baseUrl;
      if (!isDefaultOpenAi) await assertAiBaseUrlSafe(rawBase, true);
      const url = rawBase + "/chat/completions";
      const headers: Record<string,string> = { "Content-Type": "application/json" };
      if (apiKey) headers.Authorization = "Bearer " + apiKey;
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000);
      try {
        const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.4 }), redirect: 'error', signal: ctrl.signal as any });
        if (!r.ok) { const tt = await r.text(); throw new Error((provider === "custom" ? "Custom" : "OpenAI") + " " + r.status + ": " + tt.slice(0, 600)); }
        const j: any = await r.json();
        return j.choices?.[0]?.message?.content || "";
      } finally { clearTimeout(t); }
    }
    const ai = new GoogleGenAI({ apiKey });
    const r: any = await ai.models.generateContent({ model, contents: prompt });
    return r.text || "";
  }
  function redactAiError(msg: string): string {
    // Never echo apiKey back to client or logs — redact bearer-like tokens
    return String(msg || '').replace(/sk-[A-Za-z0-9-_]{10,}/g, 'sk-***').replace(/AIza[0-9A-Za-z-_]{20,}/g, 'AIza***').slice(0, 800);
  }
  // P2: zod validation for AI inputs (uses already-installed zod, no new dep)
  const aiConfigZ = z.object({
    provider: z.enum(['gemini','openai','ollama','custom']).optional(),
    model: z.string().max(64).optional(),
    baseUrl: z.string().max(2048).optional(),
    apiKey: z.string().max(512).optional(),
  }).passthrough().optional();
  const genTestsZ = z.object({
    method: z.string().min(1).max(16),
    url: z.string().min(1).max(2048),
    status: z.number().int().min(100).max(599),
    responseBody: z.any().optional(),
    aiConfig: aiConfigZ,
  }).passthrough();
  const genCodeZ = z.object({
    requestConfig: z.object({ url: z.string().max(2048), method: z.string().max(16).optional(), headers: z.any().optional(), params: z.any().optional(), body: z.any().optional() }).passthrough(),
    language: z.string().max(32).optional(),
    aiConfig: aiConfigZ,
  }).passthrough();
  const genDocsZ = z.object({
    collectionName: z.string().min(1).max(200),
    folders: z.array(z.any()).optional(),
    requests: z.array(z.any()).optional(),
    targetType: z.enum(['collection','folder','request']).optional(),
    targetName: z.string().max(200).optional(),
    aiConfig: aiConfigZ,
  }).passthrough();
  // P2: monthly AI quota (env AI_MONTHLY_LIMIT, default 200/board, 0=unlimited)
  const AI_MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT || 200);
  async function checkAiQuota(req: any, res: any, next: any) {
    if (!AI_MONTHLY_LIMIT || AI_MONTHLY_LIMIT <= 0) return next();
    try {
      const uid = req.user?.uid || req.user?.userId;
      if (!uid) return next();
      const u = await getUsage(uid);
      const used = (u as any)?.totals?.ai_call || 0;
      if (used >= AI_MONTHLY_LIMIT) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(429).json({ error: `AI monthly quota exceeded (${used}/${AI_MONTHLY_LIMIT}). Try next month or contact admin.` });
      }
    } catch {}
    return next();
  }

  // AI: generate pm.* test assertions from a real response (PRD #56).
  app.post("/api/generate-tests", requireAuth, rateLimiter(10), checkAiQuota, async (req, res) => {
    try {
      const parsed = genTestsZ.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      const { method, url, status, responseBody } = parsed.data as any;

      const aiCfg = resolveAi(req);
      if (aiCfg.error) { res.setHeader("Cache-Control", "no-store"); return res.status(500).json({ error: aiCfg.error }); }
      let bodyPreview = '';
      try {
        const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
        bodyPreview = JSON.stringify(parsed).slice(0, 3000);
      } catch {
        bodyPreview = String(responseBody || '').slice(0, 3000);
      }

      const prompt = `Generate Postman-style test assertions (pm.* JavaScript) for the following HTTP response.
Return ONLY raw JavaScript code, no markdown fences, no explanations.

Rules:
- Use pm.test("description", function () { ... }) blocks.
- Use pm.expect(...).to.equal / .to.be.a / .to.be.below / .to.include etc.
- Available: pm.response.code, pm.response.json(), pm.response.text(), pm.response.responseTime.
- Generate 3-6 meaningful assertions: status code, key fields existence and types, and a response-time check under 2000ms.
- Do not invent fields not present in the body.

Request: ${method} ${url}
Status: ${status}
Body: ${bodyPreview}
`;

      let script = await callAi(aiCfg.provider, aiCfg.model, aiCfg.apiKey, aiCfg.baseUrl, prompt);
      script = script.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
      meterAiCall(req);
      res.setHeader("Cache-Control", "no-store");
      res.json({ script });
    } catch (error: any) {
      console.error("Test generation error:", redactAiError(error?.message || String(error)));
      res.setHeader("Cache-Control", "no-store");
      res.status(500).json({ error: redactAiError(error.message || "Failed to generate tests") });
    }
  });

  // NOTE: auth is required — these burn paid quota (PRD #58).
  app.post("/api/generate-code", requireAuth, rateLimiter(10), checkAiQuota, async (req, res) => {
    try {
      const parsed = genCodeZ.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      const { requestConfig, language } = parsed.data as any;

      const aiCfg2 = resolveAi(req);
      if (aiCfg2.error) { res.setHeader("Cache-Control", "no-store"); return res.status(500).json({ error: aiCfg2.error }); }
      const prompt = `Convert the following HTTP request to ${language || 'a curl command'} code.
Return ONLY the raw code block with no markdown formatting. Do not wrap in \`\`\`.

Request URL: ${requestConfig.url}
Method: ${requestConfig.method}
Headers: ${JSON.stringify(requestConfig.headers || [])}
Params: ${JSON.stringify(requestConfig.params || [])}
Body: ${JSON.stringify(requestConfig.body || {})}
`;

      let code = await callAi(aiCfg2.provider, aiCfg2.model, aiCfg2.apiKey, aiCfg2.baseUrl, prompt);
      code = code.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
      meterAiCall(req);
      res.setHeader("Cache-Control", "no-store");
      res.json({ code });
    } catch (error: any) {
      console.error("Code generation error:", redactAiError(error?.message || String(error)));
      res.setHeader("Cache-Control", "no-store");
      res.status(500).json({ error: redactAiError(error.message || "Failed to generate code") });
    }
  });

  app.post("/api/collections/generate-docs", requireAuth, rateLimiter(10), checkAiQuota, async (req, res) => {
    try {
      const parsed = genDocsZ.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      const { collectionName, folders, requests, targetType, targetName } = parsed.data as any;

      const aiCfg3 = resolveAi(req);
      if (aiCfg3.error) { res.setHeader("Cache-Control", "no-store"); return res.status(500).json({ error: aiCfg3.error }); }

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

      const markdown = (await callAi(aiCfg3.provider, aiCfg3.model, aiCfg3.apiKey, aiCfg3.baseUrl, prompt)) || "";
      meterAiCall(req);
      res.setHeader("Cache-Control", "no-store");
      res.json({ markdown });
    } catch (error: any) {
      console.error("Documentation generation error:", redactAiError(error?.message || String(error)));
      res.setHeader("Cache-Control", "no-store");
      res.status(500).json({ error: redactAiError(error.message || "Failed to generate documentation") });
    }
  });

  // Current-month usage for the authenticated user (PRD #58).
  app.get("/api/usage/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.uid || (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      res.json(await getUsage(userId, String(req.query.month || '')));
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch usage' });
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

    // Fallback to agent/desktop-agent.cjs source if requesting the script
    let downloadName = filename;
    if (!filePath && filename.includes("desktop-agent")) {
      const fallbackCandidates = [
        path.join(APP_ROOT, "agent", "desktop-agent.cjs"),
        path.join(process.cwd(), "agent", "desktop-agent.cjs"),
      ];
      filePath = fallbackCandidates.find((c) => fs.existsSync(c)) || "";
      if (filePath) {
        downloadName = "desktop-agent.cjs";
      }
    }

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      if (downloadName.endsWith('.exe')) {
        res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
      } else if (downloadName.endsWith('.js') || downloadName.endsWith('.cjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      return res.sendFile(filePath);
    }
    
    // Fallback script if binary not found
    const fallbackCandidates = [
      path.join(APP_ROOT, "agent", "desktop-agent.cjs"),
      path.join(process.cwd(), "agent", "desktop-agent.cjs"),
    ];
    const fallbackScript = fallbackCandidates.find((c) => fs.existsSync(c)) || fallbackCandidates[0];
    if (fs.existsSync(fallbackScript)) {
      res.setHeader('Content-Disposition', `attachment; filename="desktop-agent.cjs"`);
      res.setHeader('Content-Type', 'application/javascript');
      return res.sendFile(fallbackScript);
    }

    return res.status(404).json({ error: "Agent file not found" });
  });

  // The proxy endpoint - Rate limited to 60 req/min per user
  app.all("/api/proxy", requireAuth, rateLimiter(60), async (req, res) => {
    const startTime = performance.now();

    // SSRF guards live in server/src/services/ssrf.ts (shared with monitors,
    // covered by server/tests/security.test.ts).
    const { assertUrlSafe, createPinnedLookup } = await import('./server/src/services/ssrf');

    try {
      const targetUrl = (req.headers["x-target-url"] as string) || req.body?.url;
      if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.length > 2048) {
        return res.status(400).json({ error: "Missing or invalid x-target-url header or url in request body" });
      }

      let urlObj: URL;
      let targetIp: string;
      try {
        ({ urlObj, targetIp } = await assertUrlSafe(targetUrl));
      } catch (e: any) {
        return res.status(e?.status || 403).json({
          error: e?.message || 'Target blocked by SSRF policy',
          ...(e?.suggestion ? { suggestion: e.suggestion } : {}),
        });
      }

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
      const pinnedLookup = createPinnedLookup(urlObj.hostname, targetIp);

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
          const hopLookup = createPinnedLookup(checked.urlObj.hostname, checked.targetIp);
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

      // Usage metering (PRD #58): fire-and-forget, never blocks the response.
      meterProxyCall(req);

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
        appType: "custom",
      });
      app.use(vite.middlewares);
      // SPA fallback with explicit index.html transform. In middlewareMode
      // Vite does NOT serve index.html automatically — without
      // transformIndexHtml the @vitejs/plugin-react preamble
      // (window.$RefreshReg$) is never injected and every React module
      // throws "can't detect preamble. Something is wrong."
      // Skip API/mock/downloads so they never get HTML.
      app.use(async (req, res, next) => {
        try {
          if (req.method !== 'GET') return next();
          const url = req.originalUrl.split('?')[0];
          if (
            url.startsWith('/api/') ||
            url.startsWith('/mock/') ||
            url.startsWith('/downloads/') ||
            url.startsWith('/@') ||
            url.startsWith('/src/') ||
            url.startsWith('/node_modules/') ||
            /\.\w+$/.test(url)
          ) {
            return next();
          }
          let template = fs.readFileSync(path.join(APP_ROOT, 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          (vite as any).ssrFixStacktrace?.(e as Error);
          next(e);
        }
      });
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
    // Scheduled monitors (PRD #52). Disabled in Electron desktop child
    // (OPENPOST_EMBEDDED) to avoid duplicate schedulers; opt-out via
    // DISABLE_MONITORS=1.
    if (!process.env.DISABLE_MONITORS && !process.env.OPENPOST_EMBEDDED) {
      import('./server/src/services/monitor.service').then(({ startMonitorScheduler }) => {
        startMonitorScheduler();
        console.log('[monitor] scheduler started (60s tick)');
      }).catch((e) => console.error('[monitor] scheduler failed to start:', e?.message));
    }
    // Scheduled workflows (trigger='schedule'). Same guards as monitors.
    if (!process.env.DISABLE_WORKFLOWS && !process.env.OPENPOST_EMBEDDED) {
      import('./server/src/services/workflow.service').then(({ startWorkflowScheduler }) => {
        startWorkflowScheduler();
        console.log('[workflow] scheduler started (60s tick)');
      }).catch((e) => console.error('[workflow] scheduler failed to start:', e?.message));
    }
  });
}

startServer();
