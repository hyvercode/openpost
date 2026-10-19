import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare, Sparkles, X, Code2 } from 'lucide-react';

export function parseCurlCommand(curl: string): {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
} {
  let method = 'GET';
  let url = '';
  const headers: Array<{ key: string; value: string }> = [];
  let body = '';

  // Normalize multi-line cURL strings with backslashes
  const normalized = curl
    .replace(/\\\r?\n/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();

  // Extract Method (-X POST, -XPOST, --request POST, --request=POST)
  const methodMatch = normalized.match(/(?:-X\s*|--request(?:\s+|=))([A-Za-z]+)/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  }

  // Extract Headers (-H "Key: Value", -H 'Key: Value', --header "Key: Value")
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)"|([^\s]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(normalized)) !== null) {
    const headerStr = match[1] || match[2] || match[3];
    if (headerStr) {
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        headers.push({ key, value });
      }
    }
  }

  // Extract Body (-d '...', --data '...', --data-raw '...', --data-binary '...')
  const bodyRegex = /(?:-d|--data|--data-raw|--data-ascii|--data-binary|--data-urlencode)\s+(?:'([\s\S]*?)'|"([\s\S]*?)"|([^\s]+))/gi;
  const bodyMatch = bodyRegex.exec(normalized);
  if (bodyMatch) {
    body = bodyMatch[1] ?? bodyMatch[2] ?? bodyMatch[3] ?? '';
    // Default to POST if data is supplied and method wasn't explicitly set
    if (!methodMatch) {
      method = 'POST';
    }
  }

  // Extract URL
  // First attempt: match explicit http(s) URL
  const urlMatch = normalized.match(/(?:^|\s)(?:'|")?(https?:\/\/[^\s'"]+)(?:'|")?(?:\s|$)/i);
  if (urlMatch) {
    url = urlMatch[1];
  } else {
    // Fallback: search for first non-flag argument that looks like a host or URL
    const tokens = normalized.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i].replace(/^['"]|['"]$/g, '');
      if (token === 'curl' || token === 'CURL') continue;
      
      // Skip flags and their arguments
      if (token.startsWith('-')) {
        if (['-X', '--request', '-H', '--header', '-d', '--data', '--data-raw', '--data-ascii', '--data-binary', '-u', '-A', '-b'].includes(tokens[i])) {
          i++; // skip next value
        }
        continue;
      }

      if (token.includes('.') || token.includes('localhost') || token.startsWith('http')) {
        if (!token.startsWith('http://') && !token.startsWith('https://')) {
          token = 'https://' + token;
        }
        url = token;
        break;
      }
    }
  }

  return { method, url, headers, body };
}

interface CurlImportModalProps {
  isOpen: boolean;
  onImport: (curlData: { method: string; url: string; headers: Array<{ key: string; value: string }>; body: string }) => void;
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
    const parsed = parseCurlCommand(curl);
    onImport(parsed);
  };

  const setSampleGet = () => {
    setCurl(`curl -X GET "https://api.github.com/users/octocat/repos?per_page=5" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "User-Agent: API-Client-App"`);
  };

  const setSamplePost = () => {
    setCurl(`curl -X POST "https://jsonplaceholder.typicode.com/posts" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sample_token_12345" \\
  -d '{\n  "title": "New Post",\n  "body": "This is a test post imported via cURL command.",\n  "userId": 1\n}'`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/30">
              <TerminalSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Import from cURL</h3>
              <p className="text-xs text-[var(--text-secondary)]">Paste a cURL command string to auto-populate request settings</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
            <span>cURL Command String</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Quick Samples:</span>
              <button
                type="button"
                onClick={setSampleGet}
                className="text-[11px] text-[var(--primary)] hover:underline font-semibold"
              >
                GET Repos
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={setSamplePost}
                className="text-[11px] text-[var(--primary)] hover:underline font-semibold"
              >
                POST JSON
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={curl}
            onChange={(e) => setCurl(e.target.value)}
            placeholder={`curl -X POST "https://api.example.com/v1/resource" \\\n  -H "Authorization: Bearer token123" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Sample"}'`}
            className="w-full h-44 bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg p-3 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/40 transition-all resize-none"
          />

          <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
            <p>
              Auto-detects method (<code className="text-[var(--text-primary)] font-bold">-X</code>), URL, headers (<code className="text-[var(--text-primary)] font-bold">-H</code>), and payload body (<code className="text-[var(--text-primary)] font-bold">-d</code>) from single or multiline cURL strings.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!curl.trim()}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-[var(--primary)] hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Import to Request</span>
          </button>
        </div>

      </div>
    </div>
  );
}

