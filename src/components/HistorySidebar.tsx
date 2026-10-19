import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { HistoryItem, RequestItem } from '../types';
import { Play, Trash2, Copy, History, Clock, FileCode, Check, Filter, X, Zap } from 'lucide-react';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmModal } from './ConfirmModal';

interface HistorySidebarProps {
  searchQuery: string;
}

export function HistorySidebar({ searchQuery }: HistorySidebarProps) {
  const {
    history,
    currentWorkspace,
    removeHistoryItem,
    clearHistory,
    setActiveRequest,
    setActiveView,
    openTab,
    addToast,
    isWorkspaceLoading
  } = useStore();

  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const workspaceHistory = useMemo(() => {
    return history.filter(h => h.workspaceId === (currentWorkspace?.id || 'default'));
  }, [history, currentWorkspace]);

  const filteredHistory = useMemo(() => {
    return workspaceHistory.filter(item => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (item.name || '').toLowerCase().includes(q) ||
          (item.url || '').toLowerCase().includes(q) ||
          (item.method || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Method filter
      if (selectedMethod !== 'ALL') {
        if (selectedMethod === 'OTHER') {
          if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(item.method)) return false;
        } else if (item.method !== selectedMethod) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'SUCCESS') {
        if (!item.responseStatus || item.responseStatus < 200 || item.responseStatus >= 400) return false;
      } else if (statusFilter === 'ERROR') {
        if (item.responseStatus && item.responseStatus >= 200 && item.responseStatus < 400) return false;
      }

      return true;
    });
  }, [workspaceHistory, searchQuery, selectedMethod, statusFilter]);

  const handleReRun = (item: HistoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const rerunReqId = `history_${item.id}_rerun`;
    const virtualRequest: RequestItem = {
      id: rerunReqId,
      collectionId: 'history',
      workspaceId: item.workspaceId,
      name: item.name || item.url || 'Executed Request',
      method: item.method || 'GET',
      url: item.url || '',
      headers: item.headers?.length ? item.headers : [{ id: uuidv4(), key: '', value: '', enabled: true }],
      params: item.params?.length ? item.params : [{ id: uuidv4(), key: '', value: '', enabled: true }],
      body: item.body || { type: 'none', content: '' },
      auth: item.auth || { type: 'none' },
      mockResponse: {
        status: item.responseStatus || 200,
        headers: [{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }],
        body: ''
      }
    };
    setActiveRequest(virtualRequest);
    setActiveView('request');
    openTab({
      id: `history_${item.id}`,
      type: 'request',
      name: item.name || item.url || 'Executed Request',
      method: item.method || 'GET'
    });
    addToast(`Re-running ${item.method} request...`, 'info', 2000);
  };

  const handleLoadIntoEditor = (item: HistoryItem) => {
    const reqId = `history_${item.id}`;
    const virtualRequest: RequestItem = {
      id: reqId,
      collectionId: 'history',
      workspaceId: item.workspaceId,
      name: item.name || item.url || 'Executed Request',
      method: item.method || 'GET',
      url: item.url || '',
      headers: item.headers?.length ? item.headers : [{ id: uuidv4(), key: '', value: '', enabled: true }],
      params: item.params?.length ? item.params : [{ id: uuidv4(), key: '', value: '', enabled: true }],
      body: item.body || { type: 'none', content: '' },
      auth: item.auth || { type: 'none' },
      mockResponse: {
        status: item.responseStatus || 200,
        headers: [{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }],
        body: ''
      }
    };
    setActiveRequest(virtualRequest);
    setActiveView('request');
    openTab({
      id: reqId,
      type: 'request',
      name: item.name || item.url || 'Executed Request',
      method: item.method || 'GET'
    });
  };

  const handleCopyAsCurl = (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    let curl = `curl -X ${item.method || 'GET'} "${item.url || ''}"`;
    if (item.headers && item.headers.length > 0) {
      item.headers.filter(h => h.enabled && h.key).forEach(h => {
        curl += ` -H "${h.key}: ${h.value}"`;
      });
    }
    if (item.body) {
      if (item.body.type === 'raw' && item.body.content) {
        curl += ` -d '${item.body.content.replace(/'/g, "'\\''")}'`;
      } else if ((item.body.type === 'form-data' || item.body.type === 'x-www-form-urlencoded') && item.body.formData) {
        item.body.formData.filter(f => f.enabled && f.key).forEach(f => {
          curl += ` --data-urlencode "${f.key}=${f.value}"`;
        });
      }
    }
    navigator.clipboard.writeText(curl);
    setCopiedId(item.id);
    addToast('Copied cURL to clipboard!', 'success', 2000);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = () => {
    clearHistory(currentWorkspace?.id || 'default');
    setConfirmClearOpen(false);
    addToast('Request history cleared', 'success', 2000);
  };

  const renderSkeleton = () => (
    <div className="space-y-2 p-1 animate-pulse select-none">
      {[1, 2, 3, 4].map((idx) => (
        <div key={idx} className="p-2.5 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-hover)]/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-10 bg-[var(--border-strong)]/40 rounded" />
              <div className="h-4 w-12 bg-[var(--border-strong)]/40 rounded" />
              <div className="h-3 w-28 bg-[var(--border-strong)]/30 rounded" />
            </div>
          </div>
          <div className="h-3 w-40 bg-[var(--border-strong)]/20 rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 h-full font-sans">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Request History</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            {workspaceHistory.length}
          </span>
        </div>

        {workspaceHistory.length > 0 && (
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="text-[10px] text-red-500 hover:text-red-400 font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-colors flex items-center gap-1"
            title="Clear All History"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      {workspaceHistory.length > 0 && (
        <div className="flex flex-col gap-1.5 px-2 pb-1 border-b border-[var(--border-subtle)]/60">
          {/* Method Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'OTHER'].map(m => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold tracking-wider transition-all shrink-0 cursor-pointer",
                  selectedMethod === m
                    ? "bg-[var(--primary)] text-white shadow-2xs"
                    : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center justify-between text-[10px] pt-1">
            <span className="text-[var(--text-secondary)] flex items-center gap-1">
              <Filter className="w-3 h-3 text-[var(--icon-color)]" />
              Status:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                  statusFilter === 'ALL' ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('SUCCESS')}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                  statusFilter === 'SUCCESS' ? "bg-emerald-500/20 text-emerald-500" : "text-[var(--text-secondary)] hover:text-emerald-500"
                )}
              >
                2xx Success
              </button>
              <button
                onClick={() => setStatusFilter('ERROR')}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                  statusFilter === 'ERROR' ? "bg-red-500/20 text-red-500" : "text-[var(--text-secondary)] hover:text-red-500"
                )}
              >
                Errors
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Items List */}
      {isWorkspaceLoading ? (
        renderSkeleton()
      ) : (
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 max-h-[calc(100vh-250px)]">
          {filteredHistory.map((item) => {
            const isSuccess = item.responseStatus && item.responseStatus >= 200 && item.responseStatus < 400;
            const statusColor = item.responseStatus === 0
              ? 'text-gray-400 border-gray-500/30 bg-gray-500/10'
              : isSuccess
                ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                : 'text-red-500 border-red-500/30 bg-red-500/10';

            const methodColor = item.method === 'GET' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
              : item.method === 'POST' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
              : item.method === 'PUT' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
              : item.method === 'DELETE' ? 'text-red-500 bg-red-500/10 border-red-500/20'
              : 'text-purple-500 bg-purple-500/10 border-purple-500/20';

            const latencyColor = (item.timeMs || 0) < 300
              ? 'text-emerald-500'
              : (item.timeMs || 0) < 800
                ? 'text-amber-500'
                : 'text-red-500';

            return (
              <div
                key={item.id}
                onClick={() => handleLoadIntoEditor(item)}
                className="group/hist flex flex-col gap-1.5 p-2.5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer relative shadow-2xs"
              >
                {/* Top row: Status, Method, Name, and Quick Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={cn("text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0", statusColor)}>
                      {item.responseStatus || 'ERR'}
                    </span>
                    <span className={cn("text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0", methodColor)}>
                      {item.method}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1 opacity-0 group-hover/hist:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => handleReRun(item, e)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold transition-all border border-emerald-500/30 shadow-2xs cursor-pointer"
                      title="Re-run request immediately"
                    >
                      <Play className="w-3 h-3 fill-emerald-500/30" />
                      <span>Re-run</span>
                    </button>

                    <button
                      onClick={(e) => handleCopyAsCurl(item, e)}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover-strong)] transition-colors"
                      title="Copy as cURL"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(item.id);
                        addToast('History item removed', 'success', 1500);
                      }}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Delete from history"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* URL row */}
                <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate px-0.5" title={item.url}>
                  {item.url || 'No URL specified'}
                </div>

                {/* Footer row: Timestamp & Time */}
                <div className="flex items-center justify-between text-[9px] text-[var(--text-secondary)] px-0.5 pt-1 border-t border-[var(--border-subtle)]/40">
                  <span className="flex items-center gap-1 opacity-80">
                    <Clock className="w-2.5 h-2.5" />
                    {item.timestamp}
                  </span>
                  {item.timeMs !== undefined && item.timeMs > 0 && (
                    <span className={cn("font-mono font-medium flex items-center gap-0.5", latencyColor)}>
                      <Zap className="w-2.5 h-2.5" />
                      {item.timeMs} ms
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredHistory.length === 0 && (
            <div className="text-center p-8 text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
              <History className="w-8 h-8 text-[var(--border-strong)] opacity-50" />
              <span className="font-medium text-[var(--text-primary)]">
                {searchQuery || selectedMethod !== 'ALL' || statusFilter !== 'ALL'
                  ? "No matching requests found"
                  : "No request history yet"}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] max-w-xs">
                {searchQuery || selectedMethod !== 'ALL' || statusFilter !== 'ALL'
                  ? "Try clearing filters or changing your search query."
                  : "Execute an API request in the editor tab to automatically log and re-run past requests here."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmClearOpen}
        title="Clear Request History"
        message="Are you sure you want to clear your entire request history for this workspace? This action cannot be undone."
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
