import React, { useMemo, useState } from 'react';
import { ApiCollection, RequestItem } from '../types';
import {
  Globe, Lock, Play, Check, X, Search, Copy, ChevronDown,
  Sun, Moon, Folder, UnfoldVertical, FoldVertical, FileText,
} from 'lucide-react';
import { cn } from '../utils';

interface PublicDocViewProps {
  collection: ApiCollection;
  error: string | null;
}

interface TryResult {
  status?: number;
  statusText?: string;
  timeMs?: number;
  body?: string;
  error?: string;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function methodBadge(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-[var(--text-get)]/10 text-[var(--text-get)] border-[var(--text-get)]/25';
    case 'POST': return 'bg-[var(--text-post)]/10 text-[var(--text-post)] border-[var(--text-post)]/25';
    case 'PUT': return 'bg-[var(--text-put)]/10 text-[var(--text-put)] border-[var(--text-put)]/25';
    case 'DELETE': return 'bg-[var(--text-delete)]/10 text-[var(--text-delete)] border-[var(--text-delete)]/25';
    default: return 'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border-[var(--text-secondary)]/25';
  }
}

function buildCurl(r: RequestItem): string {
  const parts = [`curl -X ${r.method.toUpperCase()} '${r.url.replace(/'/g, `'\\''`)}'`];
  (r.headers || []).filter(h => h.enabled && h.key).forEach(h => {
    parts.push(`-H '${`${h.key}: ${h.value ?? ''}`.replace(/'/g, `'\\''`)}'`);
  });
  if (r.body && r.body.type !== 'none' && r.body.content) {
    parts.push(`--data-raw '${r.body.content.replace(/'/g, `'\\''`)}'`);
  }
  return parts.join(' \\\n  ');
}

function prettyBody(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function TryIt({ request }: { request: RequestItem }) {
  const [result, setResult] = useState<TryResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setResult(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const start = Date.now();
    try {
      // Direct browser fetch (no auth, no proxy): works for CORS-open APIs.
      const res = await fetch(request.url, {
        method: request.method,
        signal: ctrl.signal,
      });
      const text = await res.text();
      setResult({
        status: res.status,
        statusText: res.statusText,
        timeMs: Date.now() - start,
        body: text.slice(0, 4000),
      });
    } catch (e: any) {
      setResult({ error: e?.name === 'AbortError' ? 'Request timed out (20s)' : 'Request failed (network or CORS blocked)' });
    } finally {
      clearTimeout(timer);
      setRunning(false);
    }
  };

  return (
    <div className="mt-3 border border-[var(--border-subtle)] rounded bg-[var(--bg-base)]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white rounded text-xs font-bold cursor-pointer"
        >
          <Play className="w-3 h-3" />
          {running ? 'Sending...' : 'Try it'}
        </button>
        <span className="text-xs text-[var(--text-tertiary)]">Direct browser request, no account needed</span>
      </div>
      {result && (
        <div className="border-t border-[var(--border-subtle)] px-3 py-2 font-mono text-xs">
          {result.error ? (
            <div className="flex items-center gap-1.5 text-[var(--danger)]">
              <X className="w-3.5 h-3.5 shrink-0" /> {result.error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[var(--success)]">
                <Check className="w-3.5 h-3.5 shrink-0" /> {result.status} {result.statusText} · {result.timeMs}ms
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-all text-[var(--text-secondary)] max-h-48 overflow-y-auto">{result.body}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function KeyValueTable({ title, rows }: { title: string; rows: { key: string; value: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">{title}</h4>
      <div className="border border-[var(--border-subtle)] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono min-w-[320px]">
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={cn('border-b border-[var(--border-subtle)] last:border-0', i % 2 === 1 && 'bg-[var(--bg-base)]')}>
                  <td className="px-3 py-1.5 text-[var(--text-primary)] font-semibold break-all align-top w-1/3">{row.key}</td>
                  <td className="px-3 py-1.5 text-[var(--text-secondary)] break-all align-top">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EndpointCard({
  request, open, onToggle,
}: {
  request: RequestItem; open: boolean; onToggle: () => void;
}) {
  const [copied, setCopied] = useState<'url' | 'curl' | null>(null);

  const copy = async (kind: 'url' | 'curl') => {
    try {
      await navigator.clipboard.writeText(kind === 'url' ? request.url : buildCurl(request));
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const params = (request.params || []).filter(p => p.enabled && p.key);
  const headers = (request.headers || []).filter(h => h.enabled && h.key);
  const hasBody = request.body && request.body.type !== 'none' && request.body.content;

  return (
    <div className="border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 text-left cursor-pointer hover:bg-[var(--bg-hover)]/50 transition-colors"
      >
        <span className={cn('text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded border min-w-[52px] text-center shrink-0', methodBadge(request.method))}>
          {request.method}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-[var(--text-primary)] truncate">{request.name || request.url}</span>
          <span className="block text-[11px] font-mono text-[var(--text-secondary)] truncate">{request.url}</span>
        </span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-[var(--text-secondary)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-[var(--border-subtle)] px-3 py-3">
          {request.description && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-1">{request.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={() => copy('url')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[11px] font-semibold text-[var(--text-primary)] cursor-pointer"
            >
              {copied === 'url' ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
              {copied === 'url' ? 'Copied!' : 'Copy URL'}
            </button>
            <button
              onClick={() => copy('curl')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[11px] font-semibold text-[var(--text-primary)] cursor-pointer"
            >
              {copied === 'curl' ? <Check className="w-3 h-3 text-[var(--success)]" /> : <FileText className="w-3 h-3" />}
              {copied === 'curl' ? 'Copied!' : 'Copy as cURL'}
            </button>
          </div>
          <KeyValueTable title="Query Parameters" rows={params.map(p => ({ key: p.key, value: p.value ?? '' }))} />
          <KeyValueTable title="Headers" rows={headers.map(h => ({ key: h.key, value: h.value ?? '' }))} />
          {hasBody && (
            <div className="mt-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Body <span className="font-mono normal-case font-medium">({request.body.type})</span>
              </h4>
              <pre className="border border-[var(--border-subtle)] rounded bg-[var(--bg-base)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-code)] overflow-x-auto max-h-64 overflow-y-auto whitespace-pre">
                {prettyBody(request.body.content)}
              </pre>
            </div>
          )}
          <TryIt request={request} />
        </div>
      )}
    </div>
  );
}

export const PublicDocView: React.FC<PublicDocViewProps> = ({ collection, error }) => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem('publicdocs-theme') === 'dark');

  const toggleTheme = () => {
    setDark(d => {
      localStorage.setItem('publicdocs-theme', d ? 'light' : 'dark');
      return !d;
    });
  };

  const requests = useMemo(() => collection?.requests || [], [collection]);
  const folders = useMemo(() => collection?.folders || [], [collection]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter(r => {
      if (methodFilter && r.method.toUpperCase() !== methodFilter) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.url?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    });
  }, [requests, query, methodFilter]);

  const groups = useMemo(() => {
    const root = filtered.filter(r => !r.folderId || !folders.some(f => f.id === r.folderId));
    const grouped = folders
      .map(f => ({ folder: f, items: filtered.filter(r => r.folderId === f.id) }))
      .filter(g => g.items.length > 0);
    return { root, grouped };
  }, [filtered, folders]);

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => setOpenIds(new Set(filtered.map(r => r.id)));
  const collapseAll = () => setOpenIds(new Set());

  return (
    <div className={cn('min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]', dark ? 'theme-dark' : 'theme-light')}>
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--icon-color)] shrink-0" />
          <span className="text-sm font-bold truncate">OpenPost Public Docs</span>
          <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">No account required</span>
          <button
            onClick={toggleTheme}
            className="ml-auto p-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer shrink-0"
            title={dark ? 'Switch to light' : 'Switch to dark'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error ? (
          <div className="border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] p-8 text-center">
            <Lock className="w-6 h-6 mx-auto mb-2 text-[var(--text-tertiary)]" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">{collection.name}</h1>
            {collection.description && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{collection.description}</p>
            )}
            <p className="text-xs text-[var(--text-tertiary)] mt-2 font-mono">
              {requests.length} endpoint{requests.length === 1 ? '' : 's'}
              {folders.length > 0 && ` · ${folders.length} folder${folders.length === 1 ? '' : 's'}`}
            </p>

            {/* Search + method filter */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded focus-within:border-[var(--border-focus)] transition-colors min-w-0">
                <Search className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search endpoints..."
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] min-w-0"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0" title="Clear search">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={expandAll}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                  title="Expand all endpoints"
                >
                  <UnfoldVertical className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Expand</span>
                </button>
                <button
                  onClick={collapseAll}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                  title="Collapse all endpoints"
                >
                  <FoldVertical className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Collapse</span>
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setMethodFilter(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer transition-colors',
                  methodFilter === null
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                All
              </button>
              {METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(methodFilter === m ? null : m)}
                  className={cn(
                    'px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold cursor-pointer transition-colors',
                    methodFilter === m
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                      : cn('hover:bg-[var(--bg-hover)]', methodBadge(m))
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Endpoint list */}
            <div className="mt-4 space-y-4">
              {filtered.length === 0 ? (
                <div className="border border-dashed border-[var(--border-strong)] rounded p-8 text-center">
                  <Search className="w-6 h-6 mx-auto mb-2 text-[var(--text-tertiary)]" />
                  <p className="text-sm font-bold">No endpoints match your search</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Try a different keyword or method filter.</p>
                </div>
              ) : (
                <>
                  {groups.root.length > 0 && (
                    <div className="space-y-2">
                      {groups.grouped.length > 0 && (
                        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5" /> General
                        </h2>
                      )}
                      {groups.root.map(r => (
                        <EndpointCard key={r.id} request={r} open={openIds.has(r.id)} onToggle={() => toggle(r.id)} />
                      ))}
                    </div>
                  )}
                  {groups.grouped.map(({ folder, items }) => (
                    <div key={folder.id} className="space-y-2">
                      <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-1.5">
                        <Folder className="w-3.5 h-3.5 text-[var(--primary)]" /> {folder.name}
                      </h2>
                      {items.map(r => (
                        <EndpointCard key={r.id} request={r} open={openIds.has(r.id)} onToggle={() => toggle(r.id)} />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            <footer className="mt-8 pt-4 border-t border-[var(--border-subtle)] text-center">
              <p className="text-[11px] text-[var(--text-tertiary)]">Published with OpenPost · Try-it sends requests directly from your browser</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
};
