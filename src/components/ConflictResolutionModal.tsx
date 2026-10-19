import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { X, AlertTriangle, Cloud, HardDrive, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';
import { diffLines } from 'diff';

export function ConflictResolutionModal() {
  const { isConflictModalOpen, setIsConflictModalOpen, conflictData, setConflictData } = useStore();

  const diffResult = useMemo(() => {
    if (!conflictData) return { leftLines: [], rightLines: [] };
    const localStr = typeof conflictData.local === 'object' ? JSON.stringify(conflictData.local, null, 2) : String(conflictData.local || '');
    const cloudStr = typeof conflictData.cloud === 'object' ? JSON.stringify(conflictData.cloud, null, 2) : String(conflictData.cloud || '');

    const changes = diffLines(cloudStr, localStr);
    const leftLines: { text: string, type: 'normal' | 'removed' | 'empty' }[] = [];
    const rightLines: { text: string, type: 'normal' | 'added' | 'empty' }[] = [];

    let i = 0;
    while (i < changes.length) {
      const change = changes[i];
      
      if (change.removed && i + 1 < changes.length && changes[i+1].added) {
        const removedLines = change.value.replace(/\n$/, '').split('\n');
        const addedLines = changes[i+1].value.replace(/\n$/, '').split('\n');
        const maxLines = Math.max(removedLines.length, addedLines.length);
        
        for (let j = 0; j < maxLines; j++) {
          leftLines.push(j < removedLines.length ? { text: removedLines[j], type: 'removed' } : { text: '', type: 'empty' });
          rightLines.push(j < addedLines.length ? { text: addedLines[j], type: 'added' } : { text: '', type: 'empty' });
        }
        i += 2;
      } else if (change.added && i + 1 < changes.length && changes[i+1].removed) {
        const addedLines = change.value.replace(/\n$/, '').split('\n');
        const removedLines = changes[i+1].value.replace(/\n$/, '').split('\n');
        const maxLines = Math.max(removedLines.length, addedLines.length);
        
        for (let j = 0; j < maxLines; j++) {
          rightLines.push(j < addedLines.length ? { text: addedLines[j], type: 'added' } : { text: '', type: 'empty' });
          leftLines.push(j < removedLines.length ? { text: removedLines[j], type: 'removed' } : { text: '', type: 'empty' });
        }
        i += 2;
      } else {
        const lines = change.value.replace(/\n$/, '').split('\n');
        if (change.added) {
          lines.forEach(l => {
            leftLines.push({ text: '', type: 'empty' });
            rightLines.push({ text: l, type: 'added' });
          });
        } else if (change.removed) {
          lines.forEach(l => {
            leftLines.push({ text: l, type: 'removed' });
            rightLines.push({ text: '', type: 'empty' });
          });
        } else {
          lines.forEach(l => {
            leftLines.push({ text: l, type: 'normal' });
            rightLines.push({ text: l, type: 'normal' });
          });
        }
        i += 1;
      }
    }
    return { leftLines, rightLines };
  }, [conflictData]);

  if (!isConflictModalOpen || !conflictData) return null;

  const handleResolve = (resolution: 'local' | 'cloud') => {
    if (conflictData.onResolve) {
      conflictData.onResolve(resolution);
    }
    setIsConflictModalOpen(false);
    setConflictData(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-semibold text-lg text-[var(--text-primary)]">Sync Conflict Detected</h2>
          </div>
          <button 
            onClick={() => setIsConflictModalOpen(false)}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col min-h-0">
          <p className="text-sm text-[var(--text-secondary)] mb-6 shrink-0">
            A conflict occurred while syncing this request. The data on the cloud has changed since you last synced, but you also made local offline changes. Please choose which version to keep.
          </p>
          
          <div className="flex flex-col flex-1 min-h-0 border border-[var(--border-subtle)] rounded-lg overflow-hidden">
            {/* Diff Header */}
            <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)] bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] shrink-0">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-500 font-medium">
                  <Cloud className="w-4 h-4" />
                  <h3>Cloud Version (Server)</h3>
                </div>
                <button 
                  onClick={() => handleResolve('cloud')}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded text-sm bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors font-medium border border-blue-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Keep Cloud
                </button>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500 font-medium">
                  <HardDrive className="w-4 h-4" />
                  <h3>Local Version (Offline)</h3>
                </div>
                <button 
                  onClick={() => handleResolve('local')}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded text-sm bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors font-medium border border-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Keep Local
                </button>
              </div>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-auto bg-[var(--bg-primary)] font-mono text-xs">
              <div className="min-w-[600px]">
                {diffResult.leftLines.map((leftLine, idx) => {
                  const rightLine = diffResult.rightLines[idx];
                  return (
                    <div key={idx} className="flex divide-x divide-[var(--border-subtle)]">
                      {/* Left Side (Cloud) */}
                      <div className={cn(
                        "w-1/2 flex px-2 py-0.5",
                        leftLine.type === 'removed' ? "bg-red-500/10 text-red-500" :
                        leftLine.type === 'empty' ? "bg-[var(--bg-secondary)] opacity-50" :
                        "text-[var(--text-primary)]"
                      )}>
                        <div className="w-8 shrink-0 text-right pr-3 opacity-50 select-none border-r border-[var(--border-subtle)] mr-2">
                          {leftLine.type !== 'empty' ? idx + 1 : ''}
                        </div>
                        <div className="flex-1 whitespace-pre-wrap break-all">
                          {leftLine.text}
                        </div>
                      </div>

                      {/* Right Side (Local) */}
                      <div className={cn(
                        "w-1/2 flex px-2 py-0.5",
                        rightLine.type === 'added' ? "bg-emerald-500/10 text-emerald-500" :
                        rightLine.type === 'empty' ? "bg-[var(--bg-secondary)] opacity-50" :
                        "text-[var(--text-primary)]"
                      )}>
                        <div className="w-8 shrink-0 text-right pr-3 opacity-50 select-none border-r border-[var(--border-subtle)] mr-2">
                          {rightLine.type !== 'empty' ? idx + 1 : ''}
                        </div>
                        <div className="flex-1 whitespace-pre-wrap break-all">
                          {rightLine.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
