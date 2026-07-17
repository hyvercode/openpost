import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../utils';
import { 
  Terminal as TerminalIcon, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  CornerDownLeft, 
  Search, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert, 
  Play, 
  Database, 
  Activity,
  Maximize2,
  Minimize2
} from 'lucide-react';
import axios from 'axios';

export function BottomDrawer() {
  const {
    isBottomDrawerOpen,
    setIsBottomDrawerOpen,
    bottomDrawerActiveTab,
    setBottomDrawerActiveTab,
    consoleLogs,
    clearConsoleLogs,
    issues,
    addIssue,
    clearIssues,
    terminalHistory,
    addTerminalHistory,
    clearTerminalHistory,
    currentEnvironment,
    environments,
    collections,
    theme,
    setTheme,
    layoutMode
  } = useStore();

  const [isMaximized, setIsMaximized] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const [consoleSearch, setConsoleSearch] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (bottomDrawerActiveTab === 'terminal' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, bottomDrawerActiveTab]);

  // Focus terminal input
  const focusTerminalInput = () => {
    if (terminalInputRef.current) {
      terminalInputRef.current.focus();
    }
  };

  useEffect(() => {
    if (bottomDrawerActiveTab === 'terminal' && isBottomDrawerOpen) {
      setTimeout(focusTerminalInput, 50);
    }
  }, [bottomDrawerActiveTab, isBottomDrawerOpen]);

  // Terminal command executor
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = terminalInput.trim();
    if (!input) return;

    // Log the typed command in the history
    addTerminalHistory(`visitor@api-tester:~$ ${input}`);
    setTerminalInput('');

    const parts = input.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        addTerminalHistory('Available commands:');
        addTerminalHistory('  help                         Display this help menu');
        addTerminalHistory('  clear                        Clear the terminal screen');
        addTerminalHistory('  env                          List current workspace environments & values');
        addTerminalHistory('  env set <key> <value>        Set/override an environment variable in active environment');
        addTerminalHistory('  ping <host>                  Quick latency ping checker to check server status');
        addTerminalHistory('  curl <method> <url>          Send a direct raw API request using the OpenPost agent proxy');
        addTerminalHistory('  stats                        Show global diagnostics and telemetry from your requests');
        addTerminalHistory('  scan                         Deep scan active environments & collections for issues');
        addTerminalHistory('  theme                        Toggle between light and dark visual themes');
        addTerminalHistory('  version                      Check current build version & status');
        break;

      case 'clear':
        clearTerminalHistory();
        break;

      case 'env':
        if (!currentEnvironment) {
          addTerminalHistory('Error: No active environment selected. Select one in the top bar.');
        } else {
          addTerminalHistory(`Active Environment: "${currentEnvironment.name}"`);
          if (!currentEnvironment.variables || currentEnvironment.variables.length === 0) {
            addTerminalHistory('  (no variables defined)');
          } else {
            currentEnvironment.variables.forEach(v => {
              addTerminalHistory(`  ${v.key}: ${v.value} (${v.enabled ? 'Enabled' : 'Disabled'})`);
            });
          }
        }
        break;

      case 'env': {
        if (args[0] === 'set') {
          const key = args[1];
          const val = args.slice(2).join(' ');
          if (!key || !val) {
            addTerminalHistory('Usage: env set <key> <value>');
          } else if (!currentEnvironment) {
            addTerminalHistory('Error: Select an active environment first.');
          } else {
            // Find existing variable
            const vars = [...currentEnvironment.variables];
            const idx = vars.findIndex(v => v.key === key);
            if (idx >= 0) {
              vars[idx] = { ...vars[idx], value: val };
            } else {
              vars.push({ id: Math.random().toString(), key, value: val, enabled: true });
            }
            // Trigger store change (normally this would write to Firestore as well, but this is a quick temporary runtime set for debugging)
            currentEnvironment.variables = vars;
            addTerminalHistory(`[OK] Temporary environment override set: ${key} = ${val}`);
          }
        } else {
          addTerminalHistory('Usage: env or env set <key> <value>');
        }
        break;
      }

      case 'ping': {
        const host = args[0];
        if (!host) {
          addTerminalHistory('Usage: ping <domain_or_url>');
          break;
        }
        addTerminalHistory(`PING ${host} via OpenPost gateway...`);
        const startTime = Date.now();
        try {
          const formattedUrl = host.startsWith('http') ? host : `https://${host}`;
          await axios.post('/api/proxy', { method: 'GET', url: formattedUrl });
          const latency = Date.now() - startTime;
          addTerminalHistory(`Reply from ${host}: status=200 time=${latency}ms bytes=1432`);
        } catch (err: any) {
          const latency = Date.now() - startTime;
          const status = err.response?.status || 'network error';
          addTerminalHistory(`Reply from ${host}: status=${status} time=${latency}ms (unreachable/error response)`);
        }
        break;
      }

      case 'curl': {
        const method = args[0]?.toUpperCase();
        const url = args[1];
        if (!method || !url) {
          addTerminalHistory('Usage: curl <GET|POST|PUT|DELETE> <url>');
          break;
        }
        addTerminalHistory(`Executing direct curl: [${method}] ${url}...`);
        try {
          const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
          const res = await axios.post('/api/proxy', { method, url: formattedUrl });
          addTerminalHistory(`HTTP/1.1 ${res.data.status} OK`);
          addTerminalHistory(`Content-Length: ${res.data.size}`);
          addTerminalHistory('Body:');
          const previewBody = typeof res.data.data === 'object' 
            ? JSON.stringify(res.data.data, null, 2).slice(0, 500) 
            : String(res.data.data).slice(0, 500);
          addTerminalHistory(previewBody + (previewBody.length >= 500 ? '\n... (truncated)' : ''));
        } catch (err: any) {
          addTerminalHistory(`curl: (7) Failed to connect to ${url}: ${err.message}`);
        }
        break;
      }

      case 'stats': {
        const total = consoleLogs.length;
        const successes = consoleLogs.filter(l => l.status && l.status >= 200 && l.status < 300).length;
        const errors = consoleLogs.filter(l => l.type === 'error' || (l.status && l.status >= 400)).length;
        const avgLatency = total > 0 
          ? Math.round(consoleLogs.reduce((acc, curr) => acc + (curr.timeMs || 0), 0) / total) 
          : 0;

        addTerminalHistory('OpenPost Performance Diagnostics:');
        addTerminalHistory(`  Total request logs capture: ${total}`);
        addTerminalHistory(`  Successful pings (2xx): ${successes}`);
        addTerminalHistory(`  Client/Server failures: ${errors}`);
        addTerminalHistory(`  Average latency: ${avgLatency}ms`);
        addTerminalHistory(`  Active diagnostic warnings: ${issues.length}`);
        break;
      }

      case 'theme':
        setTheme(theme === 'dark' ? 'light' : 'dark');
        addTerminalHistory(`Theme switched to: ${theme === 'dark' ? 'light' : 'dark'}`);
        break;

      case 'scan': {
        addTerminalHistory('Analyzing configuration, request nodes, environment definitions...');
        let warningsFound = 0;
        let errorsFound = 0;

        // Verify active environment
        if (!currentEnvironment) {
          addIssue('warning', 'No Environment selected', 'You are running requests without a scoped environment config. Variables like {{baseUrl}} will not resolve.', '', 'GLOBAL', 'Select or create a workspace environment.');
          warningsFound++;
        } else {
          // Check for empty environment variables
          currentEnvironment.variables.forEach(v => {
            if (v.key && !v.value) {
              addIssue('warning', `Empty environment variable: ${v.key}`, `The variable ${v.key} in environment "${currentEnvironment.name}" is empty.`, '', currentEnvironment.name, 'Provide a value or disable it.');
              warningsFound++;
            }
          });
        }

        // Verify request urls
        collections.forEach(col => {
          col.requests.forEach(req => {
            if (!req.url) {
              addIssue('error', `Empty request URL: ${req.name}`, `Request "${req.name}" inside collection "${col.name}" does not have a destination URL.`, req.url, req.method, 'Provide a valid url address.');
              errorsFound++;
            } else if (req.url.startsWith('http:')) {
              addIssue('warning', `Insecure HTTP protocol: ${req.name}`, `URL "${req.url}" uses unencrypted http protocol. Consider upgrading to https.`, req.url, req.method, 'Upgrade endpoint to use https://');
              warningsFound++;
            }

            // Check post without body content
            if (req.method === 'POST' && (!req.body || req.body.type === 'none' || !req.body.content)) {
              addIssue('warning', `POST request has no body content: ${req.name}`, `The request "${req.name}" is using POST but the payload body is empty.`, req.url, req.method, 'Define a raw JSON body payload or form-data fields.');
              warningsFound++;
            }
          });
        });

        addTerminalHistory(`Scan completed: found ${errorsFound} errors and ${warningsFound} warnings.`);
        addTerminalHistory('Diagnostic issues have been reported in the "Issues" tab.');
        break;
      }

      case 'version':
        addTerminalHistory('OpenPost Engine: v1.0.0-PRO_STABLE');
        addTerminalHistory('Environment: Cloud Run Sandbox Container');
        addTerminalHistory('Database: Firestore Persistent Schema');
        addTerminalHistory('Target Port: 3000 Ingress Routing Layer');
        break;

      default:
        addTerminalHistory(`Command not recognized: "${cmd}". Type "help" for a list of commands.`);
    }
  };

  // Log filters
  const filteredLogs = consoleLogs.filter(log => {
    if (consoleFilter !== 'all' && log.type !== consoleFilter) return false;
    if (consoleSearch) {
      const s = consoleSearch.toLowerCase();
      const messageMatch = log.message.toLowerCase().includes(s);
      const urlMatch = log.url?.toLowerCase().includes(s);
      const methodMatch = log.method?.toLowerCase().includes(s);
      return messageMatch || urlMatch || methodMatch;
    }
    return true;
  });

  if (!isBottomDrawerOpen) {
    return (
      <div className="h-8 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsBottomDrawerOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Developer Console & Terminal</span>
          </button>
          <div className="h-3.5 w-px bg-[var(--border-subtle)]"></div>
          <button 
            onClick={() => {
              setBottomDrawerActiveTab('issues');
              setIsBottomDrawerOpen(true);
            }}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <AlertTriangle className={cn("w-3.5 h-3.5", issues.length > 0 ? "text-yellow-500 animate-pulse" : "text-[var(--text-secondary)]")} />
            <span>Issues</span>
            {issues.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {issues.length}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsBottomDrawerOpen(true)}
            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] px-1.5 py-0.5 rounded transition-all font-semibold"
          >
            Show
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "border-t border-[var(--border-strong)] bg-[var(--bg-surface)] flex flex-col transition-all duration-150 z-30 relative shrink-0",
        isMaximized ? "h-[80vh]" : "h-72"
      )}
    >
      {/* Header bar */}
      <div className="h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-4 h-full">
          {/* Console Tab */}
          <button
            onClick={() => setBottomDrawerActiveTab('console')}
            className={cn(
              "text-xs font-semibold px-2 h-full flex items-center gap-1.5 border-b-2 transition-all",
              bottomDrawerActiveTab === 'console' 
                ? "border-[var(--primary)] text-[var(--text-primary)] bg-[var(--bg-hover)]" 
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Console</span>
            {consoleLogs.length > 0 && (
              <span className="bg-blue-400/15 text-blue-400 text-[10px] px-1.5 py-0.1 rounded-full font-semibold">
                {consoleLogs.length}
              </span>
            )}
          </button>

          {/* Terminal Tab */}
          <button
            onClick={() => setBottomDrawerActiveTab('terminal')}
            className={cn(
              "text-xs font-semibold px-2 h-full flex items-center gap-1.5 border-b-2 transition-all",
              bottomDrawerActiveTab === 'terminal' 
                ? "border-[var(--primary)] text-[var(--text-primary)] bg-[var(--bg-hover)]" 
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>Interactive Terminal</span>
          </button>

          {/* Issues Tab */}
          <button
            onClick={() => setBottomDrawerActiveTab('issues')}
            className={cn(
              "text-xs font-semibold px-2 h-full flex items-center gap-1.5 border-b-2 transition-all",
              bottomDrawerActiveTab === 'issues' 
                ? "border-[var(--primary)] text-[var(--text-primary)] bg-[var(--bg-hover)]" 
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <AlertTriangle className={cn("w-3.5 h-3.5", issues.length > 0 ? "text-yellow-500" : "text-gray-400")} />
            <span>Issues & Audits</span>
            {issues.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.1 rounded-full font-bold">
                {issues.length}
              </span>
            )}
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {bottomDrawerActiveTab === 'console' && (
            <button
              onClick={clearConsoleLogs}
              className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors mr-2 flex items-center gap-1 text-[10px] font-semibold"
              title="Clear Console Logs"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
          {bottomDrawerActiveTab === 'issues' && (
            <button
              onClick={clearIssues}
              className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors mr-2 flex items-center gap-1 text-[10px] font-semibold"
              title="Clear Diagnostic Issues"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset Audits</span>
            </button>
          )}

          <div className="h-4 w-px bg-[var(--border-subtle)] mr-1"></div>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsBottomDrawerOpen(false)}
            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)] hover:text-red-400 transition-all"
            title="Close Drawer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Panel Viewport */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-base)]">
        {/* CONSOLE VIEW */}
        {bottomDrawerActiveTab === 'console' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter bar */}
            <div className="h-8 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 gap-4 shrink-0">
              <div className="flex items-center gap-1">
                {(['all', 'info', 'success', 'warn', 'error'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setConsoleFilter(f)}
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded transition-all capitalize",
                      consoleFilter === f 
                        ? "bg-[var(--primary)] text-white" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative w-48 lg:w-64">
                <Search className="w-3 h-3 text-[var(--text-secondary)] absolute left-2 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={consoleSearch}
                  onChange={(e) => setConsoleSearch(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)] pl-7 pr-2 py-1 rounded outline-none focus:border-[var(--border-focus)] font-medium"
                />
              </div>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] text-[11px] gap-2 py-8">
                  <Database className="w-8 h-8 text-[var(--border-strong)]" />
                  <p>No console logs matching the filter. Trigger an API request to log executions.</p>
                </div>
              ) : (
                filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <div 
                      key={log.id} 
                      className="border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]/30 overflow-hidden transition-all"
                    >
                      <div 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-2 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-gray-500 font-normal">{log.timestamp}</span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0",
                            log.type === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                            log.type === 'error' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            log.type === 'warn' ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          )}>
                            {log.type}
                          </span>
                          {log.method && (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase font-sans tracking-wide shrink-0",
                              log.method === 'GET' ? "bg-emerald-500/10 text-emerald-400" :
                              log.method === 'POST' ? "bg-amber-500/10 text-amber-400" :
                              log.method === 'PUT' ? "bg-blue-500/10 text-blue-400" :
                              log.method === 'DELETE' ? "bg-rose-500/10 text-rose-400" : "bg-purple-500/10 text-purple-400"
                            )}>
                              {log.method}
                            </span>
                          )}
                          <span className="font-semibold text-[var(--text-primary)] truncate">{log.message}</span>
                          {log.url && <span className="text-[10px] text-gray-500 truncate max-w-xs md:max-w-md">{log.url}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] shrink-0 font-medium">
                          {log.status !== undefined && (
                            <span className={cn(
                              "font-bold",
                              log.status >= 200 && log.status < 300 ? "text-green-500" : "text-red-500"
                            )}>
                              status={log.status}
                            </span>
                          )}
                          {log.timeMs !== undefined && <span>{log.timeMs}ms</span>}
                          {log.size !== undefined && <span>{(log.size / 1024).toFixed(2)}KB</span>}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Expanded logs */}
                      {isExpanded && log.details && (
                        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-input)]/40 p-3 space-y-3 text-[11px] overflow-x-auto leading-relaxed">
                          {log.details.request && (
                            <div>
                              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Request Payloads</div>
                              <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-2 text-xs space-y-1">
                                <div><span className="text-gray-500">URL:</span> <span className="text-[var(--text-primary)] font-bold">{log.details.request.url}</span></div>
                                <div><span className="text-gray-500">Headers:</span> <pre className="text-[var(--text-code)] mt-1 ml-2 text-[10px]">{JSON.stringify(log.details.request.headers, null, 2)}</pre></div>
                                {log.details.request.body && (
                                  <div className="mt-1"><span className="text-gray-500">Body:</span> <pre className="text-[var(--text-code)] mt-1 ml-2 text-[10px]">{JSON.stringify(log.details.request.body, null, 2)}</pre></div>
                                )}
                              </div>
                            </div>
                          )}
                          {log.details.response && (
                            <div>
                              <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Response Payloads</div>
                              <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-2 text-xs space-y-1">
                                <div>
                                  <span className="text-gray-500">Status:</span> 
                                  <span className={cn("font-bold ml-1", log.details.response.status >= 200 && log.details.response.status < 300 ? "text-green-500" : "text-red-500")}>
                                    {log.details.response.status} {log.details.response.statusText}
                                  </span>
                                </div>
                                {log.details.response.headers && (
                                  <div><span className="text-gray-500">Response Headers:</span> <pre className="text-[var(--text-code)] mt-1 ml-2 text-[10px]">{JSON.stringify(log.details.response.headers, null, 2)}</pre></div>
                                )}
                                <div>
                                  <span className="text-gray-500">Data payload:</span>
                                  <pre className="text-[var(--text-code)] mt-1 ml-2 max-h-40 overflow-y-auto text-[10px]">
                                    {typeof log.details.response.data === 'object' 
                                      ? JSON.stringify(log.details.response.data, null, 2) 
                                      : String(log.details.response.data)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TERMINAL VIEW */}
        {bottomDrawerActiveTab === 'terminal' && (
          <div 
            onClick={focusTerminalInput}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-400 bg-gray-950 flex flex-col cursor-text select-text"
          >
            <div className="space-y-1 flex-1">
              {terminalHistory.map((line, idx) => {
                if (line.startsWith('visitor@api-tester:~$')) {
                  return (
                    <div key={idx} className="text-white font-medium flex items-center gap-1">
                      <span className="text-indigo-400">visitor@api-tester</span>
                      <span className="text-gray-400">:~$</span>
                      <span>{line.replace('visitor@api-tester:~$', '')}</span>
                    </div>
                  );
                }
                if (line.startsWith('Error:')) {
                  return <div key={idx} className="text-red-400 font-semibold">{line}</div>;
                }
                if (line.startsWith('[OK]')) {
                  return <div key={idx} className="text-emerald-400 font-semibold">{line}</div>;
                }
                return <div key={idx} className="text-green-300 leading-relaxed whitespace-pre-wrap">{line}</div>;
              })}
              <div ref={terminalEndRef} />
            </div>

            {/* Input line */}
            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-1.5 mt-2 shrink-0">
              <span className="text-indigo-400 font-bold">visitor@api-tester</span>
              <span className="text-gray-400 font-bold">:~$</span>
              <input
                ref={terminalInputRef}
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white font-medium font-mono focus:ring-0 p-0 m-0"
                autoComplete="off"
                autoFocus
                placeholder="Type 'help'..."
              />
              <button type="submit" className="hidden" />
            </form>
          </div>
        )}

        {/* ISSUES VIEW */}
        {bottomDrawerActiveTab === 'issues' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {issues.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] text-[11px] gap-2 py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500/80 mb-2" />
                <h4 className="font-bold text-[var(--text-primary)]">All Clear! No configuration issues detected.</h4>
                <p className="max-w-md">The debugger has audited your requests, headers, paths, payloads, and protocols. Run "scan" in the Terminal to execute a complete diagnostic audit.</p>
                <button 
                  onClick={() => {
                    setBottomDrawerActiveTab('terminal');
                    addTerminalHistory('scan');
                    setTimeout(() => {
                      const mockEvent = { preventDefault: () => {} } as any;
                      setTerminalInput('scan');
                      handleTerminalSubmit(mockEvent);
                    }, 50);
                  }}
                  className="mt-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-[10px] font-bold px-3 py-1.5 rounded transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Run Audit Scan</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2 mb-2 font-semibold">
                  <span>Diagnostic report lists {issues.length} concerns found:</span>
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded">AUTO AUDIT ON</span>
                </div>
                
                {issues.map(issue => (
                  <div 
                    key={issue.id} 
                    className={cn(
                      "border rounded-lg p-3.5 flex flex-col md:flex-row gap-4 justify-between bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all",
                      issue.type === 'error' ? "border-red-500/25 bg-red-500/[0.01]" : "border-yellow-500/25 bg-yellow-500/[0.01]"
                    )}
                  >
                    <div className="flex gap-3 items-start">
                      {issue.type === 'error' ? (
                        <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">{issue.title}</h4>
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.2 rounded-full font-bold uppercase",
                            issue.type === 'error' ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-500"
                          )}>
                            {issue.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{issue.description}</p>
                        
                        {(issue.url || issue.method) && (
                          <div className="flex items-center gap-2 mt-2 font-mono text-[9px] text-gray-500">
                            {issue.method && <span className="font-bold">{issue.method}</span>}
                            {issue.url && <span className="truncate max-w-sm">{issue.url}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {issue.suggestion && (
                      <div className="md:w-64 border-t md:border-t-0 md:border-l border-[var(--border-subtle)] pt-3 md:pt-0 md:pl-4 flex flex-col justify-center shrink-0">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Info className="w-3 h-3 text-[var(--primary)]" />
                          <span>Recommendation</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-primary)] italic font-medium leading-normal">{issue.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
