import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Code2, Sparkles, Terminal, Settings2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { KeyValue, RequestAuth } from '../types';
import { fontOptions, generateCodeSnippet, LanguageId } from '../utils/codeSnippetGenerator';
import { cn } from '../utils';

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    method: string;
    url: string;
    headers: KeyValue[];
    params: KeyValue[];
    bodyType: 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql';
    bodyContent: string;
    bodyFormData: KeyValue[];
    gqlVariables?: string;
    authConfig?: RequestAuth;
  };
}

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({ isOpen, onClose, request }) => {
  const { currentEnvironment, addToast } = useStore();
  const [selectedLang, setSelectedLang] = useState<LanguageId>('curl');
  const [expandVariables, setExpandVariables] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  const snippetCode = useMemo(() => {
    return generateCodeSnippet(selectedLang, {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      bodyType: request.bodyType,
      bodyContent: request.bodyContent,
      bodyFormData: request.bodyFormData,
      gqlVariables: request.gqlVariables,
      authConfig: request.authConfig,
      environmentVariables: currentEnvironment?.variables || [],
      expandVariables
    });
  }, [selectedLang, expandVariables, request, currentEnvironment]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippetCode);
    setCopied(true);
    addToast('Code snippet copied to clipboard', 'success', 2000);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = Array.from(new Set(fontOptions.map(o => o.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Code Snippet Generator</h2>
              <p className="text-xs text-[var(--text-secondary)]">Generate executable code for your active HTTP request</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Language Sidebar */}
          <div className="w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 overflow-y-auto shrink-0 space-y-4">
            {categories.map(cat => (
              <div key={cat} className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  {cat}
                </div>
                {fontOptions.filter(o => o.category === cat).map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedLang(option.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-between",
                      selectedLang === option.id
                        ? "bg-[var(--primary)] text-white font-bold"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Main Code View */}
          <div className="flex-1 flex flex-col bg-[var(--bg-base)] min-w-0">
            {/* Options Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] shrink-0">
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)] font-medium">
                  <input
                    type="checkbox"
                    checked={expandVariables}
                    onChange={(e) => setExpandVariables(e.target.checked)}
                    className="rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>Replace Environment Variables</span>
                </label>
              </div>

              <button
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all shrink-0",
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-[var(--primary)] hover:bg-[#e65a2d] text-white"
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Code Output */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed select-all">
              <pre className="whitespace-pre-wrap break-all font-mono">{snippetCode}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-secondary)] shrink-0">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Target Endpoint: <strong className="text-[var(--text-primary)]">{request.method} {request.url || '/'}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold hover:bg-[var(--border-strong)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
