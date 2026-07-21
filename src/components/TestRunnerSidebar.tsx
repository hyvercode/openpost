import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Play, Plus, Trash2, Edit3, Settings2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { TestSuite, TestCase, TestAssertion, RequestItem } from '../types';
import { cn } from '../utils';

export function TestRunnerSidebar({ searchQuery }: { searchQuery: string }) {
  const { testSuites, setTestSuites, addTestSuite, deleteTestSuite, updateTestSuite, currentWorkspace, collections, openTab, isWorkspaceLoading } = useStore();

  const handleCreateSuite = () => {
    addTestSuite({
      workspaceId: currentWorkspace?.id || 'default',
      name: 'New Test Suite',
      testCases: []
    });
  };

  const filteredSuites = testSuites.filter(ts => 
    ts.workspaceId === (currentWorkspace?.id || 'default') &&
    ts.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isWorkspaceLoading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse select-none">
        <div className="flex items-center justify-between px-2 py-1.5 group">
          <div className="h-3 w-20 bg-[var(--border-strong)] rounded opacity-50" />
        </div>
        <div className="flex flex-col gap-2 px-1">
          {[1, 2].map((idx) => (
            <div key={idx} className="flex flex-col gap-2 p-2 rounded bg-[var(--bg-hover)]/10">
              <div className="h-3.5 bg-[var(--border-strong)] rounded opacity-50 w-28" />
              <div className="h-2.5 bg-[var(--border-strong)]/40 rounded opacity-40 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2 py-1.5 group">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Test Suites</span>
        <button 
          onClick={handleCreateSuite}
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Create Test Suite"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-1">
        {filteredSuites.map(suite => (
          <div 
            key={suite.id}
            onClick={() => openTab({ id: suite.id, type: 'test_suite' as any, name: suite.name })}
            className="flex flex-col gap-1 p-2 rounded cursor-pointer text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors group/suite"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{suite.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTestSuite(suite.id);
                }}
                className="opacity-0 group-hover/suite:opacity-100 p-0.5 rounded text-[var(--text-secondary)] hover:text-red-500 transition-all"
                title="Delete Test Suite"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              {suite.testCases.length} Test Case{suite.testCases.length !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
        {filteredSuites.length === 0 && (
          <div className="text-center p-4 text-xs text-[var(--text-secondary)]">
            No test suites found. Create one to start testing!
          </div>
        )}
      </div>
    </div>
  );
}
