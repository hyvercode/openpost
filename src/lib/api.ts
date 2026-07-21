import axios from 'axios';
import { Workspace, ApiCollection, Environment, Deployment } from '../types';

export const api = axios.create({
  baseURL: ((import.meta as any).env?.VITE_API_URL || '') + '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

  async changePassword(password: string) {
    const res = await api.post('/auth/change-password', { password });
    return res.data;
  },

  // Workspaces
  async getWorkspaces(userId: string): Promise<Workspace[]> {
    const res = await api.get('/workspaces', { params: { userId } });
    return res.data;
  },

  async createWorkspace(name: string, ownerId: string, id?: string): Promise<Workspace> {
    const res = await api.post('/workspaces', { id, name, ownerId });
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

  async getSharedCollection(id: string): Promise<ApiCollection> {
    const res = await api.get(`/collections/shared/${id}`);
    return res.data;
  },

  async createCollection(collection: Partial<ApiCollection> & { workspaceId: string; name: string }): Promise<ApiCollection> {
    const res = await api.post('/collections', collection);
    return res.data;
  },

  async updateCollection(id: string, collection: Partial<ApiCollection>): Promise<ApiCollection> {
    const res = await api.put(`/collections/${id}`, collection);
    return res.data;
  },

  async deleteCollection(id: string): Promise<void> {
    await api.delete(`/collections/${id}`);
  },

  async generateDocumentation(collectionName: string, folders: any[], requests: any[]): Promise<{ markdown: string }> {
    const res = await api.post('/collections/generate-docs', { collectionName, folders, requests });
    return res.data;
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
    const res = await api.put(`/environments/${id}`, env);
    return res.data;
  },

  async deleteEnvironment(id: string): Promise<void> {
    await api.delete(`/environments/${id}`);
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

  async executeRequest(req: any, proxyConfig?: any, forceDirect = false) {
    const url = req.url || '';
    const isLocal = forceDirect || /localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+/i.test(url);
    
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
          validateStatus: () => true,
        });
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const responseData = response.data;
        const size = typeof responseData === 'string' ? responseData.length : JSON.stringify(responseData || '').length;

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: responseData,
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

    const res = await api.post('/proxy', {
      method: req.method,
      url: req.url,
      headers: req.headers.reduce((acc: any, h: any) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {}),
      body: proxyBody,
      proxyConfig,
    });
    return res.data;
  },
};
