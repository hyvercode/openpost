import React from 'react';
import { useStore } from '../store/useStore';
import { Rocket, Globe, Copy, ExternalLink, Calendar, Server, ShieldCheck, Check, Trash2, Shield, Lock, Activity, Key, Save } from 'lucide-react';
import { cn } from '../utils';
import { apiService } from '../lib/api';

export function DeploymentPanel() {
  const { activeTabId, deployments, setDeployments, setActiveView, setOpenTabs, openTabs, addToast } = useStore();
  const [copiedPath, setCopiedPath] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const deployment = deployments.find(d => d.id === activeTabId);

  // Local state for settings to avoid immediate Firestore writes
  const [localSettings, setLocalSettings] = React.useState<{
    rateLimitEnabled: boolean;
    requestsPerMinute: number;
    apiKeyEnabled: boolean;
    apiKeyValue: string;
  }>({
    rateLimitEnabled: false,
    requestsPerMinute: 60,
    apiKeyEnabled: false,
    apiKeyValue: ''
  });

  React.useEffect(() => {
    if (deployment) {
      setLocalSettings({
        rateLimitEnabled: deployment.mockConfig?.rateLimit?.enabled ?? false,
        requestsPerMinute: deployment.mockConfig?.rateLimit?.requestsPerMinute ?? 60,
        apiKeyEnabled: deployment.mockConfig?.apiKey?.enabled ?? false,
        apiKeyValue: deployment.mockConfig?.apiKey?.key ?? ''
      });
    }
  }, [deployment?.id]);

  if (!deployment) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] p-8">
        <Server className="w-12 h-12 text-[var(--border-strong)] mb-4 stroke-1 animate-pulse" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">No Active Deployment Selected</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Select a mock deployment from the sidebar to inspect its routes.</p>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/mock/${deployment.id}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(label);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleDelete = async () => {
    const confirm = window.confirm(`Are you sure you want to delete/undeploy mock server "${deployment.collectionName}" (${deployment.version})?`);
    if (confirm) {
      try {
        await apiService.deleteDeployment(deployment.id);
        setDeployments(deployments.filter(d => d.id !== deployment.id));
        // Remove from tabs
        const filteredTabs = openTabs.filter(t => t.id !== deployment.id);
        setOpenTabs(filteredTabs);
        setActiveView('empty');
      } catch (err) {
        console.error("Failed to delete deployment", err);
      }
    }
  };

  const getPathFromUrl = (urlStr: string) => {
    try {
      if (!urlStr) return "/";
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

  const handleSaveSettings = async () => {
    if (!deployment) return;
    setIsSaving(true);
    try {
      const mockConfig = {
        enabled: true,
        rateLimit: {
          enabled: localSettings.rateLimitEnabled,
          requestsPerMinute: Number(localSettings.requestsPerMinute)
        },
        apiKey: {
          enabled: localSettings.apiKeyEnabled,
          key: localSettings.apiKeyValue
        }
      };
      await apiService.updateDeployment(deployment.id, { mockConfig });
      setDeployments(deployments.map(d => d.id === deployment.id ? { ...d, mockConfig } : d));
      addToast('Mock server settings updated', 'success', 2000);
    } catch (err) {
      console.error("Failed to update deployment settings", err);
      addToast('Failed to update settings', 'error', 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLocalSettings(prev => ({ ...prev, apiKeyValue: result }));
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Rocket className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold leading-tight">{deployment.collectionName}</h2>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-semibold font-mono">
                {deployment.version}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Deployed on {new Date(deployment.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <ShieldCheck className="w-3.5 h-3.5" />
                Public Server Active
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 px-4 py-2 rounded text-xs font-semibold transition-all self-start md:self-auto"
        >
          <Trash2 className="w-4 h-4" />
          Undeploy Server
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Connection Card */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Public Mock Base URL</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-3 flex-1">
            This is the production endpoint for this mock server. Any external system, webhook, or frontend client can call this live URL in real-time.
          </p>
          <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg p-3 font-mono text-sm text-indigo-400 select-all overflow-x-auto">
            <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="flex-1 truncate">{publicUrl}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleCopy(publicUrl, 'base')}
                className="p-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"
                title="Copy Base URL"
              >
                {copiedPath === 'base' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"
                title="Open Public Endpoint in Browser"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Security & Limits Card */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-orange-500" />
              Security & Rate Limits
            </h3>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all shadow-lg"
            >
              {isSaving ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save Configuration
            </button>
          </div>

          <div className="space-y-4">
            {/* Rate Limiting */}
            <div className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-hover)]/30 border border-[var(--border-subtle)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Rate Limiting</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">Limit requests per minute</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {localSettings.rateLimitEnabled && (
                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-1">
                    <input
                      type="number"
                      value={localSettings.requestsPerMinute}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, requestsPerMinute: Number(e.target.value) }))}
                      className="w-12 bg-transparent text-xs font-bold text-blue-400 focus:outline-none text-center"
                    />
                    <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-tighter">RPM</span>
                  </div>
                )}
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, rateLimitEnabled: !prev.rateLimitEnabled }))}
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors duration-200",
                    localSettings.rateLimitEnabled ? "bg-blue-500" : "bg-[var(--border-strong)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200",
                    localSettings.rateLimitEnabled ? "right-0.5" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>

            {/* API Key Authentication */}
            <div className="p-3 bg-[var(--bg-hover)]/30 border border-[var(--border-subtle)] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Lock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">API Key Auth</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Require X-API-Key header</div>
                  </div>
                </div>
                <button
                  onClick={() => setLocalSettings(prev => ({ ...prev, apiKeyEnabled: !prev.apiKeyEnabled }))}
                  className={cn(
                    "w-8 h-4 rounded-full relative transition-colors duration-200",
                    localSettings.apiKeyEnabled ? "bg-orange-500" : "bg-[var(--border-strong)]"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200",
                    localSettings.apiKeyEnabled ? "right-0.5" : "left-0.5"
                  )} />
                </button>
              </div>

              {localSettings.apiKeyEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-3 py-2">
                    <Key className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <input
                      type="text"
                      value={localSettings.apiKeyValue}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, apiKeyValue: e.target.value }))}
                      placeholder="Enter or generate API key"
                      className="flex-1 bg-transparent text-xs font-mono text-orange-400 focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(localSettings.apiKeyValue, 'key')}
                      className="text-[var(--text-secondary)] hover:text-orange-400 transition-colors"
                    >
                      {copiedPath === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={generateApiKey}
                    className="p-2 bg-[var(--bg-hover)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                    title="Generate New Key"
                  >
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Routes list */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Active Mock API Routes</h3>
        <div className="flex flex-col gap-4">
          {deployment.requests && deployment.requests.length > 0 ? (
            deployment.requests.map((req) => {
              const routePath = getPathFromUrl(req.url);
              const fullRouteUrl = `${publicUrl}${routePath === '/' ? '' : routePath}`;
              const mockRes = req.mockResponse || {
                status: 200,
                headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
                body: JSON.stringify({ message: `Mock response for ${req.name}` })
              };
              const enabledHeaders = (mockRes.headers || []).filter(h => h.enabled && h.key);

              return (
                <div 
                  key={req.id} 
                  className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Method + Path */}
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md min-w-[56px] text-center uppercase border",
                        req.method === 'GET' ? "bg-[var(--text-get)]/10 text-[var(--text-get)] border-[var(--text-get)]/20" :
                        req.method === 'POST' ? "bg-[var(--text-post)]/10 text-[var(--text-post)] border-[var(--text-post)]/20" :
                        req.method === 'PUT' ? "bg-[var(--text-put)]/10 text-[var(--text-put)] border-[var(--text-put)]/20" :
                        req.method === 'DELETE' ? "bg-[var(--text-delete)]/10 text-[var(--text-delete)] border-[var(--text-delete)]/20" : 
                        "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border-[var(--text-secondary)]/20"
                      )}>
                        {req.method}
                      </span>
                      <span className="font-mono text-sm font-semibold truncate text-[var(--text-primary)]">
                        {routePath}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] truncate">
                        ({req.name})
                      </span>
                    </div>

                    {/* Bottom Row: Full URL preview */}
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-4">
                      <span className="truncate max-w-[280px] sm:max-w-md md:max-w-xl font-mono bg-[var(--bg-hover)] px-2 py-0.5 rounded text-[var(--text-secondary)] select-all">
                        {fullRouteUrl}
                      </span>
                      <button
                        onClick={() => handleCopy(fullRouteUrl, req.id)}
                        className="p-1 hover:bg-[var(--bg-hover)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Copy Route URL"
                      >
                        {copiedPath === req.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Meta info block */}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-secondary)] font-medium">Returns:</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-mono font-bold text-[10px]",
                          mockRes.status >= 200 && mockRes.status < 300 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          mockRes.status >= 300 && mockRes.status < 400 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        )}>
                          {mockRes.status}
                        </span>
                      </div>
                      <div className="h-3 w-px bg-[var(--border-subtle)]"></div>
                      <div>
                        <span className="font-medium">{enabledHeaders.length}</span> custom headers
                      </div>
                    </div>
                  </div>

                  {/* Actions / Previews side */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-64">
                    {/* Quick Response body preview */}
                    {mockRes.body && (
                      <div className="flex-1 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded p-2.5 font-mono text-[10px] text-[var(--text-code)] h-16 overflow-y-auto resize-none select-all leading-tight">
                        {mockRes.body}
                      </div>
                    )}
                    <a
                      href={fullRouteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold px-3 py-2 rounded transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Test Route Live
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-8 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-secondary)]">
              This collection has no requests. Add requests in the sidebar to define mock routes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
