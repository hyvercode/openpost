import { v4 as uuidv4 } from 'uuid';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { useStore } from '../store/useStore';
import { 
  Play, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Activity, BarChart2,
  Folder, Settings2, Download, Printer, Filter, Clock, ChevronDown, ChevronRight, CheckSquare,
  Square, Zap, RotateCcw, Sliders, Search, StopCircle, Eye, EyeOff, FileText, Check, Layers
} from 'lucide-react';
import { TestSuite, TestCase, TestAssertion, RequestItem, ApiCollection, KeyValue, ExecutedTestStep, CollectionRunReport } from '../types';
import { apiService } from '../lib/api';
import { runScriptSandbox } from '../utils/sandbox';
import { cn } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';





function interpolateString(str: string, vars: KeyValue[]): string {
  if (!str) return '';
  let result = str;
  vars.forEach(v => {
    if (v.key && v.enabled !== false) {
      const regex = new RegExp(`\\{\\{${v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      result = result.replace(regex, v.value || '');
    }
  });
  return result;
}

export function TestRunnerPanel() {
  const { 
    activeTabId, 
    testSuites, 
    updateTestSuite, 
    collections, 
    currentWorkspace, 
    environments, 
    currentEnvironment, 
    proxyConfig, 
    addToast,
    addConsoleLog 
  } = useStore();

  const [mainMode, setMainMode] = useState<'collection_runner' | 'custom_suites'>('collection_runner');

  // Check if opened from Sidebar with target runner_ collection or folder
  useEffect(() => {
    if (activeTabId?.startsWith('runner_folder_')) {
      const folderId = activeTabId.replace('runner_folder_', '');
      const parentCol = collections.find(c => c.folders?.some(f => f.id === folderId));
      if (parentCol) {
        setSelectedCollectionId(parentCol.id);
        setSelectedFolderId(folderId);
        setMainMode('collection_runner');
      }
    } else if (activeTabId?.startsWith('runner_')) {
      const colId = activeTabId.replace('runner_', '');
      const parentCol = collections.find(c => c.id === colId);
      if (parentCol) {
        setSelectedCollectionId(parentCol.id);
        setSelectedFolderId('all');
        setMainMode('collection_runner');
      }
    }
  }, [activeTabId, collections]);

  // Collection Runner Config State
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(() => collections[0]?.id || '');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedEnvId, setSelectedEnvId] = useState<string>(() => currentEnvironment?.id || '');
  const [iterations, setIterations] = useState<number>(1);
  const [delayMs, setDelayMs] = useState<number>(100);
  const [stopOnError, setStopOnError] = useState<boolean>(false);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [dataFileRows, setDataFileRows] = useState<any[]>([]);
  
  const [disabledRequestIds, setDisabledRequestIds] = useState<Set<string>>(new Set());

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const stopRequestedRef = useRef(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number; iteration: number } | null>(null);
  const [runReport, setRunReport] = useState<CollectionRunReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'tests' | 'request' | 'response' | 'logs'>('tests');

  // Custom Test Suite State (for custom_suites mode)
  const [customSuiteResults, setCustomSuiteResults] = useState<Record<string, { success: boolean; log: string[] }>>({});
  const [customSuiteView, setCustomSuiteView] = useState<'tests' | 'dashboard'>('tests');

  const selectedCollection = useMemo(() => {
    return collections.find(c => c.id === selectedCollectionId) || collections[0];
  }, [collections, selectedCollectionId]);

  const availableFolders = useMemo(() => {
    return selectedCollection?.folders || [];
  }, [selectedCollection]);

  const targetRequests = useMemo(() => {
    if (!selectedCollection) return [];
    let reqs = selectedCollection.requests || [];
    if (selectedFolderId !== 'all') {
      reqs = reqs.filter(r => r.folderId === selectedFolderId);
    }
    return reqs;
  }, [selectedCollection, selectedFolderId]);

  const selectedRequestsToRun = useMemo(() => {
    return targetRequests.filter(r => !disabledRequestIds.has(r.id));
  }, [targetRequests, disabledRequestIds]);

  const activeEnvVars = useMemo(() => {
    const env = environments.find(e => e.id === selectedEnvId);
    return env?.variables || [];
  }, [environments, selectedEnvId]);

  const toggleRequestSelection = (reqId: string) => {
    const next = new Set(disabledRequestIds);
    if (next.has(reqId)) {
      next.delete(reqId);
    } else {
      next.add(reqId);
    }
    setDisabledRequestIds(next);
  };

  const toggleSelectAll = () => {
    if (disabledRequestIds.size > 0) {
      setDisabledRequestIds(new Set());
    } else {
      const allIds = new Set(targetRequests.map(r => r.id));
      setDisabledRequestIds(allIds);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDataFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          if (Array.isArray(json)) {
            setDataFileRows(json);
            setIterations(json.length);
          } else {
            addToast('JSON file must contain an array of objects.', 'warning');
          }
        } catch (err) {
          addToast('Failed to parse JSON file.', 'error');
        }
      } else if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setDataFileRows(results.data);
            setIterations(results.data.length);
          },
          error: (error) => {
            addToast(`Failed to parse CSV: ${error.message}`, 'error');
          }
        });
      }
    };
    reader.readAsText(file);
  };

  // Run Collection Sequentially
  const handleRunCollection = async () => {
    if (selectedRequestsToRun.length === 0) {
      addToast('No requests selected to run.', 'warning');
      return;
    }

    setIsRunning(true);
    stopRequestedRef.current = false;
    const totalSteps = selectedRequestsToRun.length * iterations;
    let completedSteps = 0;

    const startTime = new Date().toISOString();
    const executedSteps: ExecutedTestStep[] = [];
    let runtimeVars = [...activeEnvVars];

    let passedCount = 0;
    let failedCount = 0;
    let totalDurationMs = 0;

    const targetFolder = availableFolders.find(f => f.id === selectedFolderId);

    setRunReport({
      collectionId: selectedCollection.id,
      collectionName: selectedCollection.name,
      folderName: targetFolder?.name,
      startTime,
      totalExecutions: 0,
      passedCount: 0,
      failedCount: 0,
      totalDurationMs: 0,
      avgLatencyMs: 0,
      passRate: 100,
      steps: []
    });

    for (let iter = 1; iter <= iterations; iter++) {
      if (stopRequestedRef.current) break;

      // Inject data file variables for this iteration
      if (dataFileRows && dataFileRows.length > 0) {
        const rowIdx = iter - 1;
        const rowData = dataFileRows[rowIdx % dataFileRows.length];
        if (rowData && typeof rowData === 'object') {
          Object.entries(rowData).forEach(([key, value]) => {
            const existingIdx = runtimeVars.findIndex(v => v.key === key);
            if (existingIdx !== -1) {
              runtimeVars[existingIdx] = { ...runtimeVars[existingIdx], value: String(value) };
            } else {
              runtimeVars.push({ id: uuidv4(), key, value: String(value), enabled: true });
            }
          });
        }
      }

      for (let i = 0; i < selectedRequestsToRun.length; i++) {
        if (stopRequestedRef.current) break;

        const originalReq = selectedRequestsToRun[i];
        completedSteps++;
        setCurrentProgress({ current: completedSteps, total: totalSteps, iteration: iter });

        if (delayMs > 0 && completedSteps > 1) {
          await new Promise(r => setTimeout(r, delayMs));
        }

        // 1. Interpolate variables
        const prepReq: RequestItem = {
          ...originalReq,
          url: interpolateString(originalReq.url, runtimeVars),
          headers: (originalReq.headers || []).map(h => ({
            ...h,
            value: interpolateString(h.value, runtimeVars)
          })),
          params: (originalReq.params || []).map(p => ({
            ...p,
            value: interpolateString(p.value, runtimeVars)
          })),
          body: {
            ...originalReq.body,
            content: interpolateString(originalReq.body?.content || '', runtimeVars)
          }
        };

        const logs: Array<{ type: string; message: string }> = [];

        // 2. Pre-request Script execution
        if (prepReq.preRequestScript && prepReq.preRequestScript.trim()) {
          try {
            const preResult = runScriptSandbox(prepReq.preRequestScript, {
              envVars: runtimeVars,
              requestInfo: {
                url: prepReq.url,
                method: prepReq.method,
                headers: prepReq.headers.reduce((acc, h) => { if (h.key && h.enabled !== false) acc[h.key] = h.value; return acc; }, {} as Record<string, string>),
                body: prepReq.body.content
              }
            });
            runtimeVars = preResult.envVars;
            logs.push(...preResult.logs);
          } catch (err: any) {
            logs.push({ type: 'error', message: `Pre-request script error: ${err.message}` });
          }
        }

        // 3. Execute HTTP Request
        let responseStatus = 0;
        let responseStatusText = 'Error';
        let durationMs = 0;
        let sizeBytes = 0;
        let responseData: any = null;
        let responseHeaders: Record<string, string> = {};

        const reqStartTime = Date.now();
        try {
          const res = await apiService.executeRequest(prepReq, proxyConfig);
          durationMs = Date.now() - reqStartTime;
          responseStatus = res.status;
          responseStatusText = res.statusText || (res.status >= 200 && res.status < 300 ? 'OK' : 'Response');
          responseData = res.data;
          responseHeaders = res.headers || {};
          
          const rawBodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          sizeBytes = rawBodyStr ? new Blob([rawBodyStr]).size : 0;
        } catch (err: any) {
          durationMs = Date.now() - reqStartTime;
          responseStatus = 500;
          responseStatusText = err.message || 'Network Error';
          responseData = { error: err.message };
        }

        // 4. Post-response test script execution
        const testResults: Array<{ name: string; passed: boolean; error?: string }> = [];

        if (prepReq.postResponseScript && prepReq.postResponseScript.trim()) {
          try {
            const postResult = runScriptSandbox(prepReq.postResponseScript, {
              envVars: runtimeVars,
              response: {
                data: responseData,
                status: responseStatus,
                statusText: responseStatusText,
                timeMs: durationMs,
                size: sizeBytes,
                headers: responseHeaders
              },
              requestInfo: {
                url: prepReq.url,
                method: prepReq.method,
                headers: prepReq.headers.reduce((acc, h) => { if (h.key && h.enabled !== false) acc[h.key] = h.value; return acc; }, {} as Record<string, string>),
                body: prepReq.body.content
              }
            });
            runtimeVars = postResult.envVars;
            testResults.push(...postResult.testResults);
            logs.push(...postResult.logs);
          } catch (err: any) {
            logs.push({ type: 'error', message: `Test script error: ${err.message}` });
          }
        } else {
          // Default status assertion if no script exists
          const defaultPassed = responseStatus >= 200 && responseStatus < 400;
          testResults.push({
            name: `Status code is HTTP ${responseStatus}`,
            passed: defaultPassed,
            error: defaultPassed ? undefined : `Received HTTP ${responseStatus}`
          });
        }

        const stepPassed = testResults.length > 0 ? testResults.every(t => t.passed) : (responseStatus >= 200 && responseStatus < 400);

        if (stepPassed) {
          passedCount++;
        } else {
          failedCount++;
        }
        totalDurationMs += durationMs;

        const reqHeaderObj: Record<string, string> = {};
        prepReq.headers.forEach(h => { if (h.key && h.enabled !== false) reqHeaderObj[h.key] = h.value; });

        const stepResult: ExecutedTestStep = {
          id: `${prepReq.id}_iter${iter}_${completedSteps}`,
          iteration: iter,
          requestId: prepReq.id,
          requestName: prepReq.name,
          method: prepReq.method,
          url: prepReq.url,
          statusCode: responseStatus,
          statusText: responseStatusText,
          durationMs,
          sizeBytes,
          passed: stepPassed,
          tests: testResults,
          requestInfo: {
            headers: reqHeaderObj,
            body: prepReq.body.content
          },
          responseInfo: {
            headers: responseHeaders,
            body: typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : String(responseData || '')
          },
          logs
        };

        executedSteps.push(stepResult);

        // Update report live
        const currentTotal = executedSteps.length;
        const currentAvg = Math.round(totalDurationMs / currentTotal);
        const currentPassRate = Math.round((passedCount / currentTotal) * 100);

        setRunReport({
          collectionId: selectedCollection.id,
          collectionName: selectedCollection.name,
          folderName: targetFolder?.name,
          startTime,
          totalExecutions: currentTotal,
          passedCount,
          failedCount,
          totalDurationMs,
          avgLatencyMs: currentAvg,
          passRate: currentPassRate,
          steps: [...executedSteps]
        });

        if (stopOnError && !stepPassed) {
          addToast(`Collection runner stopped on error: ${prepReq.name}`, 'warning');
          break;
        }
      }
    }

    setIsRunning(false);
    setCurrentProgress(null);
    addToast(`Collection run completed: ${passedCount} passed, ${failedCount} failed`, failedCount > 0 ? 'warning' : 'success');
  };

  const handleStopRun = () => {
    stopRequestedRef.current = true;
    setIsRunning(false);
  };

  const handleExportJSON = () => {
    if (!runReport) return;
    const jsonStr = JSON.stringify(runReport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection_run_${runReport.collectionName.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Run report exported as JSON', 'success');
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Custom Test Suite logic
  const customSuite = testSuites.find(s => s.id === activeTabId);
  const workspaceRequests = collections.flatMap(c => c.requests).filter(r => r.workspaceId === currentWorkspace?.id);

  const handleAddCustomTestCase = () => {
    if (!customSuite) return;
    if (workspaceRequests.length === 0) {
      addToast('No requests available in this workspace. Create a request first.', 'warning');
      return;
    }
    const newCase: TestCase = {
      id: Math.random().toString(36).substring(2, 9),
      requestId: workspaceRequests[0].id,
      name: workspaceRequests[0].name,
      assertions: [
        { id: Math.random().toString(36).substring(2, 9), type: 'status_code', expectedValue: '200' }
      ],
      history: []
    };
    updateTestSuite(customSuite.id, { testCases: [...customSuite.testCases, newCase] });
  };

  const filteredSteps = useMemo(() => {
    if (!runReport) return [];
    if (filterStatus === 'passed') return runReport.steps.filter(s => s.passed);
    if (filterStatus === 'failed') return runReport.steps.filter(s => !s.passed);
    return runReport.steps;
  }, [runReport, filterStatus]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] relative animate-fade-in font-sans">
      {/* Top Main Mode Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Automated API Testing & Runner</h2>
          </div>

          <div className="flex bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-0.5">
            <button
              onClick={() => setMainMode('collection_runner')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                mainMode === 'collection_runner' 
                  ? "bg-[var(--primary)] text-white shadow-sm font-bold" 
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Collection Runner
            </button>
            <button
              onClick={() => setMainMode('custom_suites')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                mainMode === 'custom_suites' 
                  ? "bg-[var(--primary)] text-white shadow-sm font-bold" 
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              Test Suites ({testSuites.length})
            </button>
          </div>
        </div>

        {mainMode === 'collection_runner' && runReport && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded text-xs font-semibold text-[var(--text-primary)] transition-colors"
              title="Export Run Report as JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              Export JSON
            </button>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded text-xs font-semibold text-[var(--text-primary)] transition-colors"
              title="Print Summary Report"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Print PDF
            </button>
          </div>
        )}
      </div>

      {/* Main Mode Body */}
      {mainMode === 'collection_runner' ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Configuration Side Panel */}
          <div className="w-full lg:w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col shrink-0 overflow-y-auto p-4 gap-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                Target Collection
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => {
                  setSelectedCollectionId(e.target.value);
                  setSelectedFolderId('all');
                  setDisabledRequestIds(new Set());
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              >
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.requests?.length || 0} reqs)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                Target Folder
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => {
                  setSelectedFolderId(e.target.value);
                  setDisabledRequestIds(new Set());
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="all">Entire Collection ({selectedCollection?.requests?.length || 0} requests)</option>
                {availableFolders.map(f => {
                  const count = (selectedCollection?.requests || []).filter(r => r.folderId === f.id).length;
                  return (
                    <option key={f.id} value={f.id}>📁 {f.name} ({count} reqs)</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                Environment Variables
              </label>
              <select
                value={selectedEnvId}
                onChange={(e) => setSelectedEnvId(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">No Environment</option>
                {environments.map(env => (
                  <option key={env.id} value={env.id}>🌍 {env.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                Runner Options
              </span>

              <div className="flex flex-col gap-2 mb-2">
                <span className="text-xs text-[var(--text-primary)] font-medium">Data File (CSV/JSON)</span>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-[var(--text-primary)] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[var(--bg-hover)] file:text-[var(--text-primary)] hover:file:bg-[var(--bg-active)]"
                />
                {dataFile && (
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Loaded {dataFileRows.length} rows from {dataFile.name}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)] font-medium">Iterations</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={iterations}
                  onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-right focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-primary)] font-medium">Delay (ms)</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  max="5000"
                  value={delayMs}
                  onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-right focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={stopOnError}
                  onChange={(e) => setStopOnError(e.target.checked)}
                  className="rounded text-[var(--primary)] focus:ring-0"
                />
                <span className="text-xs text-[var(--text-primary)] font-medium">Stop run on error</span>
              </label>
            </div>

            {/* Request Sequence Checkbox List */}
            <div className="border-t border-[var(--border-subtle)] pt-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Requests ({selectedRequestsToRun.length}/{targetRequests.length})
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-[var(--primary)] hover:underline"
                >
                  {disabledRequestIds.size === 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto max-h-60 pr-1">
                {targetRequests.map((req, idx) => {
                  const isChecked = !disabledRequestIds.has(req.id);
                  const methodColor = req.method === 'GET' ? 'text-blue-400' :
                                      req.method === 'POST' ? 'text-emerald-400' :
                                      req.method === 'PUT' ? 'text-amber-400' :
                                      req.method === 'DELETE' ? 'text-red-400' : 'text-purple-400';
                  return (
                    <div
                      key={req.id}
                      onClick={() => toggleRequestSelection(req.id)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors",
                        isChecked ? "bg-[var(--bg-input)] text-[var(--text-primary)]" : "opacity-50 hover:opacity-80"
                      )}
                    >
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Square className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />}
                      <span className={cn("text-[10px] font-mono font-bold shrink-0", methodColor)}>{req.method}</span>
                      <span className="truncate flex-1 font-medium">{req.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-2">
              {isRunning ? (
                <button
                  onClick={handleStopRun}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded shadow transition-all"
                >
                  <StopCircle className="w-4 h-4 animate-pulse" />
                  Stop Execution
                </button>
              ) : (
                <button
                  onClick={handleRunCollection}
                  disabled={selectedRequestsToRun.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded shadow transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Run Collection ({selectedRequestsToRun.length * iterations} calls)
                </button>
              )}
            </div>
          </div>

          {/* Right Execution Report Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-panel)] flex flex-col gap-6">
            {/* Live Execution Status Banner */}
            {isRunning && currentProgress && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex flex-col gap-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span className="text-xs font-bold text-emerald-400">
                      Executing Collection Run (Iteration {currentProgress.iteration}/{iterations})
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {currentProgress.current} / {currentProgress.total} Requests
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300" 
                    style={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Report Header Stats */}
            {runReport ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Total Executed</span>
                    <span className="text-xl font-bold text-[var(--text-primary)]">{runReport.totalExecutions}</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Passed Tests</span>
                    <span className="text-xl font-bold text-emerald-500">{runReport.passedCount}</span>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Failed Tests</span>
                    <span className="text-xl font-bold text-red-500">{runReport.failedCount}</span>
                  </div>
                  <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Total Duration</span>
                    <span className="text-xl font-bold text-[var(--text-primary)]">{runReport.totalDurationMs} ms</span>
                  </div>
                  <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Avg Latency</span>
                    <span className="text-xl font-bold text-[var(--text-primary)]">{runReport.avgLatencyMs} ms</span>
                  </div>
                  <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Success Rate</span>
                    <span className={cn("text-xl font-bold", runReport.passRate === 100 ? "text-emerald-500" : runReport.passRate >= 70 ? "text-amber-500" : "text-red-500")}>
                      {runReport.passRate}%
                    </span>
                  </div>
                </div>

                {/* Filter & Execution List Header */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Execution Results</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Collection: <span className="font-semibold text-[var(--primary)]">{runReport.collectionName}</span>
                      {runReport.folderName && <span> / 📁 {runReport.folderName}</span>}
                    </span>
                  </div>

                  <div className="flex bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md p-0.5">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={cn("px-2.5 py-1 text-[10px] font-bold rounded", filterStatus === 'all' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
                    >
                      All ({runReport.steps.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('passed')}
                      className={cn("px-2.5 py-1 text-[10px] font-bold rounded", filterStatus === 'passed' ? "bg-emerald-500 text-white" : "text-[var(--text-secondary)] hover:text-emerald-400")}
                    >
                      Passed ({runReport.passedCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('failed')}
                      className={cn("px-2.5 py-1 text-[10px] font-bold rounded", filterStatus === 'failed' ? "bg-red-500 text-white" : "text-[var(--text-secondary)] hover:text-red-400")}
                    >
                      Failed ({runReport.failedCount})
                    </button>
                  </div>
                </div>

                {/* Executed Step Cards */}
                <div className="space-y-3">
                  {filteredSteps.map((step) => {
                    const isExpanded = expandedStepId === step.id;
                    const methodColor = step.method === 'GET' ? 'text-blue-400 bg-blue-500/10' :
                                        step.method === 'POST' ? 'text-emerald-400 bg-emerald-500/10' :
                                        step.method === 'PUT' ? 'text-amber-400 bg-amber-500/10' :
                                        step.method === 'DELETE' ? 'text-red-400 bg-red-500/10' : 'text-purple-400 bg-purple-500/10';

                    return (
                      <div 
                        key={step.id} 
                        className={cn(
                          "border rounded-lg overflow-hidden transition-all bg-[var(--bg-input)]",
                          step.passed ? "border-emerald-500/20" : "border-red-500/30"
                        )}
                      >
                        {/* Step Header */}
                        <div 
                          onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                          className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {step.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            <span className="text-[10px] font-mono font-bold bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0">
                              #{step.iteration}
                            </span>
                            <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0", methodColor)}>
                              {step.method}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {step.requestName}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate hidden md:inline">
                              {step.url}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn(
                              "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
                              step.statusCode >= 200 && step.statusCode < 300 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            )}>
                              {step.statusCode} {step.statusText}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                              {step.durationMs} ms
                            </span>
                            <ChevronDown className={cn("w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200", isExpanded && "rotate-180")} />
                          </div>
                        </div>

                        {/* Test Assertions Summary Line */}
                        <div className="px-3.5 pb-3 pt-0 flex flex-wrap gap-2 border-t border-[var(--border-subtle)]/50 bg-[var(--bg-surface)]/30">
                          {step.tests.map((test, idx) => (
                            <div 
                              key={idx}
                              className={cn(
                                "flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border",
                                test.passed ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" : "bg-red-500/5 text-red-400 border-red-500/20"
                              )}
                            >
                              {test.passed ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
                              <span>{test.name}</span>
                              {test.error && <span className="opacity-75">({test.error})</span>}
                            </div>
                          ))}
                        </div>

                        {/* Collapsible Inspection Details */}
                        {isExpanded && (
                          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col gap-3 text-xs">
                            <div className="flex gap-4 border-b border-[var(--border-subtle)] pb-2">
                              {(['tests', 'request', 'response', 'logs'] as const).map(tab => (
                                <button
                                  key={tab}
                                  onClick={() => setInspectorTab(tab)}
                                  className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors",
                                    inspectorTab === tab ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  )}
                                >
                                  {tab}
                                </button>
                              ))}
                            </div>

                            {inspectorTab === 'tests' && (
                              <div className="space-y-2">
                                {step.tests.map((t, idx) => (
                                  <div key={idx} className="flex items-start gap-2 p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)]">
                                    {t.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-semibold text-[var(--text-primary)]">{t.name}</span>
                                      {t.error && <span className="text-red-400 font-mono text-[10px]">{t.error}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {inspectorTab === 'request' && (
                              <div className="space-y-3 font-mono text-[11px]">
                                <div>
                                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Request URL</span>
                                  <div className="p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-[var(--text-primary)]">{step.url}</div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Headers</span>
                                  <pre className="p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-[var(--text-primary)] overflow-x-auto">
                                    {JSON.stringify(step.requestInfo.headers, null, 2)}
                                  </pre>
                                </div>
                                {step.requestInfo.body && (
                                  <div>
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Body</span>
                                    <pre className="p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-[var(--text-primary)] overflow-x-auto max-h-40">
                                      {step.requestInfo.body}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {inspectorTab === 'response' && (
                              <div className="space-y-3 font-mono text-[11px]">
                                <div>
                                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Headers</span>
                                  <pre className="p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-[var(--text-primary)] overflow-x-auto">
                                    {JSON.stringify(step.responseInfo.headers, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Body</span>
                                  <pre className="p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-[var(--text-primary)] overflow-x-auto max-h-60">
                                    {step.responseInfo.body}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {inspectorTab === 'logs' && (
                              <div className="space-y-1 font-mono text-[10px]">
                                {step.logs.map((log, idx) => (
                                  <div key={idx} className={cn("p-1.5 rounded", log.type === 'error' ? "bg-red-500/10 text-red-400" : "bg-[var(--bg-panel)] text-[var(--text-secondary)]")}>
                                    [{log.type.toUpperCase()}] {log.message}
                                  </div>
                                ))}
                                {step.logs.length === 0 && <span className="text-[var(--text-secondary)] italic">No sandbox console logs.</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border-strong)] rounded-xl bg-[var(--bg-surface)]/50">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="w-8 h-8 text-emerald-500 fill-emerald-500/20" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Ready to Run Collection</h3>
                <p className="text-xs max-w-md text-[var(--text-secondary)] mb-6">
                  Select a collection or folder on the left panel and click <strong className="text-emerald-500">Run Collection</strong> to execute all API requests sequentially with script assertion reports.
                </p>
                <button
                  onClick={handleRunCollection}
                  disabled={selectedRequestsToRun.length === 0}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded shadow transition-all text-xs"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Run {selectedCollection?.name || 'Collection'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Custom Test Suites Panel */
        <div className="flex-1 overflow-y-auto p-6">
          {!customSuite ? (
            <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
              No test suite selected. Select or create a test suite in the sidebar.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-[var(--primary)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Custom Suite: {customSuite.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      // Run tests for custom suite
                      const { proxyConfig } = useStore.getState();
                      const newResults: Record<string, { success: boolean; log: string[] }> = {};
                      const updatedTestCases = [...customSuite.testCases];

                      for (let i = 0; i < updatedTestCases.length; i++) {
                        const tc = updatedTestCases[i];
                        const req = collections.flatMap(c => c.requests).find(r => r.id === tc.requestId);
                        if (!req) continue;

                        const logs: string[] = [];
                        let passedAll = true;
                        let duration = 0;
                        try {
                          const startTime = Date.now();
                          const res = await apiService.executeRequest(req, proxyConfig);
                          duration = Date.now() - startTime;

                          for (const assertion of tc.assertions) {
                            let pass = false;
                            if (assertion.type === 'status_code') pass = res.status === parseInt(assertion.expectedValue);
                            else if (assertion.type === 'response_time_less_than') pass = duration < parseInt(assertion.expectedValue);
                            else pass = true;

                            if (pass) logs.push(`✓ Assertion passed: ${assertion.type}`);
                            else { logs.push(`✗ Assertion failed: ${assertion.type}`); passedAll = false; }
                          }
                        } catch (err: any) {
                          logs.push(`Error: ${err.message}`);
                          passedAll = false;
                        }

                        const newHistory = [...(tc.history || []), { timestamp: Date.now(), durationMs: duration, success: passedAll }].slice(-50);
                        updatedTestCases[i] = { ...tc, history: newHistory };
                        newResults[tc.id] = { success: passedAll, log: logs };
                      }

                      updateTestSuite(customSuite.id, { testCases: updatedTestCases });
                      setCustomSuiteResults(newResults);
                    }}
                    className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-1.5 rounded text-xs font-semibold hover:opacity-90 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Custom Suite
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Test Cases</h4>
                <button
                  onClick={handleAddCustomTestCase}
                  className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Test Case
                </button>
              </div>

              <div className="space-y-4">
                {customSuite.testCases.map((tc, idx) => (
                  <div key={tc.id} className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">#{idx + 1} {tc.name}</span>
                      <button
                        onClick={() => {
                          const updated = customSuite.testCases.filter(c => c.id !== tc.id);
                          updateTestSuite(customSuite.id, { testCases: updated });
                        }}
                        className="text-[var(--text-secondary)] hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {customSuiteResults[tc.id] && (
                      <div className={cn("p-2 rounded text-xs font-mono", customSuiteResults[tc.id].success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                        {customSuiteResults[tc.id].log.map((l, i) => <div key={i}>{l}</div>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
