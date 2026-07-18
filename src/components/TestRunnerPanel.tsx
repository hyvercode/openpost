import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Play, Plus, Trash2, Edit3, Settings2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Save, Activity } from 'lucide-react';
import { TestSuite, TestCase, TestAssertion, RequestItem } from '../types';
import { apiService } from '../lib/api';
import { cn } from '../utils';

export function TestRunnerPanel() {
  const { activeTabId, testSuites, setTestSuites, updateTestSuite, collections, currentWorkspace, addToast } = useStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; log: string[] }>>({});

  const requests = collections.flatMap(c => c.requests);
  const suite = testSuites.find(s => s.id === activeTabId);

  if (!suite) {
    return <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">Test suite not found</div>;
  }

  const workspaceRequests = requests.filter(r => r.workspaceId === currentWorkspace?.id);

  const handleAddTestCase = () => {
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
      ]
    };
    updateTestSuite(suite.id, { testCases: [...suite.testCases, newCase] });
  };

  const handleUpdateTestCase = (testCaseId: string, updates: Partial<TestCase>) => {
    const updatedCases = suite.testCases.map(tc => tc.id === testCaseId ? { ...tc, ...updates } : tc);
    updateTestSuite(suite.id, { testCases: updatedCases });
  };

  const handleDeleteTestCase = (testCaseId: string) => {
    const updatedCases = suite.testCases.filter(tc => tc.id !== testCaseId);
    updateTestSuite(suite.id, { testCases: updatedCases });
  };

  const runTests = async () => {
    setIsRunning(true);
    const newResults: Record<string, { success: boolean; log: string[] }> = {};
    
    for (const testCase of suite.testCases) {
      const req = requests.find(r => r.id === testCase.requestId);
      if (!req) {
        newResults[testCase.id] = { success: false, log: ['Request not found'] };
        continue;
      }
      
      const logs: string[] = [];
      let passedAll = true;
      try {
        logs.push(`Executing ${req.method} ${req.url}`);
        const startTime = Date.now();
        const res = await apiService.executeRequest(req);
        const duration = Date.now() - startTime;
        
        for (const assertion of testCase.assertions) {
          let assertionPassed = false;
          let detail = '';
          
          switch (assertion.type) {
            case 'status_code':
              assertionPassed = res.status === parseInt(assertion.expectedValue);
              detail = `Expected ${assertion.expectedValue}, got ${res.status}`;
              break;
            case 'body_contains':
              const bodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
              assertionPassed = bodyStr.includes(assertion.expectedValue);
              detail = `Expected body to contain "${assertion.expectedValue}"`;
              break;
            case 'body_equals':
              const exactBodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
              assertionPassed = exactBodyStr === assertion.expectedValue;
              detail = `Expected body to equal "${assertion.expectedValue}"`;
              break;
            case 'header_exists':
              assertionPassed = Object.keys(res.headers).some(k => k.toLowerCase() === assertion.expectedValue.toLowerCase());
              detail = `Expected header "${assertion.expectedValue}" to exist`;
              break;
            case 'response_time_less_than':
              assertionPassed = duration < parseInt(assertion.expectedValue);
              detail = `Expected response time < ${assertion.expectedValue}ms, took ${duration}ms`;
              break;
          }
          
          if (assertionPassed) {
            logs.push(`✓ Assertion passed: ${assertion.type} (${detail})`);
          } else {
            logs.push(`✗ Assertion failed: ${assertion.type} (${detail})`);
            passedAll = false;
          }
        }
      } catch (err: any) {
        logs.push(`Error executing request: ${err.message}`);
        passedAll = false;
      }
      
      newResults[testCase.id] = { success: passedAll, log: logs };
      setResults({ ...newResults }); // Update incrementally
    }
    
    setIsRunning(false);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] relative animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Test Suite: {suite.name}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runTests}
            disabled={isRunning || suite.testCases.length === 0}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-1.5 rounded text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Running...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Test Cases</h3>
          <button
            onClick={handleAddTestCase}
            className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Test Case
          </button>
        </div>

        <div className="space-y-4">
          {suite.testCases.map((tc, idx) => (
            <div key={tc.id} className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-[var(--border-strong)] px-2 py-0.5 rounded-full font-bold">#{idx + 1}</span>
                  <select 
                    value={tc.requestId}
                    onChange={(e) => {
                      const req = requests.find(r => r.id === e.target.value);
                      handleUpdateTestCase(tc.id, { requestId: e.target.value, name: req?.name || 'Unknown' });
                    }}
                    className="bg-transparent border-none text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  >
                    {workspaceRequests.map(r => (
                      <option key={r.id} value={r.id}>{r.method} {r.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleDeleteTestCase(tc.id)}
                  className="text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Assertions */}
              <div className="pl-8 border-l-2 border-[var(--border-strong)] space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Assertions</span>
                  <button
                    onClick={() => {
                      const newAssertion: TestAssertion = {
                        id: Math.random().toString(36).substring(2, 9),
                        type: 'status_code',
                        expectedValue: '200'
                      };
                      handleUpdateTestCase(tc.id, { assertions: [...tc.assertions, newAssertion] });
                    }}
                    className="text-[10px] flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                
                {tc.assertions.map(assertion => (
                  <div key={assertion.id} className="flex items-center gap-2">
                    <select
                      value={assertion.type}
                      onChange={(e) => {
                        const newAssertions = tc.assertions.map(a => a.id === assertion.id ? { ...a, type: e.target.value as any } : a);
                        handleUpdateTestCase(tc.id, { assertions: newAssertions });
                      }}
                      className="text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-1 focus:outline-none focus:border-[var(--primary)]"
                    >
                      <option value="status_code">Status Code is</option>
                      <option value="body_contains">Body contains string</option>
                      <option value="body_equals">Body equals string</option>
                      <option value="header_exists">Header exists</option>
                      <option value="response_time_less_than">Response Time &lt; (ms)</option>
                    </select>
                    <input
                      type="text"
                      value={assertion.expectedValue}
                      onChange={(e) => {
                        const newAssertions = tc.assertions.map(a => a.id === assertion.id ? { ...a, expectedValue: e.target.value } : a);
                        handleUpdateTestCase(tc.id, { assertions: newAssertions });
                      }}
                      className="text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-1 focus:outline-none focus:border-[var(--primary)] flex-1"
                      placeholder="Expected value"
                    />
                    <button
                      onClick={() => {
                        const newAssertions = tc.assertions.filter(a => a.id !== assertion.id);
                        handleUpdateTestCase(tc.id, { assertions: newAssertions });
                      }}
                      className="text-[var(--text-secondary)] hover:text-red-500 p-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {tc.assertions.length === 0 && (
                  <div className="text-[10px] text-[var(--text-secondary)] italic">No assertions defined. Test will only check if request executes.</div>
                )}
              </div>

              {/* Results */}
              {results[tc.id] && (
                <div className={cn(
                  "mt-2 p-3 rounded text-xs font-mono",
                  results[tc.id].success ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                )}>
                  <div className="flex items-center gap-2 mb-2 font-bold font-sans">
                    {results[tc.id].success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {results[tc.id].success ? 'Passed' : 'Failed'}
                  </div>
                  <ul className="space-y-1">
                    {results[tc.id].log.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
          {suite.testCases.length === 0 && (
            <div className="text-center p-8 border border-dashed border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)]">
              No test cases yet. Click "Add Test Case" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
