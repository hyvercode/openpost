import React, { useState } from 'react';
import { ApiCollection, RequestItem } from '../types';
import { Globe, Lock, Play, Check, X } from 'lucide-react';
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

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-[var(--text-get)]';
    case 'POST': return 'text-[var(--text-post)]';
    case 'PUT': return 'text-[var(--text-put)]';
    case 'DELETE': return 'text-[var(--text-delete)]';
    default: return 'text-[var(--text-secondary)]';
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
    <div className="mt-2 border border-[var(--border-subtle)] rounded bg-[var(--bg-base)]">
      <div className="flex items-center gap-2 px-3 py-2">
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
              <X className="w-3.5 h-3.5" /> {result.error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[var(--success)]">
                <Check className="w-3.5 h-3.5" /> {result.status} {result.statusText} · {result.timeMs}ms
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-all text-[var(--text-secondary)] max-h-48 overflow-y-auto">{result.body}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const PublicDocView: React.FC<PublicDocViewProps> = ({ collection, error }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="theme-light min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--icon-color)]" />
          <span className="text-sm font-bold">OpenPost Public Docs</span>
          <span className="text-xs text-[var(--text-secondary)] ml-auto">No account required</span>
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
              <p className="text-sm text-[var(--text-secondary)] mt-1">{collection.description}</p>
            )}
            <div className="mt-4 space-y-2">
              {(collection.requests || []).map((r) => (
                <div key={r.id} className="border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)]">
                  <button
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer"
                  >
                    <span className={cn('text-xs font-mono font-bold w-12 shrink-0', methodColor(r.method))}>
                      {r.method}
                    </span>
                    <span className="text-xs font-mono truncate flex-1">{r.url}</span>
                    <span className="text-xs text-[var(--text-secondary)] truncate max-w-[200px] hidden sm:inline">{r.name}</span>
                  </button>
                  {openId === r.id && (
                    <div className="border-t border-[var(--border-subtle)] px-3 py-2">
                      {r.description && (
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{r.description}</p>
                      )}
                      <TryIt request={r} />
                    </div>
                  )}
                </div>
              ))}
              {(collection.requests || []).length === 0 && (
                <p className="text-sm text-[var(--text-secondary)]">No endpoints published.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
