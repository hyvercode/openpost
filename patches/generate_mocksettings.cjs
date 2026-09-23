const fs = require('fs');

const content = `import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { ApiCollection, MockConfig, RequestItem } from '../types';
import { Server, Shield, Zap, Copy, Check, Globe, AlertCircle, Save, ToggleLeft, ToggleRight, Info, Lock, Key, Clock, ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import { cn } from '../utils';
import { apiService } from '../lib/api';

interface MockSettingsProps {
  collection: ApiCollection;
}

function MockRouteItem({ req, collection, onSave }: { req: RequestItem; collection: ApiCollection; onSave: (updatedReq: RequestItem) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  
  const [status, setStatus] = useState(req.mockResponse?.status || 200);
  const [body, setBody] = useState(req.mockResponse?.body || '');
  const [enabled, setEnabled] = useState(req.mockResponse?.enabled !== false);
  const [isSaving, setIsSaving] = useState(false);

  const getPathFromUrl = (urlStr: string) => {
    try {
      if (!urlStr) return "/";
      let cleaned = urlStr.replace(/\\{\\{[^}]+\\}\\}/g, "");
      if (!cleaned.startsWith("http") && !cleaned.startsWith("/")) cleaned = "/" + cleaned;
      const u = new URL(cleaned, "http://dummy.com");
      return u.pathname;
    } catch (e) { return urlStr || "/"; }
  };
  const path = getPathFromUrl(req.url);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedReq = {
        ...req,
        mockResponse: {
          ...req.mockResponse,
          status,
          body,
          enabled,
          headers: req.mockResponse?.headers || [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }]
        }
      };
      await onSave(updatedReq);
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const updatedReq = { ...req, mockResponse: undefined };
      await onSave(updatedReq);
      setEditing(false);
      setExpanded(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (newEnabled: boolean) => {
    setEnabled(newEnabled);
    if (!req.mockResponse) return; // Wait to save if it's completely new
    
    setIsSaving(true);
    try {
      const updatedReq = {
        ...req,
        mockResponse: {
          ...req.mockResponse,
          enabled: newEnabled
        }
      };
      await onSave(updatedReq);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg flex flex-col overflow-hidden">
      <div 
        className="p-3 flex flex-col gap-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            {req.mockResponse && (
              <label className="flex items-center cursor-pointer relative" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  checked={enabled}
                  onChange={(e) => handleToggle(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-7 h-4 bg-[var(--bg-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-[var(--bg-input)] px-2 py-1 rounded text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--border-subtle)] truncate">
            {path}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn(
              "w-2 h-2 rounded-full",
              req.mockResponse ? (enabled ? "bg-green-500" : "bg-red-500") : "bg-yellow-500"
            )} />
            <span className="text-[9px] font-bold uppercase text-[var(--text-secondary)] tracking-tight">
              {req.mockResponse ? (enabled ? "Mock Active" : "Mock Disabled") : "Default"}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-hover)]/30 flex flex-col gap-3">
          {editing ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Status Code</label>
                <input 
                  type="number" 
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value))}
                  className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-1 text-xs font-mono w-24"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">JSON Body</label>
                <textarea 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-2 text-xs font-mono min-h-[100px] whitespace-pre"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-green-600 hover:bg-green-500 text-white flex items-center gap-1"
                >
                  {isSaving ? "Saving..." : "Save Mock"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-base)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                  Status: <span className="text-green-500 font-bold">{req.mockResponse?.status || 200}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] px-2 py-1 rounded"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  {req.mockResponse && (
                    <button 
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-2 py-1 rounded"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded p-2 text-xs font-mono overflow-auto max-h-[150px] whitespace-pre">
                {req.mockResponse?.body || '{\n  "message": "Default mock response"\n}'}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function MockSettings({ collection }: MockSettingsProps) {
  const { addToast } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const [config, setConfig] = useState<MockConfig>(() => {
    const base = collection.mockConfig;
    return {
      enabled: typeof base?.enabled === 'boolean' ? base.enabled : false,
      latencyMs: base?.latencyMs || 0,
      rateLimit: base?.rateLimit || { enabled: false, requestsPerMinute: 60 },
      apiKey: base?.apiKey || { enabled: false, key: '' }
    };
  });

  const handleCopyUrl = () => {
    const mockUrl = \`\${window.location.origin}/mock/collection/\${collection.id}\`;
    navigator.clipboard.writeText(mockUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Mock Server URL copied to clipboard', 'success', 2000);
  };

  const generateApiKey = () => {
    const key = 'sk_local_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setConfig({
      ...config,
      apiKey: { ...config.apiKey!, key }
    });
  };

  const handleCopyKey = () => {
    if (config.apiKey?.key) {
      navigator.clipboard.writeText(config.apiKey.key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
      addToast('API Key copied to clipboard', 'success', 2000);
    }
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

  const handleSaveRequestMock = async (updatedReq: RequestItem) => {
    try {
      const updatedRequests = collection.requests.map(r => r.id === updatedReq.id ? updatedReq : r);
      await apiService.updateCollection(collection.id, {
        requests: updatedRequests
      });
      
      const { collections, setCollections } = useStore.getState();
      setCollections(collections.map(c => c.id === collection.id ? { ...c, requests: updatedRequests } : c));
      
      addToast('Mock response updated', 'success', 2000);
    } catch (error) {
      console.error("Failed to save request mock:", error);
      addToast('Failed to update mock response', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <Server className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Mock Server</h2>
          <p className="text-xs text-[var(--text-secondary)]">Configure mock endpoints for this collection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Mock Server Settings */}
        <div className="space-y-6">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  Enable Mock Server
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Activate the mock server to respond to requests using configured examples.
                </p>
              </div>
              <label className="flex items-center cursor-pointer relative">
                <input 
                  type="checkbox" 
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-[var(--bg-hover)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            <div className={cn("space-y-4 transition-opacity", !config.enabled && "opacity-50 pointer-events-none")}>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Base URL</label>
                <div className="flex bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg overflow-hidden shadow-inner">
                  <div className="px-3 py-2 text-xs font-mono text-[var(--text-primary)] flex-1 truncate select-all">
                    {window.location.origin}/mock/collection/{collection.id}
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 border-l border-[var(--border-strong)] bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] transition-colors flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Network Latency
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" 
                      max="3000" 
                      step="100"
                      value={config.latencyMs || 0}
                      onChange={(e) => setConfig({ ...config, latencyMs: Number(e.target.value) })}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-xs font-mono font-bold bg-[var(--bg-input)] border border-[var(--border-strong)] px-2 py-1 rounded min-w-[60px] text-center">
                      {config.latencyMs || 0}ms
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Simulate real-world network delays before responding.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Security & Limits
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Protect your mock server from abuse
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)]">Require API Key</span>
              <label className="flex items-center cursor-pointer relative">
                <input 
                  type="checkbox" 
                  checked={config.apiKey?.enabled || false}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    apiKey: { ...config.apiKey!, enabled: e.target.checked }
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
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col shadow-sm max-h-[800px]">
          <div className="p-4 bg-[var(--bg-hover)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider">Configured Routes</h4>
            <span className="text-[10px] bg-[var(--bg-base)] border border-[var(--border-strong)] px-2 py-0.5 rounded font-bold text-[var(--text-secondary)]">
              {collection.requests.length} Endpoints
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {collection.requests.length > 0 ? (
              collection.requests.map(req => (
                <MockRouteItem key={req.id} req={req} collection={collection} onSave={handleSaveRequestMock} />
              ))
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--border-subtle)] rounded-lg">
                <Info className="w-8 h-8 text-[var(--border-strong)] mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No requests in this collection yet.</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-[var(--bg-hover)]/30 border-t border-[var(--border-subtle)] shrink-0">
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                Click on any route above to edit its mock response JSON, status code, or toggle it on/off individually.
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
`
fs.writeFileSync('src/components/MockSettings.tsx', content);
