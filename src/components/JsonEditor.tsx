import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '../utils';
import { useStore } from '../store/useStore';
import { Play, Copy, Check, FileCode, RefreshCw, Minimize2, Trash2, HelpCircle, Code, AlertTriangle } from 'lucide-react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

const JSON_TEMPLATES = [
  {
    name: 'Auth Login',
    desc: 'Email & Password login template',
    value: JSON.stringify({
      email: "user@example.com",
      password: "securePassword123"
    }, null, 2)
  },
  {
    name: 'Create User',
    desc: 'Standard user signup object',
    value: JSON.stringify({
      username: "johndoe",
      email: "john.doe@example.com",
      role: "editor",
      profile: {
        firstName: "John",
        lastName: "Doe",
        age: 30
      },
      tags: ["active", "verified"]
    }, null, 2)
  },
  {
    name: 'Pagination Query',
    desc: 'Listing query filter & limit template',
    value: JSON.stringify({
      page: 1,
      limit: 25,
      sortBy: "createdAt",
      descending: true,
      filter: {
        status: "published",
        search: ""
      }
    }, null, 2)
  },
  {
    name: 'Webhook Event',
    desc: 'Mock SaaS transaction webhook payload',
    value: JSON.stringify({
      event: "invoice.payment_succeeded",
      timestamp: Math.floor(Date.now() / 1000),
      livemode: false,
      data: {
        id: "inv_9381024",
        amount_paid: 1999,
        currency: "usd",
        customer: "cust_394851",
        status: "paid"
      }
    }, null, 2)
  }
];

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = '{\n  "key": "value"\n}',
  className
}) => {
  const { addToast } = useStore();
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Auto-close templates dropdown
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync scroll positions
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = target.scrollTop;
      preRef.current.scrollLeft = target.scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = target.scrollTop;
    }
  };

  // Keyboard shortcut for tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newValue = val.substring(0, start) + '  ' + val.substring(end);
      onChange(newValue);

      // Reset cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // JSON Formatting
  const handleFormat = (spaces: number = 2) => {
    try {
      if (!value.trim()) {
        addToast('Editor is empty', 'warning', 1500);
        return;
      }
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, spaces));
      addToast(`Beautified JSON (${spaces} spaces)`, 'success', 1500);
    } catch (err: any) {
      addToast(`Format failed: ${err.message}`, 'error', 3000);
    }
  };

  // JSON Minification
  const handleMinify = () => {
    try {
      if (!value.trim()) {
        addToast('Editor is empty', 'warning', 1500);
        return;
      }
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed));
      addToast('Minified JSON to 1 line', 'success', 1500);
    } catch (err: any) {
      addToast(`Minify failed: ${err.message}`, 'error', 3000);
    }
  };

  // Copy code
  const handleCopy = () => {
    if (!value.trim()) {
      addToast('Nothing to copy', 'warning', 1500);
      return;
    }
    navigator.clipboard.writeText(value);
    setCopied(true);
    addToast('Copied payload to clipboard', 'success', 1500);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear code
  const handleClear = () => {
    onChange('');
    addToast('Editor cleared', 'info', 1500);
  };

  // Insert Template
  const handleSelectTemplate = (templateVal: string) => {
    onChange(templateVal);
    setShowTemplates(false);
    addToast('Template loaded', 'success', 1500);
  };

  // Highlight logic for JSON syntax
  const highlightedCode = useMemo(() => {
    if (!value) return '';

    // Escape raw HTML characters to prevent rendering vulnerability
    let escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Standard JSON token regex
    // Matches: string, number, boolean, null, object key (with training colon)
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'text-amber-500 font-semibold'; // Default: numbers (Yellow-amber)
        if (match.startsWith('"')) {
          if (match.endsWith(':')) {
            cls = 'text-sky-400 font-medium'; // Key (Sky blue)
          } else {
            cls = 'text-emerald-400 font-normal'; // String (Emerald green)
          }
        } else if (match === 'true' || match === 'false') {
          cls = 'text-violet-400 font-bold'; // Boolean (Purple)
        } else if (match === 'null') {
          cls = 'text-gray-500 font-normal italic'; // Null (Gray italic)
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }, [value]);

  // Real-time syntax check
  const jsonError = useMemo(() => {
    if (!value.trim()) return null;
    try {
      JSON.parse(value);
      return null;
    } catch (e: any) {
      return e.message;
    }
  }, [value]);

  // Dynamic lines array for the sidebar gutter
  const lines = useMemo(() => {
    const list = value.split('\n');
    return list.map((_, idx) => idx + 1);
  }, [value]);

  return (
    <div className={cn("flex flex-col flex-1 h-full min-h-[220px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] overflow-hidden shadow-sm", className)}>
      
      {/* Visual Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]/40 gap-2 select-none">
        
        {/* Left Side: Label & Errors */}
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">JSON Body</span>
          {jsonError ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/25 rounded text-[11px] text-red-400 font-medium">
              <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
              <span>Invalid JSON</span>
            </div>
          ) : value.trim() ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/25 rounded text-[11px] text-green-400 font-medium">
              <Check className="w-3 h-3 text-green-500" />
              <span>Valid JSON</span>
            </div>
          ) : null}
        </div>

        {/* Right Side: Code actions */}
        <div className="flex items-center gap-1">
          {/* Templates Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded transition-all flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>

            {showTemplates && (
              <div className="absolute right-0 mt-1.5 w-64 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Insert Quick JSON
                </div>
                {JSON_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.value)}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors flex flex-col border-b border-[var(--border-subtle)]/50 last:border-0"
                  >
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{tmpl.name}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{tmpl.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />

          {/* Format Spaces Dropdown/Actions */}
          <button
            type="button"
            title="Auto-format with 2 spaces"
            onClick={() => handleFormat(2)}
            className="p-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Format</span>
          </button>

          <button
            type="button"
            title="Minify to single line"
            onClick={handleMinify}
            className="p-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded transition-colors flex items-center gap-1"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minify</span>
          </button>

          <button
            type="button"
            title="Copy to clipboard"
            onClick={handleCopy}
            className="p-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            title="Clear all text"
            onClick={handleClear}
            className="p-1.5 text-xs text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 border border-[var(--border-strong)] hover:border-red-500/25 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Textarea & Highlighter Workspace */}
      <div className="flex-1 flex min-h-0 relative font-mono text-sm">
        
        {/* Code Gutter (Line Numbers) */}
        <div
          ref={lineNumbersRef}
          className="select-none text-right pr-3 pl-2 py-3 text-xs text-[var(--text-secondary)]/50 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)]/20 font-mono leading-5 overflow-hidden transition-colors"
          style={{ width: '3rem' }}
        >
          {lines.map((num) => (
            <div key={num} className="h-5">{num}</div>
          ))}
        </div>

        {/* Content Area with Layered Textarea and Syntax Highlighter */}
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          
          {/* Synchronized Highlighter block underneath */}
          <pre
            ref={preRef}
            className="absolute inset-0 w-full h-full p-3 pointer-events-none overflow-hidden font-mono text-sm leading-5 whitespace-pre bg-transparent border-0 margin-0"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '20px',
            }}
            dangerouslySetInnerHTML={{ __html: highlightedCode || `<span class="text-[var(--text-secondary)]/40">${placeholder}</span>` }}
          />

          {/* Interactive Textarea in frontend */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            placeholder={placeholder}
            className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-[var(--text-primary)] font-mono text-sm leading-5 whitespace-pre resize-none border-0 outline-none focus:ring-0 select-text overflow-auto"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '20px',
              color: 'transparent',
              WebkitTextFillColor: 'transparent', // Webkit specific flag to fully hide text under highlighter
            }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Visual Error Message banner at footer */}
      {jsonError && (
        <div className="px-3 py-2 bg-red-500/5 border-t border-red-500/10 text-xs font-mono text-red-400 flex items-start gap-2 select-text shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <span className="font-bold text-red-500">JSON Syntax Error:</span> {jsonError}
          </div>
        </div>
      )}
    </div>
  );
};
