import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Plus, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Zap, 
  Lock, 
  Wand2, 
  Sliders, 
  Info,
  ChevronDown,
  X
} from 'lucide-react';
import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { AutocompleteInput } from './AutocompleteInput';
import { useStore } from '../store/useStore';
import { cn } from '../utils';

interface GraphQLHeaderInjectorProps {
  headers: KeyValue[];
  onHeadersChange: (newHeaders: KeyValue[]) => void;
  onIntrospect?: () => void;
  isLoadingIntrospection?: boolean;
}

interface PresetHeader {
  id: string;
  name: string;
  description: string;
  key: string;
  defaultValue: string;
  category: 'Auth' | 'Provider' | 'Security';
  icon: string;
}

const PRESET_HEADERS: PresetHeader[] = [
  {
    id: 'bearer',
    name: 'Bearer Token',
    description: 'Standard Authorization header with Bearer prefix',
    key: 'Authorization',
    defaultValue: 'Bearer {{BEARER_TOKEN}}',
    category: 'Auth',
    icon: '🔑'
  },
  {
    id: 'api-key',
    name: 'X-API-Key',
    description: 'Custom API key header',
    key: 'X-API-Key',
    defaultValue: '{{API_KEY}}',
    category: 'Auth',
    icon: '🔐'
  },
  {
    id: 'hasura',
    name: 'Hasura Admin Secret',
    description: 'Admin access secret for Hasura GraphQL Engine',
    key: 'x-hasura-admin-secret',
    defaultValue: '{{HASURA_ADMIN_SECRET}}',
    category: 'Provider',
    icon: '⚡'
  },
  {
    id: 'shopify',
    name: 'Shopify Storefront',
    description: 'Access token for Shopify Storefront GraphQL API',
    key: 'X-Shopify-Storefront-Access-Token',
    defaultValue: '{{SHOPIFY_STOREFRONT_TOKEN}}',
    category: 'Provider',
    icon: '🛍️'
  },
  {
    id: 'appsync',
    name: 'AWS AppSync Key',
    description: 'API key authorization for AWS AppSync GraphQL',
    key: 'x-api-key',
    defaultValue: '{{APPSYNC_API_KEY}}',
    category: 'Provider',
    icon: '☁️'
  },
  {
    id: 'apollo-preflight',
    name: 'Apollo Preflight',
    description: 'Bypasses CSRF protection in Apollo Server 3/4',
    key: 'Apollo-Require-Preflight',
    defaultValue: 'true',
    category: 'Security',
    icon: '🛡️'
  },
  {
    id: 'github',
    name: 'GitHub GraphQL Token',
    description: 'Personal Access Token for GitHub v4 API',
    key: 'Authorization',
    defaultValue: 'Bearer {{GITHUB_TOKEN}}',
    category: 'Auth',
    icon: '🐙'
  }
];

const COMMON_GQL_HEADER_KEYS = [
  'Authorization',
  'X-API-Key',
  'x-hasura-admin-secret',
  'x-hasura-role',
  'X-Shopify-Storefront-Access-Token',
  'x-api-key',
  'Apollo-Require-Preflight',
  'X-GraphQL-Client-ID',
  'X-GraphQL-Client-Name',
  'X-GraphQL-Client-Version',
  'Content-Type'
];

export function GraphQLHeaderInjector({
  headers,
  onHeadersChange,
  onIntrospect,
  isLoadingIntrospection
}: GraphQLHeaderInjectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [hiddenSecrets, setHiddenSecrets] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeHeadersCount = headers.filter(h => h.enabled && (h.key.trim() || h.value.trim())).length;
  const hasAuthHeader = headers.some(h => 
    h.enabled && (
      h.key.toLowerCase().includes('auth') || 
      h.key.toLowerCase().includes('token') || 
      h.key.toLowerCase().includes('secret') || 
      h.key.toLowerCase().includes('key')
    )
  );

  const handleToggleHeader = (id: string) => {
    onHeadersChange(
      headers.map(h => (h.id === id ? { ...h, enabled: !h.enabled } : h))
    );
  };

  const handleUpdateHeader = (id: string, field: 'key' | 'value', val: string) => {
    onHeadersChange(
      headers.map(h => (h.id === id ? { ...h, [field]: val } : h))
    );
  };

  const handleRemoveHeader = (id: string) => {
    onHeadersChange(headers.filter(h => h.id !== id));
  };

  const handleAddEmptyHeader = () => {
    const newHeader: KeyValue = {
      id: uuidv4(),
      key: '',
      value: '',
      enabled: true
    };
    onHeadersChange([...headers, newHeader]);
  };

  const handleInjectPreset = (preset: PresetHeader) => {
    const existingIndex = headers.findIndex(h => h.key.toLowerCase() === preset.key.toLowerCase());
    
    if (existingIndex >= 0) {
      // Update existing header
      const updated = [...headers];
      updated[existingIndex] = {
        ...updated[existingIndex],
        value: preset.defaultValue,
        enabled: true
      };
      onHeadersChange(updated);
      addToast(`Updated header "${preset.key}"`, 'info', 2000);
    } else {
      // Add new header
      const newHeader: KeyValue = {
        id: uuidv4(),
        key: preset.key,
        value: preset.defaultValue,
        enabled: true
      };
      onHeadersChange([...headers, newHeader]);
      addToast(`Injected header "${preset.key}"`, 'success', 2000);
    }
    setShowPresetMenu(false);
  };

  const toggleSecretVisibility = (id: string) => {
    setHiddenSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border",
          isOpen
            ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)] shadow-sm"
            : hasAuthHeader
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border-[var(--border-subtle)] text-[var(--text-primary)]"
        )}
        title="GraphQL Custom & Authentication Headers Injector"
      >
        {hasAuthHeader ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Key className="w-3.5 h-3.5 text-[var(--primary)]" />
        )}
        <span>Headers</span>
        <span className={cn(
          "px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold",
          activeHeadersCount > 0
            ? "bg-[var(--primary)] text-white"
            : "bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
        )}>
          {activeHeadersCount}
        </span>
      </button>

      {/* Injector Popover Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[440px] bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Header Bar */}
          <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
                  GraphQL Header Injector
                  {hasAuthHeader && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-semibold">
                      Secured
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Inject auth tokens & custom headers into queries and introspection
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets Bar */}
          <div className="p-2.5 bg-[var(--bg-base)] border-b border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Quick Header Presets
              </span>
              <button
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="text-[10px] text-[var(--primary)] font-semibold hover:underline flex items-center gap-1"
              >
                <span>{showPresetMenu ? 'Hide Presets' : 'View All Presets'}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showPresetMenu && "rotate-180")} />
              </button>
            </div>

            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_HEADERS.slice(0, 4).map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleInjectPreset(preset)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--primary)]/15 hover:border-[var(--primary)]/40 border border-[var(--border-subtle)] text-[10px] font-medium text-[var(--text-primary)] whitespace-nowrap transition-all"
                  title={preset.description}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                  <Plus className="w-2.5 h-2.5 text-[var(--text-secondary)]" />
                </button>
              ))}
            </div>

            {/* Extended Presets Grid */}
            {showPresetMenu && (
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--border-subtle)]/60 animate-in fade-in duration-150">
                {PRESET_HEADERS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleInjectPreset(preset)}
                    className="flex flex-col text-left p-2 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-[var(--text-primary)] flex items-center gap-1">
                        <span>{preset.icon}</span>
                        {preset.name}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-secondary)] group-hover:text-[var(--primary)]">
                        + Inject
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-secondary)] truncate mt-0.5">
                      {preset.key}: {preset.defaultValue}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Headers List */}
          <div className="p-3 max-h-64 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              <span>Configured Headers ({headers.length})</span>
              <button
                onClick={handleAddEmptyHeader}
                className="flex items-center gap-1 text-[var(--primary)] hover:underline"
              >
                <Plus className="w-3 h-3" />
                Add Header
              </button>
            </div>

            {headers.length === 0 ? (
              <div className="p-4 rounded border border-dashed border-[var(--border-subtle)] bg-[var(--bg-base)] text-center space-y-2">
                <Key className="w-6 h-6 text-[var(--text-secondary)] mx-auto opacity-50" />
                <p className="text-[11px] text-[var(--text-secondary)]">No headers configured for this request yet.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleInjectPreset(PRESET_HEADERS[0])}
                    className="px-2.5 py-1 rounded bg-[var(--primary)] text-white font-bold text-[10px] hover:bg-opacity-90 transition-all"
                  >
                    + Add Bearer Token
                  </button>
                  <button
                    onClick={handleAddEmptyHeader}
                    className="px-2.5 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] hover:bg-[var(--bg-hover)] font-medium"
                  >
                    + Custom Header
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {headers.map((header) => {
                  const isHide = hiddenSecrets[header.id];
                  const isSecretLike = header.key.toLowerCase().includes('auth') || 
                                       header.key.toLowerCase().includes('secret') || 
                                       header.key.toLowerCase().includes('token') || 
                                       header.key.toLowerCase().includes('key');

                  return (
                    <div
                      key={header.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border transition-all",
                        header.enabled
                          ? "bg-[var(--bg-base)] border-[var(--border-subtle)]"
                          : "bg-[var(--bg-base)]/50 border-transparent opacity-60"
                      )}
                    >
                      {/* Enable Checkbox */}
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={() => handleToggleHeader(header.id)}
                        className="rounded border-[var(--border-strong)] bg-[var(--bg-input)] text-[var(--primary)] focus:ring-0 w-3.5 h-3.5 cursor-pointer shrink-0"
                        title="Enable/Disable Header"
                      />

                      {/* Header Key Input */}
                      <div className="w-1/3 shrink-0 relative">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => handleUpdateHeader(header.id, 'key', e.target.value)}
                          placeholder="Header-Name"
                          list={`gql-header-keys-${header.id}`}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded px-2 py-1 font-mono text-[11px] text-[var(--text-primary)] outline-none"
                        />
                        <datalist id={`gql-header-keys-${header.id}`}>
                          {COMMON_GQL_HEADER_KEYS.map(k => (
                            <option key={k} value={k} />
                          ))}
                        </datalist>
                      </div>

                      {/* Value Input */}
                      <div className="flex-1 relative min-w-0">
                        {isHide ? (
                          <input
                            type="password"
                            value={header.value}
                            onChange={(e) => handleUpdateHeader(header.id, 'value', e.target.value)}
                            placeholder="Header Value"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded px-2 py-1 font-mono text-[11px] text-[var(--text-primary)] outline-none"
                          />
                        ) : (
                          <AutocompleteInput
                            value={header.value}
                            onValueChange={(val) => handleUpdateHeader(header.id, 'value', val)}
                            placeholder="Bearer {{TOKEN}} or value"
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--primary)] rounded px-2 py-1 font-mono text-[11px] text-[var(--text-primary)] outline-none"
                          />
                        )}
                      </div>

                      {/* Eye Hide Toggle for Secrets */}
                      {isSecretLike && (
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(header.id)}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 shrink-0"
                          title={isHide ? "Show Secret" : "Hide Secret"}
                        >
                          {isHide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(header.id)}
                        className="text-red-400/70 hover:text-red-400 p-1 shrink-0 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove Header"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Info & Actions */}
          <div className="p-3 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Headers are synced with main Request Headers tab</span>
            </div>

            {onIntrospect && (
              <button
                onClick={() => {
                  onIntrospect();
                  setIsOpen(false);
                }}
                disabled={isLoadingIntrospection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--primary)] hover:bg-[#e65a2d] disabled:opacity-50 text-white font-bold text-[11px] transition-colors shrink-0"
              >
                <Wand2 className="w-3 h-3" />
                <span>Test & Introspect</span>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
