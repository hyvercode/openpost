import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, XCircle, Clock, Activity, FileText, ChevronDown, ChevronRight, X, StopCircle } from 'lucide-react';
import { cn } from '../utils';
import { ExecutedTestStep } from '../types';

export function BulkRunResponsePanel() {
  const { bulkRunReport, isBulkRunning, setBulkRunReport, setIsBulkRunning, setBulkRunStopRequested } = useStore();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  if (!bulkRunReport && !isBulkRunning) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-input)] border-l border-[var(--border-subtle)] shrink-0 min-w-0">
      <div className="h-10 border-b border-[var(--border-subtle)] flex items-center justify-between px-4 bg-[var(--bg-surface)] shrink-0">
        <div className="flex gap-4 h-full items-end">
          <div className="text-xs font-medium pb-2 text-[var(--text-primary)] border-b-2 border-[var(--primary)] cursor-default">
            Bulk Run Results
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isBulkRunning && (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> Running Batch...
              </div>
              <button
                onClick={() => setBulkRunStopRequested(true)}
                className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="Stop Execution"
              >
                <StopCircle className="w-3.5 h-3.5" /> Stop
              </button>
            </>
          )}
          <button 
            onClick={() => {
              setBulkRunReport(null);
              setIsBulkRunning(false);
            }}
            className="p-1 hover:bg-[var(--bg-hover-strong)] rounded text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-[var(--bg-surface)] flex flex-col min-h-0 relative">
        {bulkRunReport ? (
          <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
            {/* Visual Batch Progress & Summary Bar */}
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Test Batch Execution</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    bulkRunReport.passRate === 100 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                      : bulkRunReport.passRate >= 70 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                        : "bg-red-500/10 text-red-500 border-red-500/30"
                  )}>
                    {bulkRunReport.passRate}% Pass Rate
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {bulkRunReport.passedCount} / {bulkRunReport.totalExecutions} passed ({bulkRunReport.failedCount} failed)
                </span>
              </div>

              {/* Progress & Success/Failure Visual Bar */}
              <div className="w-full bg-[var(--bg-hover-strong)] h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${bulkRunReport.totalExecutions ? (bulkRunReport.passedCount / bulkRunReport.totalExecutions) * 100 : 0}%` }}
                  title={`Passed: ${bulkRunReport.passedCount}`}
                />
                <div 
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{ width: `${bulkRunReport.totalExecutions ? (bulkRunReport.failedCount / bulkRunReport.totalExecutions) * 100 : 0}%` }}
                  title={`Failed: ${bulkRunReport.failedCount}`}
                />
              </div>

              {/* Header Key Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-[var(--border-subtle)]/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Total</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">{bulkRunReport.totalExecutions}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Passed</span>
                  <span className="text-lg font-bold text-emerald-500">{bulkRunReport.passedCount}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Failed</span>
                  <span className="text-lg font-bold text-red-500">{bulkRunReport.failedCount}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Total Duration</span>
                  <span className="text-lg font-bold text-[var(--text-primary)]">{bulkRunReport.totalDurationMs} ms</span>
                </div>
              </div>
            </div>

            {/* List of Steps */}
            <div className="space-y-2 pb-4">
              {bulkRunReport.steps.map((step, idx) => (
                <div key={`${step.id}-${idx}`} className={cn(
                  "border rounded-lg overflow-hidden bg-[var(--bg-panel)] transition-all",
                  step.passed ? "border-emerald-500/20" : "border-red-500/30"
                )}>
                  <div 
                    className="flex flex-wrap items-center gap-3 p-2.5 cursor-pointer hover:bg-[var(--bg-hover)] select-none"
                    onClick={() => setExpandedStep(expandedStep === `${step.id}-${idx}` ? null : `${step.id}-${idx}`)}
                  >
                    <div className="shrink-0">
                      {step.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    
                    <div className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-[var(--bg-hover-strong)] text-[var(--text-secondary)]">
                      {step.method}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{step.requestName}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 text-[10px] font-mono text-[var(--text-secondary)]">
                      <span className={cn(
                        "font-bold",
                        step.statusCode < 300 ? "text-emerald-500" : step.statusCode < 400 ? "text-amber-500" : "text-red-500"
                      )}>
                        {step.statusCode} {step.statusText}
                      </span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {step.durationMs}ms</span>
                    </div>
                    
                    <div className="shrink-0 text-[var(--text-secondary)] ml-2">
                      {expandedStep === `${step.id}-${idx}` ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>

                  {expandedStep === `${step.id}-${idx}` && (
                    <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-input)] space-y-3">
                      {step.tests && step.tests.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Tests</h4>
                          <div className="space-y-1 bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-subtle)]">
                            {step.tests.map((t, i) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] font-mono">
                                {t.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                                )}
                                <div className="flex-1">
                                  <div className={t.passed ? "text-[var(--text-primary)]" : "text-red-500 font-semibold"}>
                                    {t.name}
                                  </div>
                                  {t.error && <div className="text-red-400 mt-0.5 text-[10px]">{t.error}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Request Info */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Request Payload</h4>
                          <div className="bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-48">
                            <pre className="text-[10px] font-mono p-2 overflow-auto text-[var(--text-code)] whitespace-pre-wrap break-all">
                              {step.requestInfo.body || '(No body)'}
                            </pre>
                          </div>
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Response Data</h4>
                          <div className="bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)] overflow-hidden flex flex-col max-h-48">
                            <pre className="text-[10px] font-mono p-2 overflow-auto text-[var(--text-code)] whitespace-pre-wrap break-all">
                              {step.responseInfo.body || '(No body)'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] italic">
            <Activity className="w-8 h-8 mb-4 opacity-20 animate-pulse" />
            <div className="text-sm font-semibold">Running selected requests...</div>
          </div>
        )}
      </div>
    </div>
  );
}
