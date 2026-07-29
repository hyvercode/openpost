import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Sparkles, SlidersHorizontal, Moon, Sun } from 'lucide-react';
import { 
  GRAPHQL_THEMES, 
  GraphQLThemeId, 
  getActiveGraphQLThemeId, 
  setGraphQLThemeId,
  GraphQLThemeConfig 
} from '../utils/graphqlTheme';
import { cn } from '../utils';

export function GraphQLThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<GraphQLThemeId>(() => getActiveGraphQLThemeId());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleThemeChange = () => {
      setActiveThemeId(getActiveGraphQLThemeId());
    };
    window.addEventListener('gql_theme_changed', handleThemeChange);
    return () => window.removeEventListener('gql_theme_changed', handleThemeChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentTheme = GRAPHQL_THEMES[activeThemeId] || GRAPHQL_THEMES.default;

  const handleSelect = (id: GraphQLThemeId) => {
    setGraphQLThemeId(id);
    setActiveThemeId(id);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border",
          isOpen
            ? "bg-[var(--primary)]/15 border-[var(--primary)] text-[var(--primary)]"
            : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border-[var(--border-subtle)] text-[var(--text-primary)]"
        )}
        title="GraphQL Syntax Highlighting Theme Settings"
      >
        <Palette className="w-3.5 h-3.5 text-[var(--primary)]" />
        <span>Theme: <strong className="font-bold">{currentTheme.name.split(' ')[0]}</strong></span>
        {/* Color preview dots */}
        <div className="flex items-center gap-0.5 ml-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.keyword }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.field }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.colors.string }} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--primary)]" />
              <div>
                <h4 className="font-bold text-[var(--text-primary)] leading-tight">Editor Syntax Themes</h4>
                <p className="text-[10px] text-[var(--text-secondary)]">Customize GraphQL syntax highlighting</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
              6 Themes
            </span>
          </div>

          <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto">
            {(Object.keys(GRAPHQL_THEMES) as GraphQLThemeId[]).map((id) => {
              const theme = GRAPHQL_THEMES[id];
              const isSelected = id === activeThemeId;

              return (
                <div
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={cn(
                    "p-2.5 rounded-md border cursor-pointer transition-all flex flex-col gap-1.5 group",
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-sm"
                      : "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                        {theme.name}
                        {theme.isDark ? (
                          <Moon className="w-3 h-3 text-indigo-400 opacity-70" />
                        ) : (
                          <Sun className="w-3 h-3 text-amber-400 opacity-70" />
                        )}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--primary)]">
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
                    {theme.description}
                  </p>

                  {/* Token Palette Preview Bar */}
                  <div className="flex items-center justify-between bg-[var(--bg-panel)] p-1.5 rounded border border-[var(--border-subtle)] font-mono text-[10px]">
                    <span style={{ color: theme.colors.keyword, fontWeight: 700 }}>query</span>
                    <span style={{ color: theme.colors.variable }}>$id</span>
                    <span style={{ color: theme.colors.type, fontWeight: 600 }}>User</span>
                    <span style={{ color: theme.colors.field }}>name</span>
                    <span style={{ color: theme.colors.string }}>"Alice"</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Persisted across sessions
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
