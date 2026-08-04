import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Activity, CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react';
import { cn } from '../utils';
import { syncEngine } from '../lib/syncEngine';
import { SyncLog } from '../types';

export function SyncLogModal() {
  const { isSyncLogModalOpen, setIsSyncLogModalOpen } = useStore();
  const [logs, setLogs] = useState<SyncLog[]>([]);

  useEffect(() => {
    if (isSyncLogModalOpen) {
      syncEngine.getLogs().then(setLogs);
    }

    const handleLogUpdate = (e: any) => {
      if (isSyncLogModalOpen) {
        setLogs(e.detail);
      }
    };

    window.addEventListener('sync-log-updated', handleLogUpdate);
    return () => window.removeEventListener('sync-log-updated', handleLogUpdate);
  }, [isSyncLogModalOpen]);

  if (!isSyncLogModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-lg">Sync Activity Log</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => syncEngine.processQueue()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded hover:bg-amber-500/20 transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Retry All Failed Syncs
            </button>
            <button 
              onClick={() => setIsSyncLogModalOpen(false)}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-0 overflow-y-auto flex-1">
          {logs.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-[var(--text-secondary)] text-center h-full">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-base font-medium">No sync activity yet</p>
              <p className="text-sm opacity-80 mt-1">Logs will appear here when offline changes are synced.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {logs.map(log => (
                <div key={log.id} className="p-4 flex gap-4 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="shrink-0 mt-0.5">
                    {log.status === 'synced' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {log.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                    {log.status === 'pending' && <Clock className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          log.method.toUpperCase() === 'GET' ? "bg-blue-500/10 text-blue-500" :
                          log.method.toUpperCase() === 'POST' ? "bg-emerald-500/10 text-emerald-500" :
                          log.method.toUpperCase() === 'PUT' ? "bg-amber-500/10 text-amber-500" :
                          log.method.toUpperCase() === 'DELETE' ? "bg-red-500/10 text-red-500" :
                          "bg-gray-500/10 text-gray-500"
                        )}>
                          {log.method.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate" title={log.url}>
                          {log.url.replace('/api', '')}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.error && (
                      <div className="mt-2 text-xs font-mono bg-red-500/10 text-red-500 p-2 rounded border border-red-500/20 break-all">
                        {log.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
