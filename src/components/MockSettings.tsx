import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ApiCollection, MockConfig } from '../types';
import { Server, Shield, Zap, Copy, Check, Globe, AlertCircle, Save, ToggleLeft, ToggleRight, Info, Lock, Key } from 'lucide-react';
import { cn } from '../utils';
import { apiService } from '../lib/api';

interface MockSettingsProps {
  collection: ApiCollection;
}

export function MockSettings({ collection }: MockSettingsProps) {
  const { addToast } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [config, setConfig] = useState<MockConfig>(collection.mockConfig || {
    enabled: false,
    rateLimit: {
      enabled: true,
      requestsPerMinute: 60
    },
    apiKey: {
      enabled: false,
      key: ''
    }
  });

  const publicUrl = `${window.location.origin}/mock/collection/${collection.id}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    addToast('Mock URL copied to clipboard', 'info', 2000);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyKey = () => {
    if (!config.apiKey?.key) return;
    navigator.clipboard.writeText(config.apiKey.key);
    setKeyCopied(true);
    addToast('API Key copied', 'info', 2000);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk_local_';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setConfig({
      ...config,
      apiKey: { ...config.apiKey!, key: result }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiService.updateCollection(collection.id, {
        mockConfig: config
      });
      
      const { collections, setCollections } = useStore.getState();
      setCollections(collections.map(c => c.id === collection.id ? { ...c, mockConfig: config } : c));
      
      addToast('Mock configuration updated', 'success', 2000);
    } catch (error) {
      console.error("Failed to save mock configuration:", error);
      addToast('Failed to update mock configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-5 flex gap-4">
        <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-500/20">
          <Globe className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Public Mock API</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Expose your collection as a live mock server. Share this URL with your frontend team or use it in your code to simulate backend responses before they're built.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Controls */}
        <div className="space-y-6">
          {/* Status Toggle */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--primary)]/10 rounded flex items-center justify-center">
                  <Server className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Mock Server Status</h4>
              </div>
              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border uppercase tracking-widest",
                  config.enabled 
                    ? "bg-green-500/10 text-green-400 border-green-500/20" 
                    : "bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                )}
              >
                {config.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {config.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {config.enabled ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Public Base URL</label>
                  <div className="flex bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg overflow-hidden p-1 shadow-inner">
                    <div className="flex-1 px-3 py-2 text-xs font-mono text-amber-500 truncate select-all">
                      {publicUrl}
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-2 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-md flex items-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-2 italic flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Append the request path to this URL to access your mocks.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-[var(--border-subtle)] rounded-lg bg-[var(--bg-base)]/30">
                <div className="w-12 h-12 bg-[var(--bg-hover)] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-[var(--border-strong)] opacity-50" />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Mock API is currently offline.</p>
              </div>
            )}
          </div>

          {/* Rate Limiting */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500/10 rounded flex items-center justify-center">
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Traffic & Rate Limiting</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.rateLimit.enabled}
                  onChange={(e) => setConfig({
                    ...config,
                    rateLimit: { ...config.rateLimit, enabled: e.target.checked }
                  })}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-[var(--bg-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--primary)]"></div>
              </label>
            </div>

            <div className={cn("space-y-4 transition-opacity", !config.rateLimit.enabled && "opacity-50 pointer-events-none")}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Requests per minute</label>
                  <span className="text-xs font-bold text-[var(--primary)] font-mono">{config.rateLimit.requestsPerMinute} req/min</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="120" 
                  value={config.rateLimit.requestsPerMinute}
                  onChange={(e) => setConfig({
                    ...config,
                    rateLimit: { ...config.rateLimit, requestsPerMinute: parseInt(e.target.value) }
                  })}
                  className="w-full h-1.5 bg-[var(--bg-hover)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                />
              </div>
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3 flex gap-3 items-start">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Rate limiting helps protect your mock endpoints from excessive traffic. If the limit is reached, users will receive a 429 Too Many Requests response.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Authentication */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500/10 rounded flex items-center justify-center">
                  <Lock className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Access Control</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.apiKey?.enabled || false}
                  onChange={(e) => setConfig({
                    ...config,
                    apiKey: { ...config.apiKey || { key: '', enabled: false }, enabled: e.target.checked }
                  })}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-[var(--bg-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            <div className={cn("space-y-4 transition-opacity", !config.apiKey?.enabled && "opacity-50 pointer-events-none")}>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Mock Server API Key</label>
                <div className="flex bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg overflow-hidden p-1 shadow-inner">
                  <div className="w-9 flex items-center justify-center text-[var(--text-secondary)]">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={config.apiKey?.key || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      apiKey: { ...config.apiKey!, key: e.target.value }
                    })}
                    placeholder="sk_local_..."
                    className="flex-1 bg-transparent px-2 py-2 text-xs font-mono text-indigo-400 focus:outline-none"
                  />
                  <div className="flex gap-1 pr-1">
                    <button
                      onClick={generateApiKey}
                      className="px-2 py-1.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded text-[10px] font-bold uppercase"
                    >
                      Gen
                    </button>
                    <button
                      onClick={handleCopyKey}
                      className="px-2 py-1.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded"
                    >
                      {keyCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 text-indigo-400" />
                  When enabled, all requests must include the <code className="text-indigo-400">X-API-Key</code> header.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[var(--primary)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Configuration
          </button>
        </div>

        {/* Mock Routes Preview */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 bg-[var(--bg-hover)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider">Configured Routes</h4>
            <span className="text-[10px] bg-[var(--bg-base)] border border-[var(--border-strong)] px-2 py-0.5 rounded font-bold text-[var(--text-secondary)]">
              {collection.requests.length} Endpoints
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar max-h-[600px]">
            {collection.requests.length > 0 ? (
              collection.requests.map(req => {
                const getPathFromUrl = (urlStr: string) => {
                  try {
                    if (!urlStr) return "/";
                    let cleaned = urlStr.replace(/\{\{[^}]+\}\}/g, "");
                    if (!cleaned.startsWith("http") && !cleaned.startsWith("/")) cleaned = "/" + cleaned;
                    const u = new URL(cleaned, "http://dummy.com");
                    return u.pathname;
                  } catch (e) { return urlStr || "/"; }
                };
                const path = getPathFromUrl(req.url);

                return (
                  <div key={req.id} className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] font-extrabold px-1.5 py-0.5 rounded min-w-[40px] text-center font-mono border",
                        req.method === 'GET' ? "bg-[var(--text-get)]/10 text-[var(--text-get)] border-[var(--text-get)]/20" :
                        req.method === 'POST' ? "bg-[var(--text-post)]/10 text-[var(--text-post)] border-[var(--text-post)]/20" :
                        req.method === 'PUT' ? "bg-[var(--text-put)]/10 text-[var(--text-put)] border-[var(--text-put)]/20" :
                        req.method === 'DELETE' ? "bg-[var(--text-delete)]/10 text-[var(--text-delete)] border-[var(--text-delete)]/20" : 
                        "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
                      )}>
                        {req.method}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">{req.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-[var(--bg-input)] px-2 py-1 rounded text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--border-subtle)] truncate">
                        {path}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          req.mockResponse ? "bg-green-500" : "bg-yellow-500"
                        )} />
                        <span className="text-[9px] font-bold uppercase text-[var(--text-secondary)] tracking-tight">
                          {req.mockResponse ? "Mock Set" : "Default"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--border-subtle)] rounded-lg">
                <Info className="w-8 h-8 text-[var(--border-strong)] mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No requests in this collection yet.</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-[var(--bg-hover)]/30 border-t border-[var(--border-subtle)]">
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                Individual mock responses can be configured directly in each request's settings. The server will use those values when receiving requests to these paths.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}
