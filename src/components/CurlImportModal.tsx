import { useState, useEffect, useRef } from 'react';

interface CurlImportModalProps {
  isOpen: boolean;
  onImport: (curlData: { method: string, url: string, headers: Array<{key: string, value: string}>, body: string }) => void;
  onCancel: () => void;
}

export function CurlImportModal({ isOpen, onImport, onCancel }: CurlImportModalProps) {
  const [curl, setCurl] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurl('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleImport = () => {
    if (!curl.trim()) return;

    // Simple cURL parser
    let method = 'GET';
    let url = '';
    const headers: Array<{key: string, value: string}> = [];
    let body = '';

    // Remove newlines and backslashes that are just escaping newlines
    let normalized = curl.replace(/\\\n/g, ' ').replace(/\n/g, ' ');
    
    // Extract method
    const methodMatch = normalized.match(/-X\s+([A-Z]+)|--request\s+([A-Z]+)/);
    if (methodMatch) {
      method = methodMatch[1] || methodMatch[2];
    }

    // Extract URL (usually the first thing that looks like a URL or starts with http)
    // We'll look for something starting with 'http' or 'https' and not preceded by an option flag
    const urlMatch = normalized.match(/(?:^|\s)(?:'|")?(https?:\/\/[^\s'"]+)(?:'|")?(?:\s|$)/);
    if (urlMatch) {
      url = urlMatch[1];
    } else {
        // Fallback: look for the first non-option argument
        const args = normalized.split(/\s+/);
        for (let i = 1; i < args.length; i++) {
            if (!args[i].startsWith('-') && !args[i-1].match(/-(X|H|d|b|u|A|e|r)/)) {
                url = args[i].replace(/^['"]|['"]$/g, '');
                break;
            }
        }
    }

    // Extract headers
    const headerRegex = /-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = headerRegex.exec(normalized)) !== null) {
      const headerStr = match[1] || match[2];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        headers.push({ key, value });
      }
    }

    // Extract body
    const bodyRegex = /(?:-d|--data|--data-raw|--data-ascii|--data-binary)\s+('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
    const bodyMatch = bodyRegex.exec(normalized);
    if (bodyMatch) {
      body = bodyMatch[1].slice(1, -1); // Remove quotes
      // If no explicit method, it usually defaults to POST if data is provided
      if (!methodMatch) method = 'POST';
    }

    onImport({ method, url, headers, body });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg p-5 w-[600px] shadow-2xl">
        <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-4">Import cURL</h3>
        <textarea
          ref={textareaRef}
          value={curl}
          onChange={e => setCurl(e.target.value)}
          placeholder="Paste your cURL command here..."
          className="w-full h-40 bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#555] transition-colors mb-5 resize-none"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!curl.trim()}
            className="px-4 py-1.5 text-xs bg-[var(--primary)] hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
