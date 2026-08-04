import React from 'react';
import { useStore } from '../store/useStore';
import { X, Plus } from 'lucide-react';
import { cn } from '../utils';

export function TabBar() {
  const {
    openTabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    activeView,
    setActiveView,
    setActiveRequest,
    setEditingEnvironment,
    collections,
    environments,
    draftRequests,
    createStandaloneRequest
  } = useStore();

  const isTabActive = (tab: typeof openTabs[0]) => {
    if (activeTabId !== tab.id) return false;
    if (activeView === 'request' && tab.type === 'request') return true;
    if (activeView === 'environment' && tab.type === 'environment') return true;
    if (activeView === 'deployments' && tab.type === 'deployments') return true;
    if (activeView === 'collection_doc' && tab.type === 'collection_doc') return true;
    if (activeView === 'test_suite' && tab.type === 'test_suite') return true;
    return false;
  };

  const handleTabClick = (tab: { id: string; type: any }) => {
    setActiveTabId(tab.id);
    if (tab.type === 'request') {
      const request = collections.flatMap(c => c.requests).find(r => r.id === tab.id)
        || draftRequests.find(r => r.id === tab.id);
      if (request) {
        setActiveRequest(request);
        setActiveView('request');
      }
    } else if (tab.type === 'environment') {
      const env = environments.find(e => e.id === tab.id);
      if (env) {
        setEditingEnvironment(env);
        setActiveView('environment');
      }
    } else if (tab.type === 'deployments') {
      setActiveView('deployments');
    } else if (tab.type === 'collection_doc') {
      setActiveView('collection_doc');
    } else if (tab.type === 'test_suite') {
      setActiveView('test_suite');
    }
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTab(id);
    const newTabs = openTabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
      setActiveView('empty');
    } else if (activeTabId === id) {
      const newActive = newTabs[newTabs.length - 1];
      handleTabClick(newActive);
    }
  };

  return (
    <div className="flex items-center bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar shrink-0 h-9">
      {openTabs.map(tab => {
        const isDraft = tab.type === 'request' && draftRequests.some(d => d.id === tab.id);
        return (
          <div 
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-r border-[var(--border-subtle)] max-w-[200px] cursor-pointer group text-xs shrink-0",
              isTabActive(tab) ? "bg-[var(--bg-panel)] text-[var(--text-primary)] border-t-2 border-t-[var(--primary)]" : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
            )}
          >
            {tab.type === 'request' && tab.method && (
              <span className={cn(
                "font-bold text-[10px]",
                tab.method === 'GET' ? "text-[var(--text-get)]" :
                tab.method === 'POST' ? "text-[var(--text-post)]" :
                tab.method === 'PUT' ? "text-[var(--text-put)]" :
                tab.method === 'DELETE' ? "text-[var(--text-delete)]" : "text-[var(--text-secondary)]"
              )}>{tab.method}</span>
            )}
            <span className="truncate flex-1">{tab.name}</span>
            {isDraft && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved Draft Request" />
            )}
            <button 
              onClick={(e) => handleClose(e, tab.id)}
              className={cn(
                "p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity ml-0.5",
                isTabActive(tab) ? "opacity-100 hover:bg-[var(--border-strong)]" : "hover:bg-[var(--border-strong)]"
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <button
        onClick={() => createStandaloneRequest()}
        className="px-2.5 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)] border-r border-[var(--border-subtle)] transition-colors cursor-pointer shrink-0"
        title="New Standalone Request (Ctrl + N)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
