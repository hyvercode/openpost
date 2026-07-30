import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Search, X, Folder, Layers, ArrowRight, CornerDownLeft, Command, Globe, Check } from 'lucide-react';
import { RequestItem, ApiCollection, Environment } from '../types';
import { cn } from '../utils';

type SearchResultCategory = 'all' | 'requests' | 'collections' | 'environments';

interface SearchResultItem {
  id: string;
  type: 'request' | 'collection' | 'environment';
  title: string;
  subtitle?: string;
  badge?: string;
  method?: string;
  url?: string;
  collectionName?: string;
  folderName?: string;
  isActiveEnv?: boolean;
  rawRequest?: RequestItem;
  rawCollection?: ApiCollection;
  rawEnvironment?: Environment;
}

export function QuickSearchModal() {
  const {
    isQuickSearchOpen,
    setIsQuickSearchOpen,
    collections,
    environments,
    currentEnvironment,
    setCurrentEnvironment,
    setActiveRequest,
    setActiveView,
    openTab,
    setEditingEnvironment
  } = useStore();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchResultCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(!isQuickSearchOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickSearchOpen, setIsQuickSearchOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isQuickSearchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isQuickSearchOpen]);

  // Reset selected index when query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Construct search items list from store
  const allResults = useMemo<SearchResultItem[]>(() => {
    const results: SearchResultItem[] = [];

    // 1. Process Requests
    collections.forEach((col) => {
      const folderMap = new Map<string, string>();
      col.folders?.forEach((f) => folderMap.set(f.id, f.name));

      col.requests?.forEach((req) => {
        const folderName = req.folderId ? folderMap.get(req.folderId) : undefined;
        results.push({
          id: `req_${req.id}`,
          type: 'request',
          title: req.name || 'Untitled Request',
          subtitle: `${col.name}${folderName ? ` / ${folderName}` : ''}`,
          method: req.method || 'GET',
          url: req.url || '',
          collectionName: col.name,
          folderName,
          rawRequest: req
        });
      });
    });

    // 2. Process Collections
    collections.forEach((col) => {
      const reqCount = col.requests?.length || 0;
      results.push({
        id: `col_${col.id}`,
        type: 'collection',
        title: col.name,
        subtitle: `${reqCount} request${reqCount === 1 ? '' : 's'}`,
        badge: 'Collection',
        rawCollection: col
      });
    });

    // 3. Process Environments
    environments.forEach((env) => {
      const varCount = env.variables?.length || 0;
      const isActive = currentEnvironment?.id === env.id;
      results.push({
        id: `env_${env.id}`,
        type: 'environment',
        title: env.name,
        subtitle: `${varCount} variable${varCount === 1 ? '' : 's'}`,
        badge: 'Environment',
        isActiveEnv: isActive,
        rawEnvironment: env
      });
    });

    return results;
  }, [collections, environments, currentEnvironment]);

  // Filter items based on activeCategory and query
  const filteredResults = useMemo(() => {
    let items = allResults;

    if (activeCategory === 'requests') {
      items = items.filter((item) => item.type === 'request');
    } else if (activeCategory === 'collections') {
      items = items.filter((item) => item.type === 'collection');
    } else if (activeCategory === 'environments') {
      items = items.filter((item) => item.type === 'environment');
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return items;
    }

    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(trimmed);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(trimmed);
      const matchUrl = item.url?.toLowerCase().includes(trimmed);
      const matchMethod = item.method?.toLowerCase().includes(trimmed);
      return matchTitle || matchSubtitle || matchUrl || matchMethod;
    });
  }, [allResults, activeCategory, query]);

  // Handle select action
  const handleSelectItem = (item: SearchResultItem) => {
    setIsQuickSearchOpen(false);

    if (item.type === 'request' && item.rawRequest) {
      setActiveRequest(item.rawRequest);
      setActiveView('request');
      openTab({
        id: item.rawRequest.id,
        type: 'request',
        name: item.rawRequest.name,
        method: item.rawRequest.method
      });
    } else if (item.type === 'collection' && item.rawCollection) {
      setActiveView('collection_doc');
      openTab({
        id: item.rawCollection.id,
        type: 'collection_doc',
        name: `${item.rawCollection.name} Docs`
      });
    } else if (item.type === 'environment' && item.rawEnvironment) {
      setEditingEnvironment(item.rawEnvironment);
      setCurrentEnvironment(item.rawEnvironment);
      setActiveView('environment');
      openTab({
        id: item.rawEnvironment.id,
        type: 'environment',
        name: item.rawEnvironment.name
      });
    }
  };

  // Keyboard navigation inside input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsQuickSearchOpen(false);
      return;
    }

    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev + 1) % filteredResults.length;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = (prev - 1 + filteredResults.length) % filteredResults.length;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectItem(filteredResults[selectedIndex]);
      }
    }
  };

  const scrollIndexIntoView = (index: number) => {
    if (!listRef.current) return;
    const element = listRef.current.children[index] as HTMLElement;
    if (element) {
      element.scrollIntoView({ block: 'nearest' });
    }
  };

  if (!isQuickSearchOpen) return null;

  const getMethodBadgeClass = (method?: string) => {
    const m = (method || 'GET').toUpperCase();
    switch (m) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'POST':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'PUT':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'WS':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
      case 'SSE':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 transition-all duration-200"
      onClick={() => setIsQuickSearchOpen(false)}
    >
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-3 sm:p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-[var(--bg-surface)]">
          <Search className="w-5 h-5 text-[var(--primary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search requests, collections, environments..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsQuickSearchOpen(false)}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-xs font-semibold px-2 border border-[var(--border-subtle)] shrink-0 hidden sm:block"
          >
            ESC
          </button>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-hover)]/30 text-xs overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'all', label: 'All Items' },
              { id: 'requests', label: 'Requests' },
              { id: 'collections', label: 'Collections' },
              { id: 'environments', label: 'Environments' }
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap',
                activeCategory === cat.id
                  ? 'bg-[var(--primary)] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {cat.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-[var(--text-tertiary)] font-mono hidden md:block">
            {filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Search Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[50vh] divide-y divide-[var(--border-subtle)]/30"
        >
          {filteredResults.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition-all border border-transparent',
                  isSelected
                    ? 'bg-[var(--bg-hover)] border-[var(--border-strong)] shadow-2xs'
                    : 'hover:bg-[var(--bg-hover)]/60 text-[var(--text-secondary)]'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Icon / Method Badge */}
                  {item.type === 'request' && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 font-mono',
                        getMethodBadgeClass(item.method)
                      )}
                    >
                      {item.method || 'GET'}
                    </span>
                  )}
                  {item.type === 'collection' && (
                    <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                      <Folder className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === 'environment' && (
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                  )}

                  {/* Title & Subtitle / Path */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-semibold truncate',
                          isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'
                        )}
                      >
                        {item.title}
                      </span>
                      {item.isActiveEnv && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)] truncate">
                      {item.subtitle && <span className="truncate">{item.subtitle}</span>}
                      {item.url && (
                        <>
                          <span>•</span>
                          <span className="font-mono truncate text-[var(--text-secondary)]">{item.url}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                  <ArrowRight
                    className={cn(
                      'w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform',
                      isSelected && 'text-[var(--primary)] translate-x-0.5'
                    )}
                  />
                </div>
              </div>
            );
          })}

          {filteredResults.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-2">
              <Search className="w-8 h-8 opacity-30" />
              <p className="text-xs font-medium">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] opacity-70">
                Try searching for a request name, HTTP method, collection, or environment variable.
              </p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-tertiary)] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded font-mono text-[10px] text-[var(--text-secondary)]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded font-mono text-[10px] text-[var(--text-secondary)]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded font-mono text-[10px] text-[var(--text-secondary)]">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded font-mono text-[10px] text-[var(--text-secondary)]">esc</kbd>
              <span>close</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <Command className="w-3 h-3 text-[var(--primary)]" />
            <span className="font-semibold text-[var(--text-secondary)]">Quick Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}
