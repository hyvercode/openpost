import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Keyboard, Command, Sparkles, Search, Send, Save, Plus, Settings2, Globe, Layers, Play, Zap, HelpCircle } from 'lucide-react';
import { cn } from '../utils';

interface ShortcutGroup {
  category: string;
  items: {
    keys: string[];
    description: string;
    actionLabel?: string;
  }[];
}

export function KeyboardShortcutsModal() {
  const { isKeyboardShortcutsModalOpen, setIsKeyboardShortcutsModalOpen, setIsQuickSearchOpen, setIsQuickEnvModalOpen, setIsHelpModalOpen } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isKeyboardShortcutsModalOpen) return null;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'General & Navigation',
      items: [
        { keys: [modKey, 'K'], description: 'Quick Search (Requests, Collections, Environments)', actionLabel: 'Search' },
        { keys: [modKey, '/'], description: 'Open Keyboard Shortcuts Cheatsheet', actionLabel: 'Shortcuts' },
        { keys: [modKey, 'E'], description: 'Quick Environment Variables Manager', actionLabel: 'Env Manager' },
        { keys: ['Esc'], description: 'Close active modal, dropdown, or search overlay' },
        { keys: ['F1'], description: 'Open Documentation & Feature Guide' },
      ]
    },
    {
      category: 'Request Editor & Execution',
      items: [
        { keys: [modKey, 'Enter'], description: 'Send active HTTP request / Connect WebSocket / Run test', actionLabel: 'Send Request' },
        { keys: [modKey, 'S'], description: 'Save current active request configuration', actionLabel: 'Save Request' },
        { keys: [modKey, 'N'], description: 'Create a new API Request' },
        { keys: [modKey, 'Shift', 'C'], description: 'Create a new Collection' },
        { keys: [modKey, 'Shift', 'E'], description: 'Export Active Workspace / Collections' },
      ]
    },
    {
      category: 'Environment & Autocomplete',
      items: [
        { keys: ['{{'], description: 'Trigger Environment Variable Autocomplete inside input fields' },
        { keys: ['Tab'], description: 'Accept selected autocomplete suggestion' },
        { keys: ['↑', '↓'], description: 'Navigate autocomplete dropdown items' },
      ]
    },
    {
      category: 'Views & Modules Switcher',
      items: [
        { keys: ['Alt', '1'], description: 'Switch to Request Builder View' },
        { keys: ['Alt', '2'], description: 'Switch to Environment Manager View' },
        { keys: ['Alt', '3'], description: 'Switch to Automated Test Runner View' },
        { keys: ['Alt', '4'], description: 'Switch to Deployments & Server Panel' },
        { keys: ['Alt', '5'], description: 'Switch to Workspace Settings View' },
      ]
    }
  ];

  const filteredGroups = shortcutGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      !searchQuery || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Keyboard Shortcuts & Hotkeys
                <span className="text-[10px] font-mono bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full border border-[var(--primary)]/20 font-semibold">
                  v1.0.0
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Boost your productivity with quick keyboard commands and shortcuts.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsKeyboardShortcutsModalOpen(false)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search hotkeys (e.g. Save, Send, Environment, Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/60"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[var(--bg-panel)]">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-secondary)]">
              <Keyboard className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">No shortcuts matching &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-[11px] opacity-70 mt-1">Try searching for alternative keywords like "Save", "Send", or "Search".</p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.category} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)]/60 pb-1">
                  {group.category}
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]/50 transition-colors"
                    >
                      <span className="text-xs text-[var(--text-primary)] font-medium">
                        {item.description}
                      </span>
                      
                      <div className="flex items-center gap-1.5 shrink-0 ml-4">
                        {item.keys.map((k, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="px-2 py-1 bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded text-[11px] font-mono font-bold text-[var(--text-primary)] shadow-2xs">
                              {k}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-[10px] text-[var(--text-secondary)] font-bold">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-[10px] font-mono text-[var(--text-primary)]">{modKey} /</kbd> anywhere to open this menu</span>
          </div>

          <button
            onClick={() => setIsKeyboardShortcutsModalOpen(false)}
            className="px-4 py-1.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-lg font-bold text-xs shadow-xs transition-opacity cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}
