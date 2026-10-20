import axios from 'axios';
import { useStore } from '../store/useStore';
import { Workspace, ApiCollection, Environment, Deployment, CollectionVersion } from '../types';
import { syncEngine } from './syncEngine';

function getAiConfig(): Record<string,string> | undefined {
  try {
    const raw = localStorage.getItem('ai_config');
    if (!raw) return undefined;
    const c = JSON.parse(raw);
    // ollama/custom can run without key (local/baseUrl)
    if (c?.provider === 'ollama' || c?.provider === 'custom') {
      if (!c?.baseUrl && !c?.apiKey) return undefined;
      return c;
    }
    if (!c?.apiKey) return undefined;
    return c;
  } catch { return undefined; }
}

/**
 * Optimistic locking helpers (PRD #51).
 * If the record carries the `updatedAt` we last saw, send it as
 * `expectedUpdatedAt` so the server can reject stale writes with 409.
 */
function withExpectedVersion<T extends object>(payload: T): T {
  const updatedAt = (payload as Record<string, unknown>).updatedAt;
  if (typeof updatedAt === 'string') {
    return { ...payload, expectedUpdatedAt: updatedAt };
  }
  return payload;
}

/**
 * Tracks how the most recent 409 conflict was resolved, so writers that go
 * through `resolveUpdateConflict` can tell whether the server kept the local
 * payload ('local') or the cloud version ('cloud'). Read-and-clear via
 * `takeLastConflictResolution()` right after the awaited update call.
 */
let lastConflictResolution: 'local' | 'cloud' | null = null;

export function takeLastConflictResolution(): 'local' | 'cloud' | null {
  const r = lastConflictResolution;
  lastConflictResolution = null;
  return r;
}

/**
 * Open the existing ConflictResolutionModal on 409. 'Keep Cloud' resolves
 * with the server version; 'Keep Local' force-saves over it.
 */
function resolveUpdateConflict<T>(
  _kind: string,
  _id: string,
  localPayload: unknown,
  cloud: unknown,
  forceSave: (payload: Record<string, unknown>) => Promise<T>
): Promise<T> {
  const { setConflictData, setIsConflictModalOpen } = useStore.getState();
  return new Promise<T>((resolve, reject) => {
    setConflictData({
      local: localPayload,
      cloud,
      onResolve: async (resolution: 'local' | 'cloud') => {
        try {
          if (resolution === 'local') {
            const result = await forceSave({
              ...(localPayload as Record<string, unknown>),
              force: true,
            });
            lastConflictResolution = 'local';
            resolve(result);
          } else {
            lastConflictResolution = 'cloud';
            resolve(cloud as T);
          }
        } catch (e) {
          reject(e);
        }
      },
    });
    setIsConflictModalOpen(true);
  });
}

export const api = axios.create({
  baseURL: ((import.meta as any).env?.VITE_API_URL || '') + '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // If offline and trying to fetch (GET), reject early
  if (!navigator.onLine && config.method?.toLowerCase() === 'get' && !config.url?.includes('/proxy')) {
    return Promise.reject(new Error('Network Error'));
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const isNetworkError = error.message === 'Network Error' || error.code === 'ERR_NETWORK';
    
    // If it's a sync task itself that failed, just throw so processQueue handles it
    if (error.config && error.config.headers && error.config.headers['x-sync-task']) {
      return Promise.reject(error);
    }
    
    if (isNetworkError && error.config) {
      const method = error.config.method?.toLowerCase();
      // If it's a mutative request (create/update/delete)
      if (['post', 'put', 'patch', 'delete'].includes(method || '')) {
        // Skip proxy requests from being queued
        if (error.config.url?.includes('/proxy') || error.config.url?.includes('/auth')) {
          return Promise.reject(error);
        }
        
        console.log('[Offline] Queueing request:', method, error.config.url);
        
        let data = {};
        if (error.config.data) {
          try {
            data = JSON.parse(error.config.data);
          } catch {
            data = error.config.data;
          }
        }
        
        syncEngine.enqueue(method!, error.config.url!, data);
        
        // Return a mocked successful response
        return Promise.resolve({
          status: method === 'post' ? 201 : 200,
          data: data, // Echo back data to satisfy frontend optimistic updates
          config: error.config
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export const DESKTOP_AGENT_URL = 'http://127.0.0.1:8765/api/proxy';
export const DESKTOP_AGENT_PING_URL = 'http://127.0.0.1:8765/ping';
const AGENT_TOKEN_KEY = 'openpost_agent_token';

export function getAgentToken(): string {
  try {
    return localStorage.getItem(AGENT_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Headers required by the hardened Desktop Agent Bridge. Empty object in
 * cloud mode so shared call sites behave identically there.
 */
export function getDesktopAgentHeaders(targetUrl: string): Record<string, string> {
  if (useStore.getState().agentMode !== 'desktop') return {};
  const token = getAgentToken();
  return {
    'x-target-url': targetUrl,
    ...(token ? { 'x-agent-token': token } : {}),
  };
}

/** True when the bridge rejected the call due to a missing/wrong pairing token. */
export function isAgentPairingError(err: any): boolean {
  return err?.response?.status === 403;
}

export function agentPairingTroubleshooting(): string[] {
  return [
    'Copy the pairing token printed by desktop-agent.cjs and paste it into the Desktop Agent settings (token field).',
    'Click "Save" on the token, then retry the request.',
    'If you restarted the agent, the token changed — paste the new one.',
  ];
}

// ---------------------------------------------------------------------------
// Direct-mode (browser → target, no proxy) response decoding.
//
// Mirrors server/src/utils/responseDecode.ts: fetch as ArrayBuffer so binary
// payloads survive, decode text content-types back to UTF-8 (JSON parsed for
// a nicer tree), base64-encode the rest with isBase64: true so the response
// panel can render images/PDFs instead of showing mojibake.
// ---------------------------------------------------------------------------

const TEXTUAL_CT_PREFIXES = ['text/'];
const TEXTUAL_CT_SUBSTRINGS = [
  'application/json',
  'application/ld+json',
  'application/graphql',
  'application/x-www-form-urlencoded',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'application/xml',
  'application/xhtml+xml',
  'application/manifest+json',
  'application/problem+json',
  'image/svg+xml',
  '+json',
  '+xml',
];

function isTextualContentType(raw: string | null | undefined): boolean {
  const ct = String(raw || '').toLowerCase();
  if (!ct) return false;
  if (TEXTUAL_CT_PREFIXES.some((p) => ct.includes(p))) return true;
  return TEXTUAL_CT_SUBSTRINGS.some((s) => ct.includes(s));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[]
    );
  }
  return btoa(binary);
}

function tryJsonParse(text: string): any {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* malformed JSON: fall through to raw text */
  }
  return undefined;
}

export function decodeDirectResponseBody(
  buf: ArrayBuffer,
  contentType: string | null | undefined
): { data: any; isBase64: boolean } {
  const bytes = new Uint8Array(buf);
  if (bytes.length === 0) return { data: '', isBase64: false };

  const ct = String(contentType || '').toLowerCase();

  if (!ct) {
    // No content-type: trust the bytes — strict UTF-8 decode decides.
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const parsed = tryJsonParse(text);
      return { data: parsed !== undefined ? parsed : text, isBase64: false };
    } catch {
      return { data: bytesToBase64(bytes), isBase64: true };
    }
  }

  if (!isTextualContentType(ct)) {
    return { data: bytesToBase64(bytes), isBase64: true };
  }

  const text = new TextDecoder('utf-8').decode(bytes);
  if (ct.includes('json')) {
    const parsed = tryJsonParse(text);
    if (parsed !== undefined) return { data: parsed, isBase64: false };
    // Malformed JSON with a json content-type must NOT fail the request.
    return { data: text, isBase64: false };
  }
  return { data: text, isBase64: false };
}

export const apiService = {
  // Users
  async saveUser(user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) {
    const res = await api.post('/users', user);
    return res.data;
  },

  async getUser(uid: string) {
    const res = await api.get(`/users/${uid}`);
    return res.data;
  },

  // Avatar: base64 image data-URL (max 2 MB decoded), stored in User.photoURL.
  async uploadAvatar(image: string) {
    const res = await api.post('/users/avatar', { image });
    return res.data;
  },

  async deleteAvatar() {
    const res = await api.delete('/users/avatar');
    return res.data;
  },

  async changePassword(currentPassword: string, password: string) {
    const res = await api.post('/auth/change-password', { currentPassword, password });
    return res.data;
  },

  async logout() {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  async deleteAccount() {
    const res = await api.delete('/auth/account');
    return res.data;
  },

  // Workspaces — identity always comes from the auth token server-side.
  async getWorkspaces(): Promise<Workspace[]> {
    const res = await api.get('/workspaces');
    return res.data;
  },

  async createWorkspace(name: string, id?: string): Promise<Workspace> {
    const res = await api.post('/workspaces', { id, name });
    return res.data;
  },

  async updateWorkspace(id: string, name: string): Promise<Workspace> {
    const res = await api.put(`/workspaces/${id}`, { name });
    return res.data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  async getMembers(workspaceId: string): Promise<any[]> {
    const res = await api.get(`/workspaces/${workspaceId}/members`);
    return res.data;
  },

  async inviteMember(workspaceId: string, email: string, role: string = 'MEMBER'): Promise<any> {
    const res = await api.post(`/workspaces/${workspaceId}/invite`, { email, role });
    return res.data;
  },

  async updateMember(workspaceId: string, userId: string, data: { role?: string; status?: string }): Promise<any> {
    const res = await api.patch(`/workspaces/${workspaceId}/members/${userId}`, data);
    return res.data;
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  async getPendingInvitations(workspaceId: string): Promise<any[]> {
    const res = await api.get(`/workspaces/${workspaceId}/invitations`);
    return res.data;
  },

  async resendInvitation(invitationId: string): Promise<any> {
    const res = await api.post(`/workspaces/invitations/${invitationId}/resend`);
    return res.data;
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    await api.delete(`/workspaces/invitations/${invitationId}`);
  },

  async getInvitation(token: string): Promise<any> {
    const res = await api.get(`/workspaces/invitations/${token}`);
    return res.data;
  },

  async acceptInvitation(token: string, userId: string): Promise<any> {
    const res = await api.post(`/workspaces/invitations/${token}/accept`, { userId });
    return res.data;
  },

  // Collections
  async getCollections(workspaceId: string): Promise<ApiCollection[]> {
    const res = await api.get(`/collections/${workspaceId}`);
    return res.data;
  },

  async getSharedCollection(id: string, purpose: 'import' | 'doc' = 'import'): Promise<ApiCollection> {
    const res = await api.get(`/collections/shared/${id}?purpose=${purpose}`);
    return res.data;
  },

  async createCollection(collection: Partial<ApiCollection> & { workspaceId: string; name: string }): Promise<ApiCollection> {
    const res = await api.post('/collections', collection);
    return res.data;
  },

  async updateCollection(id: string, collection: Partial<ApiCollection>): Promise<ApiCollection> {
    try {
      const res = await api.put(`/collections/${id}`, withExpectedVersion(collection));
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 409 && err.response.data?.conflict) {
        return resolveUpdateConflict('collection', id, collection, err.response.data.conflict, (payload) =>
          api.put(`/collections/${id}`, payload).then((r) => r.data)
        );
      }
      throw err;
    }
  },

  async deleteCollection(id: string): Promise<void> {
    await api.delete(`/collections/${id}`);
  },

  async generateDocumentation(collectionName: string, folders: any[], requests: any[], targetType?: 'collection' | 'folder' | 'request', targetName?: string): Promise<{ markdown: string }> {
    const aiConfig = getAiConfig();
    const res = await api.post('/collections/generate-docs', { collectionName, folders, requests, targetType, targetName, ...(aiConfig ? { aiConfig } : {}) });
    return res.data;
  },

  async generateTests(payload: Record<string, unknown>): Promise<{ script: string }> {
    const aiConfig = getAiConfig();
    const res = await api.post('/generate-tests', { ...payload, ...(aiConfig ? { aiConfig } : {}) });
    return res.data;
  },

  async generateCode(payload: Record<string, unknown>): Promise<{ code: string }> {
    const aiConfig = getAiConfig();
    const res = await api.post('/generate-code', { ...payload, ...(aiConfig ? { aiConfig } : {}) });
    return res.data;
  },

  // Collection Versions & Changelog
  async getCollectionVersions(collectionId: string): Promise<CollectionVersion[]> {
    try {
      const res = await api.get(`/versions/collection/${collectionId}`);
      if (Array.isArray(res.data)) {
        localStorage.setItem(`openpost_versions_${collectionId}`, JSON.stringify(res.data));
        return res.data;
      }
    } catch (e) {
      console.warn('Failed to fetch versions from backend, falling back to local storage', e);
    }
    const cached = localStorage.getItem(`openpost_versions_${collectionId}`);
    return cached ? JSON.parse(cached) : [];
  },

  async createCollectionVersion(data: Partial<CollectionVersion> & { workspaceId: string; collectionId: string; version: string }): Promise<CollectionVersion> {
    try {
      const res = await api.post('/versions', data);
      // Update local cache
      const cached = await this.getCollectionVersions(data.collectionId);
      const updated = [res.data, ...cached.filter(v => v.id !== res.data.id)];
      localStorage.setItem(`openpost_versions_${data.collectionId}`, JSON.stringify(updated));
      return res.data;
    } catch (e) {
      console.warn('Backend unavailable, creating version locally', e);
      const localVersion: CollectionVersion = {
        id: data.id || `local_ver_${Date.now()}`,
        workspaceId: data.workspaceId,
        collectionId: data.collectionId,
        collectionName: data.collectionName || 'Collection',
        version: data.version,
        name: data.name || null,
        description: data.description || null,
        author: data.author || null,
        createdAt: new Date().toISOString(),
        folders: data.folders || [],
        requests: data.requests || [],
        mockConfig: data.mockConfig,
        tags: data.tags || ['latest'],
        diffSummary: data.diffSummary || null,
      };
      const cached = await this.getCollectionVersions(data.collectionId);
      const updated = [localVersion, ...cached];
      localStorage.setItem(`openpost_versions_${data.collectionId}`, JSON.stringify(updated));
      return localVersion;
    }
  },

  async rollbackCollectionToVersion(versionId: string): Promise<{ success: boolean; message: string; collection: ApiCollection; version: CollectionVersion }> {
    const res = await api.post(`/versions/${versionId}/rollback`);
    return res.data;
  },

  async forkCollectionVersion(versionId: string, name?: string): Promise<ApiCollection> {
    const res = await api.post(`/versions/${versionId}/fork`, { name });
    return res.data;
  },

  async deleteCollectionVersion(id: string, collectionId: string): Promise<void> {
    try {
      await api.delete(`/versions/${id}`);
    } catch (e) {
      console.warn('Failed to delete version on server', e);
    }
    const cached = await this.getCollectionVersions(collectionId);
    const updated = cached.filter(v => v.id !== id);
    localStorage.setItem(`openpost_versions_${collectionId}`, JSON.stringify(updated));
  },

  // Environments
  async getEnvironments(workspaceId: string): Promise<Environment[]> {
    const res = await api.get(`/environments/${workspaceId}`);
    return res.data;
  },

  async createEnvironment(env: Partial<Environment> & { workspaceId: string; name: string }): Promise<Environment> {
    const res = await api.post('/environments', env);
    return res.data;
  },

  async updateEnvironment(id: string, env: Partial<Environment>): Promise<Environment> {
    try {
      const res = await api.put(`/environments/${id}`, withExpectedVersion(env));
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 409 && err.response.data?.conflict) {
        return resolveUpdateConflict('environment', id, env, err.response.data.conflict, (payload) =>
          api.put(`/environments/${id}`, payload).then((r) => r.data)
        );
      }
      throw err;
    }
  },

  async deleteEnvironment(id: string): Promise<void> {
    await api.delete(`/environments/${id}`);
  },

  // Monitors (PRD #52)
  async getMonitors(workspaceId: string): Promise<any[]> {
    const res = await api.get(`/monitors/workspace/${workspaceId}`);
    return res.data;
  },
  async createMonitor(workspaceId: string, data: Record<string, unknown>): Promise<any> {
    const res = await api.post(`/monitors/workspace/${workspaceId}`, data);
    return res.data;
  },
  async updateMonitor(id: string, data: Record<string, unknown>): Promise<any> {
    const res = await api.put(`/monitors/${id}`, data);
    return res.data;
  },
  async deleteMonitor(id: string): Promise<void> {
    await api.delete(`/monitors/${id}`);
  },
  async runMonitorNow(id: string): Promise<any> {
    const res = await api.post(`/monitors/${id}/run`);
    return res.data;
  },
  async getMonitorRuns(id: string): Promise<any[]> {
    const res = await api.get(`/monitors/${id}/runs`);
    return res.data;
  },

  // Workflows — Full DAG (manual/webhook/schedule, branch/parallel, extract/delay)
  async getWorkflows(workspaceId: string): Promise<any[]> {
    const res = await api.get(`/workflows/workspace/${workspaceId}`);
    return res.data;
  },
  async getWorkflow(id: string): Promise<any> {
    const res = await api.get(`/workflows/${id}`);
    return res.data;
  },
  async createWorkflow(workspaceId: string, data: Record<string, unknown>): Promise<any> {
    const res = await api.post(`/workflows/workspace/${workspaceId}`, data);
    return res.data;
  },
  async updateWorkflow(id: string, data: Record<string, unknown>): Promise<any> {
    const res = await api.put(`/workflows/${id}`, data);
    return res.data;
  },
  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },
  async getWorkflowRuns(id: string): Promise<any[]> {
    const res = await api.get(`/workflows/${id}/runs`);
    return res.data;
  },
  async runWorkflow(id: string, variables?: Record<string,string>): Promise<any> {
    const res = await api.post(`/workflows/${id}/run`, { variables });
    return res.data;
  },

  // Deployments
  async getDeployments(workspaceId: string): Promise<Deployment[]> {
    const res = await api.get(`/deployments/${workspaceId}`);
    return res.data;
  },

  async createDeployment(deployment: Partial<Deployment> & { workspaceId: string; collectionId: string; collectionName: string }): Promise<Deployment> {
    const res = await api.post('/deployments', deployment);
    return res.data;
  },

  async updateDeployment(id: string, deployment: Partial<Deployment>): Promise<Deployment> {
    const res = await api.put(`/deployments/${id}`, deployment);
    return res.data;
  },

  async deleteDeployment(id: string): Promise<void> {
    await api.delete(`/deployments/${id}`);
  },

  async executeRequest(req: any, proxyConfig?: any, forceDirect = false, signal?: AbortSignal) {
    const { agentMode } = useStore.getState();
    const isDesktopAgent = agentMode === 'desktop';
    const proxyBaseUrl = isDesktopAgent ? DESKTOP_AGENT_URL : '/proxy';
    // Pairing token for the local Desktop Agent Bridge (printed by
    // desktop-agent.cjs at startup; stored locally after first pairing).
    const agentToken = isDesktopAgent ? getAgentToken() : '';

    const url = req.url || '';
    const isLocal = !isDesktopAgent && (forceDirect || /localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+/i.test(url));

    if (isLocal) {
      const startTime = performance.now();
      const method = (req.method || 'GET').toUpperCase();
      const headers = req.headers ? req.headers.reduce((acc: any, h: any) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {}) : {};

      let bodyData = undefined;
      if (req.body) {
        if (typeof req.body === 'object') {
          if (req.body.content !== undefined) {
            try {
              bodyData = JSON.parse(req.body.content);
            } catch {
              bodyData = req.body.content;
            }
          } else {
            bodyData = req.body;
          }
        } else {
          bodyData = req.body;
        }
      }

      try {
        const response = await axios({
          method,
          url,
          headers,
          data: bodyData,
          responseType: 'arraybuffer',
          validateStatus: () => true,
          signal,
        });
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const decoded = decodeDirectResponseBody(
          response.data,
          (response.headers as any)?.['content-type']
        );
        const size = response.data instanceof ArrayBuffer ? response.data.byteLength : 0;

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: decoded.data,
          isBase64: decoded.isBase64,
          timeMs: Math.round(totalTime),
          size,
          timings: {
            dns: 0,
            connect: 0,
            ssl: 0,
            send: 0,
            wait: Math.round(totalTime),
            receive: 0,
          }
        };
      } catch (err: any) {
        const endTime = performance.now();
        return {
          status: 0,
          statusText: 'CORS Block or Connection Refused',
          headers: {},
          data: {
            error: err.message || 'Connection Failed',
            message: `Could not connect to ${url} directly from the browser.`,
            troubleshooting: [
              "Verify your local server is running on the specified port.",
              "Ensure CORS is enabled in your server configuration (headers: Access-Control-Allow-Origin: *).",
              "Install a CORS-unblocking browser extension to bypass restrictions in the preview environment.",
              "If the server is not accessible publicly, run 'ngrok http 3000' and use the secure public URL instead."
            ]
          },
          timeMs: Math.round(endTime - startTime),
          size: 0,
          timings: { dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 }
        };
      }
    }

    let proxyBody = undefined;
    if (req.body) {
      if (typeof req.body === 'object') {
        if (req.body.content !== undefined) {
          try {
            proxyBody = JSON.parse(req.body.content);
          } catch {
            proxyBody = req.body.content;
          }
        } else {
          proxyBody = req.body;
        }
      } else {
        proxyBody = req.body;
      }
    }

    try {
      const res = await api.post(isDesktopAgent ? DESKTOP_AGENT_URL : '/proxy', {
        method: req.method,
        url: req.url,
        headers: req.headers ? req.headers.reduce((acc: any, h: any) => {
          if (h.enabled && h.key) acc[h.key] = h.value;
          return acc;
        }, {}) : {},
        body: proxyBody,
        proxyConfig,
      }, {
        headers: {
          'x-target-url': req.url,
          ...(isDesktopAgent && agentToken ? { 'x-agent-token': agentToken } : {}),
        },
        signal,
      });
      return res.data;
    } catch (err: any) {
      if (isDesktopAgent) {
        // The bridge answered 403: it is running, but the pairing token is
        // missing or wrong. Report that precisely instead of "not found".
        if (isAgentPairingError(err)) {
          return {
            status: 0,
            statusText: 'Agent Pairing Required',
            headers: {},
            data: {
              error: 'Desktop Agent rejected the request (invalid pairing token)',
              message: 'The bridge is running, but the pairing token is missing or wrong.',
              troubleshooting: agentPairingTroubleshooting()
            },
            timeMs: 0,
            size: 0,
            timings: { dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 }
          };
        }
         return {
            status: 0,
            statusText: 'Agent Bridge Not Found',
            headers: {},
            data: {
              error: 'Connection to Desktop Agent Bridge Failed',
              message: 'Make sure your local Desktop Agent Bridge is running on port 8765.',
              troubleshooting: [
                "Run 'npm run bridge' or start the agent executable locally.",
                "Ensure no firewall is blocking access to 127.0.0.1:8765."
              ]
            },
            timeMs: 0,
            size: 0,
            timings: { dns: 0, connect: 0, ssl: 0, send: 0, wait: 0, receive: 0 }
         };
      } else {
         throw err;
      }
    }
  },
};