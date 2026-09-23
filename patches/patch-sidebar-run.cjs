const fs = require('fs');

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// add imports
if (!sidebar.includes('import { runScriptSandbox }')) {
    sidebar = sidebar.replace(
        "import { apiService } from '../lib/api';",
        "import { apiService } from '../lib/api';\nimport { runScriptSandbox } from '../utils/sandbox';"
    );
}
if (!sidebar.includes('Play,')) {
    sidebar = sidebar.replace(
        "import { Plus, Folder, FileJson, Trash2, Edit2, Copy, Search, MoreVertical, Server, Activity, ChevronRight, ChevronDown, CheckSquare, Square, Download, Move } from 'lucide-react';",
        "import { Plus, Folder, FileJson, Trash2, Edit2, Copy, Search, MoreVertical, Server, Activity, ChevronRight, ChevronDown, CheckSquare, Square, Download, Move, Play } from 'lucide-react';"
    );
}

if (!sidebar.includes('function interpolateString')) {
    sidebar = sidebar.replace(
        "export function Sidebar() {",
        "function interpolateString(str: string, vars: any[]): string {\n  if (!str) return '';\n  let result = str;\n  vars.forEach(v => {\n    if (v.key && v.enabled !== false) {\n      const regex = new RegExp(`\\\\{\\\\{${v.key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\\\}\\\\}`, 'g');\n      result = result.replace(regex, v.value || '');\n    }\n  });\n  return result;\n}\n\nexport function Sidebar() {"
    );
}

if (!sidebar.includes('const handleBulkRun')) {
    const handleBulkRunCode = `
  const handleBulkRun = async () => {
    if (selectedRequestIds.length === 0) return;
    
    const requestsToRun = selectedRequestIds
      .map(id => collections.flatMap(c => c.requests || []).find(r => r.id === id))
      .filter(Boolean) as RequestItem[];
      
    if (requestsToRun.length === 0) return;

    useStore.getState().setBulkRunReport(null);
    useStore.getState().setIsBulkRunning(true);
    useStore.getState().setBulkRunStopRequested(false);
    useStore.getState().setActiveRequest(null);
    useStore.getState().setActiveView('request');
    setIsBulkEditMode(false);
    
    const startTime = new Date().toISOString();
    const executedSteps = [];
    const activeEnvVars = currentEnvironment ? [...currentEnvironment.variables] : [];
    let runtimeVars = [...activeEnvVars];
    
    let passedCount = 0;
    let failedCount = 0;
    let totalDurationMs = 0;

    for (let i = 0; i < requestsToRun.length; i++) {
      if (useStore.getState().bulkRunStopRequested) break;
      
      const req = requestsToRun[i];
      const startMs = Date.now();
      
      try {
        let prepReq = JSON.parse(JSON.stringify(req));
        
        if (prepReq.preRequestScript && prepReq.preRequestScript.trim()) {
          try {
            const preResult = runScriptSandbox(prepReq.preRequestScript, {
              envVars: runtimeVars,
              requestInfo: {
                url: prepReq.url,
                method: prepReq.method,
                headers: prepReq.headers.reduce((acc, h) => { if (h.key && h.enabled !== false) acc[h.key] = h.value; return acc; }, {}),
              }
            });
            runtimeVars = preResult.envVars;
          } catch (e) {
            console.error("Pre-request script error:", e);
          }
        }
        
        const config = {
          url: interpolateString(prepReq.url, runtimeVars),
          method: prepReq.method,
          headers: prepReq.headers.filter(h => h.key && h.enabled !== false).reduce((acc, h) => {
            acc[interpolateString(h.key, runtimeVars)] = interpolateString(h.value, runtimeVars);
            return acc;
          }, {}),
          params: prepReq.params.filter(p => p.key && p.enabled !== false).reduce((acc, p) => {
            acc[interpolateString(p.key, runtimeVars)] = interpolateString(p.value, runtimeVars);
            return acc;
          }, {}),
          data: prepReq.body?.type === 'json' || prepReq.body?.type === 'text' || prepReq.body?.type === 'xml'
            ? interpolateString(prepReq.body?.content || '', runtimeVars)
            : undefined
        };
        
        const proxyConfig = useStore.getState().proxyConfig;
        const useDesktopAgent = useStore.getState().agentMode === 'desktop';
        const proxyUrl = useDesktopAgent 
          ? 'http://127.0.0.1:8765/api/proxy'
          : proxyConfig.enabled ? proxyConfig.url : '/api/proxy';

        const res = await apiService.proxyRequest(config, proxyUrl, useDesktopAgent);
        const duration = Date.now() - startMs;
        totalDurationMs += duration;
        
        const responseData = res.data;
        const responseStatus = res.status;
        const responseStatusText = res.statusText || '';
        const responseHeaders = res.headers || {};
        
        let tests = [];
        let testsPassed = true;
        
        if (prepReq.postResponseScript && prepReq.postResponseScript.trim()) {
          try {
            const postResult = runScriptSandbox(prepReq.postResponseScript, {
              envVars: runtimeVars,
              response: {
                data: responseData,
                status: responseStatus,
                statusText: responseStatusText,
                headers: responseHeaders,
                time: duration,
              }
            });
            runtimeVars = postResult.envVars;
            tests = postResult.tests || [];
            testsPassed = tests.every(t => t.passed);
          } catch (e) {
            testsPassed = false;
            tests.push({ name: 'Script Execution', passed: false, error: String(e) });
          }
        }
        
        const passed = (responseStatus >= 200 && responseStatus < 400) && testsPassed;
        if (passed) passedCount++;
        else failedCount++;
        
        executedSteps.push({
          id: \`bulk-\${Date.now()}-\${i}\`,
          iteration: 1,
          requestId: req.id,
          requestName: req.name,
          method: req.method,
          url: config.url,
          statusCode: responseStatus,
          statusText: responseStatusText,
          durationMs: duration,
          sizeBytes: JSON.stringify(responseData).length,
          passed,
          tests,
          requestInfo: { headers: config.headers, body: config.data },
          responseInfo: { headers: responseHeaders, body: typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2) },
          logs: []
        });
        
        useStore.getState().setBulkRunReport({
          collectionId: 'bulk',
          collectionName: 'Bulk Run',
          startTime,
          totalExecutions: executedSteps.length,
          passedCount,
          failedCount,
          totalDurationMs,
          avgLatencyMs: Math.round(totalDurationMs / executedSteps.length),
          passRate: Math.round((passedCount / executedSteps.length) * 100),
          steps: executedSteps
        });
        
      } catch (err) {
         const duration = Date.now() - startMs;
         totalDurationMs += duration;
         failedCount++;
         executedSteps.push({
          id: \`bulk-\${Date.now()}-\${i}\`,
          iteration: 1,
          requestId: req.id,
          requestName: req.name,
          method: req.method,
          url: req.url,
          statusCode: 0,
          statusText: 'Error',
          durationMs: duration,
          sizeBytes: 0,
          passed: false,
          tests: [{ name: 'Request Execution', passed: false, error: err.message || String(err) }],
          requestInfo: { headers: {}, body: '' },
          responseInfo: { headers: {}, body: String(err) },
          logs: []
        });
        useStore.getState().setBulkRunReport({
          collectionId: 'bulk',
          collectionName: 'Bulk Run',
          startTime,
          totalExecutions: executedSteps.length,
          passedCount,
          failedCount,
          totalDurationMs,
          avgLatencyMs: Math.round(totalDurationMs / executedSteps.length),
          passRate: Math.round((passedCount / executedSteps.length) * 100),
          steps: executedSteps
        });
      }
    }
    
    useStore.getState().setIsBulkRunning(false);
    setSelectedRequestIds([]);
  };
`;

    sidebar = sidebar.replace(
        "const handleBulkDelete = () => {",
        handleBulkRunCode + "\n  const handleBulkDelete = () => {"
    );
}

const bulkRunButton = `
            <button
              onClick={handleBulkRun}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 ml-2"
              title="Run Selected Requests"
            >
              <Play className="w-3.5 h-3.5" />
              Run Selected
            </button>
`;

if (!sidebar.includes('Run Selected Requests')) {
    sidebar = sidebar.replace(
        "className=\"p-1.5 hover:bg-white/10 rounded transition-colors\"\n              title=\"Move Selected\"\n            >\n              <Move className=\"w-4 h-4\" />\n            </button>",
        "className=\"p-1.5 hover:bg-white/10 rounded transition-colors\"\n              title=\"Move Selected\"\n            >\n              <Move className=\"w-4 h-4\" />\n            </button>\n" + bulkRunButton
    );
}

fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');
console.log("Sidebar patched with bulk run logic.");
