import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  X, BookOpen, TerminalSquare, Server, Code2, Play, Shield, 
  Cookie, FileCode, Search, Copy, Check, Sparkles, ChevronRight,
  Lightbulb, Zap, ArrowRight
} from 'lucide-react';
import { cn } from '../utils';

type SectionId = 'scripting' | 'mock-server' | 'graphql' | 'runner' | 'desktop-agent' | 'import-export' | 'cookies-history';

export function HelpGuideModal() {
  const { isHelpModalOpen, setIsHelpModalOpen } = useStore();
  const [activeSection, setActiveSection] = useState<SectionId>('scripting');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isHelpModalOpen) return null;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections: { id: SectionId; label: string; icon: any }[] = [
    { id: 'scripting', label: 'Scripting Sandbox (pm.*)', icon: TerminalSquare },
    { id: 'mock-server', label: 'Mock Servers & API Simulation', icon: Server },
    { id: 'graphql', label: 'GraphQL Schema & Explorer', icon: Sparkles },
    { id: 'runner', label: 'Automated Runner & CSV Data', icon: Play },
    { id: 'desktop-agent', label: 'Desktop Agent & Local Testing', icon: Shield },
    { id: 'import-export', label: 'OpenAPI & Postman Import/Export', icon: Code2 },
    { id: 'cookies-history', label: 'Cookies, Search & History', icon: Cookie },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6 animate-fadeIn">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">User Guide & Feature Documentation</h2>
              <p className="text-xs text-[var(--text-secondary)]">Master API testing, scripting, mocking, and automation features</p>
            </div>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 p-3 flex flex-col gap-1 shrink-0 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-3 py-2">
              Topics & Guides
            </span>
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all",
                    isActive
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content View */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-panel)] space-y-6">
            
            {/* SECTION 1: SCRIPTING SANDBOX */}
            {activeSection === 'scripting' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <TerminalSquare className="w-4 h-4" />
                    <span>Scripting Sandbox API</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Pre-request Scripts & Test Assertions</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Execute JavaScript code before sending a request or validate responses automatically using the Postman-compatible <code className="text-[var(--primary)] bg-[var(--bg-hover)] px-1 py-0.5 rounded font-mono">pm.*</code> sandbox API.
                  </p>
                </div>

                {/* Card 1: Pre-request script */}
                <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Pre-request Scripts
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Runs right before the request payload is constructed. Use it to dynamically generate timestamps, sign headers, or set environment variables.
                  </p>
                  <div className="relative">
                    <pre className="bg-[var(--bg-input)] border border-[var(--border-strong)] p-3 rounded-lg text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
{`// Set environment variables dynamically
pm.environment.set("timestamp", Date.now());
pm.environment.set("requestId", "REQ_" + Math.random().toString(36).substring(7));

// Inject or modify request headers
pm.request.headers.add({ key: "X-Custom-Header", value: "CustomValue" });`}
                    </pre>
                    <button
                      onClick={() => handleCopy(`pm.environment.set("timestamp", Date.now());\npm.environment.set("requestId", "REQ_" + Math.random().toString(36).substring(7));\npm.request.headers.add({ key: "X-Custom-Header", value: "CustomValue" });`, 'pre-req')}
                      className="absolute top-2 right-2 p-1.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                      title="Copy Code"
                    >
                      {copiedCode === 'pre-req' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Card 2: Tests script */}
                <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Test Scripts & Assertions
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Runs after the HTTP response is received. Write assertions using <code className="text-[var(--primary)] font-mono">pm.test</code> and inspect responses using <code className="text-[var(--primary)] font-mono">pm.response.json()</code>.
                  </p>
                  <div className="relative">
                    <pre className="bg-[var(--bg-input)] border border-[var(--border-strong)] p-3 rounded-lg text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
{`// 1. Verify Status Code
pm.test("Status code is 200", function () {
    pm.expect(pm.response.code).to.equal(200);
});

// 2. Parse JSON Response Body & Verify Data
pm.test("Response contains user token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.token).to.be.a('string');
    
    // Pass authentication token to next requests
    pm.environment.set("authToken", jsonData.token);
});

// 3. Response Time Check
pm.test("Response time is under 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});`}
                    </pre>
                    <button
                      onClick={() => handleCopy(`pm.test("Status code is 200", function () {\n    pm.expect(pm.response.code).to.equal(200);\n});\n\nconst jsonData = pm.response.json();\npm.environment.set("authToken", jsonData.token);`, 'test-script')}
                      className="absolute top-2 right-2 p-1.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                      title="Copy Code"
                    >
                      {copiedCode === 'test-script' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-200 leading-relaxed">
                    <strong>Pro Tip:</strong> Snippet buttons are built into the <strong>Scripts</strong> tab in the Request Panel. Click any preset snippet (e.g. <em>Status code: 200</em> or <em>Set Environment Variable</em>) to insert template code instantly.
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: MOCK SERVER */}
            {activeSection === 'mock-server' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <Server className="w-4 h-4" />
                    <span>Mock Server & API Simulation</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Simulating Endpoints Before Backend is Ready</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Create mock server responses directly inside requests or manage full mock servers to unblock frontend development.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                      <span className="w-6 h-6 rounded bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-xs">1</span>
                      Define Mock Response
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Open the <strong>Mock Response</strong> tab in any request. Define status code (e.g., 200 OK, 404 Not Found), custom response headers, and the JSON payload.
                    </p>
                  </div>

                  <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                      <span className="w-6 h-6 rounded bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-xs">2</span>
                      Toggle Mock Response
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Toggle <strong>Enable Mock Response</strong> to ON. Sending a request to that URL will return your defined JSON response instantly without making a live network call.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Server className="w-4 h-4 text-[var(--primary)]" />
                    Mock Server Management View
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Switch to <strong>Mock API Servers</strong> in the left sidebar navigation tab. You can list all active endpoints, edit JSON content on the fly, toggle them on/off, or copy public mock URLs for frontend integration.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 3: GRAPHQL */}
            {activeSection === 'graphql' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>GraphQL Studio</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">GraphQL Schema Explorer & Live Validation</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Full GraphQL testing suite with automatic schema introspection, visual query builder, syntax highlighting, and variable editor.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">1. Schema Introspection</h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Set method to <strong>GQL</strong> or select <strong>GraphQL</strong> in the Body tab. Click <strong>Introspect Schema</strong> to automatically fetch types, fields, queries, and mutations from the GraphQL server.
                    </p>
                  </div>

                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">2. Visual Query Builder</h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Open the <strong>Schema Explorer</strong> panel on the right. Expand types and click fields to visually insert queries and mutations directly into the GraphQL query editor.
                    </p>
                  </div>

                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">3. GraphQL Variables & History</h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Provide JSON variables in the <strong>Variables</strong> pane below the query editor. History items are saved automatically so you can reload previous queries easily.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: RUNNER */}
            {activeSection === 'runner' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <Play className="w-4 h-4" />
                    <span>Automated Collection Runner</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Sequential Testing & Data-Driven CSV Execution</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Run all requests in a folder or collection sequentially, track pass/fail test results, and perform data-driven testing using CSV/JSON files.
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Data-Driven Testing Setup</h4>
                  <ol className="text-xs text-[var(--text-secondary)] space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Click <strong>Run Collection</strong> on any collection or folder in the sidebar.</li>
                    <li>Upload a <strong>CSV</strong> or <strong>JSON</strong> file containing data rows (e.g. headers <code className="font-mono text-[var(--primary)]">user_email, role</code>).</li>
                    <li>In your request URL, headers, or body, use variables matching the column names: <code className="font-mono text-[var(--primary)]">{"{{user_email}}"}</code>.</li>
                    <li>The Runner will iterate through every row in the file, executing the full suite of requests for each iteration and displaying a live progress report.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* SECTION 5: DESKTOP AGENT */}
            {activeSection === 'desktop-agent' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <Shield className="w-4 h-4" />
                    <span>Desktop Agent Bridge & SSRF Protection</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Testing Localhost & Private Network APIs</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    To prevent Server-Side Request Forgery (SSRF) vulnerabilities, web applications block direct requests to private IPs (e.g. <code className="font-mono text-[var(--primary)]">localhost</code>, <code className="font-mono text-[var(--primary)]">127.0.0.1</code>, <code className="font-mono text-[var(--primary)]">192.168.x.x</code>).
                  </p>
                </div>

                <div className="bg-[var(--bg-surface)] p-5 rounded-lg border border-[var(--border-subtle)] space-y-4">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">How to test local APIs:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Click the <strong>Desktop Agent Download</strong> icon in the top header bar, or run <code className="font-mono bg-[var(--bg-hover)] px-1 py-0.5 rounded text-[var(--text-primary)]">npm run bridge</code> in your local terminal.
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <div className="text-xs text-[var(--text-secondary)]">
                        The app automatically pings <code className="font-mono text-[var(--primary)]">http://localhost:8765</code> and switches connection mode to <strong>Desktop Agent</strong>.
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--primary)]/20 text-[var(--primary)] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Now you can seamlessly test <code className="font-mono text-[var(--text-primary)]">http://localhost:3000</code> or any local endpoint without CORS or network blocking issues!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: IMPORT & EXPORT */}
            {activeSection === 'import-export' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <Code2 className="w-4 h-4" />
                    <span>Import & Export Compatibility</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">OpenAPI, Postman, cURL & API Gateways</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Seamlessly import existing API specifications or export collections to popular formats and API gateway configurations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Supported Imports</h4>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                      <li><strong>OpenAPI 3.0 / Swagger JSON & YAML</strong></li>
                      <li><strong>Postman Collection v2.1 JSON</strong></li>
                      <li><strong>cURL Command String</strong></li>
                      <li><strong>Environment Files</strong></li>
                    </ul>
                  </div>

                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Export Options</h4>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                      <li><strong>Full Workspace Backup (JSON)</strong></li>
                      <li><strong>Single Collection JSON (Backup)</strong></li>
                      <li><strong>Postman v2.1 JSON Format</strong></li>
                      <li><strong>OpenAPI 3.0 YAML / JSON</strong></li>
                      <li><strong>Kong API Gateway Config</strong></li>
                      <li><strong>Spring Cloud Gateway Routes</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 7: COOKIES & HISTORY */}
            {activeSection === 'cookies-history' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-1">
                    <Cookie className="w-4 h-4" />
                    <span>Cookies, Search & Command Palette</span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Cookie Management & Universal Search</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Manage session cookies across domain names and jump between requests using quick search keyboard shortcuts.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-amber-500" />
                      Cookies Manager
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Access the Cookie Manager from the left navigation tab. Define domain cookies (e.g. <code className="font-mono text-[var(--primary)]">session_id=xyz</code> for <code className="font-mono text-[var(--text-primary)]">api.example.com</code>). Matching cookies will automatically be injected into outgoing requests for that domain.
                    </p>
                  </div>

                  <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                      <Search className="w-4 h-4 text-[var(--primary)]" />
                      Universal Command Palette (<kbd className="font-mono bg-[var(--bg-hover)] px-1 rounded text-[10px]">⌘K</kbd> / <kbd className="font-mono bg-[var(--bg-hover)] px-1 rounded text-[10px]">Ctrl+K</kbd>)
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Press <kbd className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-primary)] font-semibold">Cmd+K</kbd> or <kbd className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-primary)] font-semibold">Ctrl+K</kbd> anywhere in the application to open the quick search overlay. Instant jump to any request, collection, folder, or environment variable.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="text-xs text-[var(--text-secondary)]">
            Need more help? Visit our documentation or check project release notes.
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Got it, close guide
          </button>
        </div>

      </div>
    </div>
  );
}
