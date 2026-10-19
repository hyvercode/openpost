import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChevronRight, ChevronDown, BookOpen, Plus, Copy, Check, Hash, Eye, 
  HelpCircle, Sliders, CheckSquare, Square, Wand2, AlertTriangle, AlertCircle, 
  CheckCircle2, Sparkles, Layers, Code2, History, Trash2, Play, Clock
} from 'lucide-react';
import { cn } from '../utils';
import { validateGraphQLQuery, GraphQLValidationError } from '../utils/graphqlValidation';
import { SAMPLE_COUNTRIES_SCHEMA } from '../utils/sampleGraphQLSchema';
import { getGraphQLHistory, deleteGraphQLHistoryItem, clearGraphQLHistory, GraphQLHistoryItem } from '../utils/graphqlHistory';
import { getActiveGraphQLTheme, highlightGraphQLCode, GraphQLThemeConfig } from '../utils/graphqlTheme';
import { useStore } from '../store/useStore';

interface GraphQLSchemaExplorerProps {
  schema: any; // Standard GraphQL Introspection __schema
  onInsertQuery?: (queryStub: string, variables?: string) => void;
  currentQuery?: string;
  onIntrospect?: () => void;
  isLoading?: boolean;
  onLoadSampleSchema?: (sampleSchema: any) => void;
}

export const GraphQLSchemaExplorer: React.FC<GraphQLSchemaExplorerProps> = ({
  schema,
  onInsertQuery,
  currentQuery = '',
  onIntrospect,
  isLoading = false,
  onLoadSampleSchema
}) => {
  const [explorerMode, setExplorerMode] = useState<'docs' | 'builder' | 'validation' | 'history'>('docs');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'queries' | 'mutations' | 'types'>('queries');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Query Builder State
  const [builderOperation, setBuilderOperation] = useState<'query' | 'mutation'>('query');
  const [selectedField, setSelectedField] = useState<string>('');
  const [builderArgs, setBuilderArgs] = useState<Record<string, string>>({});
  const [selectedSubfields, setSelectedSubfields] = useState<Record<string, boolean>>({});

  // History State
  const { currentWorkspace, addToast } = useStore();
  const workspaceId = currentWorkspace?.id || 'default';
  const [historyList, setHistoryList] = useState<GraphQLHistoryItem[]>(() => getGraphQLHistory(workspaceId));
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyOpTypeFilter, setHistoryOpTypeFilter] = useState<'all' | 'query' | 'mutation' | 'subscription'>('all');

  const [gqlTheme, setGqlTheme] = useState<GraphQLThemeConfig>(() => getActiveGraphQLTheme());

  useEffect(() => {
    const handleThemeChange = () => {
      setGqlTheme(getActiveGraphQLTheme());
    };
    window.addEventListener('gql_theme_changed', handleThemeChange);
    return () => window.removeEventListener('gql_theme_changed', handleThemeChange);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setHistoryList(getGraphQLHistory(workspaceId));
    };
    handleUpdate();
    window.addEventListener('gql_history_updated', handleUpdate);
    return () => window.removeEventListener('gql_history_updated', handleUpdate);
  }, [workspaceId]);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const handleClearHistory = () => {
    clearGraphQLHistory(workspaceId);
    setHistoryList([]);
    addToast('GraphQL history cleared', 'info', 2000);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteGraphQLHistoryItem(workspaceId, id);
    setHistoryList(prev => prev.filter(item => item.id !== id));
    addToast('Item removed from history', 'info', 1500);
  };

  const queryTypeName = schema?.queryType?.name || 'Query';
  const mutationTypeName = schema?.mutationType?.name || 'Mutation';
  const typesList = schema?.types || [];

  const queryTypeObj = useMemo(() => typesList.find((t: any) => t.name === queryTypeName), [typesList, queryTypeName]);
  const mutationTypeObj = useMemo(() => typesList.find((t: any) => t.name === mutationTypeName), [typesList, mutationTypeName]);

  const customTypes = useMemo(() => {
    return typesList.filter((t: any) => {
      if (t.name === queryTypeName || t.name === mutationTypeName) return false;
      if (t.name.startsWith('__')) return false;
      if (['String', 'Int', 'Boolean', 'Float', 'ID'].includes(t.name)) return false;
      return true;
    });
  }, [typesList, queryTypeName, mutationTypeName]);

  const getReadableType = (typeObj: any): string => {
    if (!typeObj) return '';
    if (typeObj.kind === 'NON_NULL') {
      return `${getReadableType(typeObj.ofType)}!`;
    }
    if (typeObj.kind === 'LIST') {
      return `[${getReadableType(typeObj.ofType)}]`;
    }
    return typeObj.name || '';
  };

  const getUnwrappedTypeName = (typeObj: any): string => {
    if (!typeObj) return '';
    if (typeObj.kind === 'NON_NULL' || typeObj.kind === 'LIST') {
      return getUnwrappedTypeName(typeObj.ofType);
    }
    return typeObj.name || '';
  };

  const isTypeScalarOrEnum = (typeObj: any): boolean => {
    if (!typeObj) return true;
    if (typeObj.kind === 'NON_NULL' || typeObj.kind === 'LIST') {
      return isTypeScalarOrEnum(typeObj.ofType);
    }
    return typeObj.kind === 'SCALAR' || typeObj.kind === 'ENUM';
  };

  const generateQueryStub = (field: any, isMutation: boolean = false): string => {
    const args = field.args || [];
    const hasArgs = args.length > 0;
    
    let argsString = '';
    if (hasArgs) {
      argsString = '(' + args.map((arg: any) => `${arg.name}: ${getArgPlaceholder(arg)}`).join(', ') + ')';
    }

    const returnType = field.type;
    const isScalarOrEnum = isTypeScalarOrEnum(returnType);

    const unwrappedType = getUnwrappedTypeName(returnType);
    const targetTypeObj = typesList.find((t: any) => t.name === unwrappedType);

    let subfieldsStr = '';
    if (!isScalarOrEnum && targetTypeObj?.fields) {
      const top3Fields = targetTypeObj.fields.slice(0, 4).map((f: any) => f.name).join('\n    ');
      subfieldsStr = ` {\n    ${top3Fields}\n  }`;
    }

    if (isMutation) {
      return `mutation {\n  ${field.name}${argsString}${subfieldsStr || ' # returns scalar'}\n}`;
    } else {
      return `query {\n  ${field.name}${argsString}${subfieldsStr || ' # returns scalar'}\n}`;
    }
  };

  const getArgPlaceholder = (arg: any): string => {
    const readable = getReadableType(arg.type);
    if (readable.includes('!')) {
      if (readable.startsWith('Int')) return '0';
      if (readable.startsWith('Float')) return '0.0';
      if (readable.startsWith('Boolean')) return 'true';
      return '"..."';
    }
    return 'null';
  };

  // Filter queries
  const filteredQueries = useMemo(() => {
    const fields = queryTypeObj?.fields || [];
    if (!searchTerm) return fields;
    return fields.filter((f: any) => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [queryTypeObj, searchTerm]);

  // Filter mutations
  const filteredMutations = useMemo(() => {
    const fields = mutationTypeObj?.fields || [];
    if (!searchTerm) return fields;
    return fields.filter((f: any) => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [mutationTypeObj, searchTerm]);

  // Filter custom types
  const filteredTypes = useMemo(() => {
    if (!searchTerm) return customTypes;
    return customTypes.filter((t: any) => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customTypes, searchTerm]);

  // Filter history items
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      if (historyOpTypeFilter !== 'all' && item.operationType !== historyOpTypeFilter) {
        return false;
      }
      if (!historySearchTerm) return true;
      const term = historySearchTerm.toLowerCase();
      return (
        item.query.toLowerCase().includes(term) ||
        (item.operationName && item.operationName.toLowerCase().includes(term)) ||
        (item.url && item.url.toLowerCase().includes(term)) ||
        (item.variables && item.variables.toLowerCase().includes(term))
      );
    });
  }, [historyList, historyOpTypeFilter, historySearchTerm]);

  // Live Query Validation
  const validationErrors = useMemo(() => {
    return validateGraphQLQuery(currentQuery, schema);
  }, [currentQuery, schema]);

  // Visual Query Builder Generation
  const activeRootFields = builderOperation === 'query' ? (queryTypeObj?.fields || []) : (mutationTypeObj?.fields || []);
  const activeFieldObj = useMemo(() => {
    if (!selectedField && activeRootFields.length > 0) {
      return activeRootFields[0];
    }
    return activeRootFields.find((f: any) => f.name === selectedField) || activeRootFields[0];
  }, [activeRootFields, selectedField]);

  const activeFieldReturnType = useMemo(() => {
    if (!activeFieldObj) return null;
    const unwrappedName = getUnwrappedTypeName(activeFieldObj.type);
    return typesList.find((t: any) => t.name === unwrappedName);
  }, [activeFieldObj, typesList]);

  // Build string from Builder selections
  const generatedBuilderQuery = useMemo(() => {
    if (!activeFieldObj) return '';
    const fieldName = activeFieldObj.name;
    const args = activeFieldObj.args || [];
    
    const formattedArgs: string[] = [];
    args.forEach((a: any) => {
      const val = builderArgs[a.name];
      if (val !== undefined && val.trim() !== '') {
        const readable = getReadableType(a.type);
        if (readable.includes('Int') || readable.includes('Float') || readable.includes('Boolean')) {
          formattedArgs.push(`${a.name}: ${val}`);
        } else if (val.startsWith('{') || val.startsWith('[')) {
          formattedArgs.push(`${a.name}: ${val}`);
        } else {
          formattedArgs.push(`${a.name}: "${val}"`);
        }
      }
    });

    const argString = formattedArgs.length > 0 ? `(${formattedArgs.join(', ')})` : '';

    const selectedKeys = Object.keys(selectedSubfields).filter(k => selectedSubfields[k]);
    let selectionSet = '';
    if (selectedKeys.length > 0) {
      selectionSet = ` {\n    ${selectedKeys.join('\n    ')}\n  }`;
    } else if (activeFieldReturnType?.fields) {
      const defaultFields = activeFieldReturnType.fields.slice(0, 3).map((f: any) => f.name).join('\n    ');
      selectionSet = ` {\n    ${defaultFields}\n  }`;
    }

    return `${builderOperation} {\n  ${fieldName}${argString}${selectionSet}\n}`;
  }, [activeFieldObj, builderOperation, builderArgs, selectedSubfields, activeFieldReturnType]);

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] border-l border-[var(--border-subtle)] w-88 shrink-0 overflow-hidden font-sans">
      {/* Top Explorer Mode Selector */}
      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 flex items-center justify-between gap-1">
        <div className="flex bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md p-0.5 w-full">
          <button
            onClick={() => setExplorerMode('docs')}
            className={cn(
              "flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1",
              explorerMode === 'docs' ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <BookOpen className="w-3 h-3" />
            Schema
          </button>
          <button
            onClick={() => setExplorerMode('builder')}
            className={cn(
              "flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1",
              explorerMode === 'builder' ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <Sliders className="w-3 h-3" />
            Builder
          </button>
          <button
            onClick={() => setExplorerMode('validation')}
            className={cn(
              "flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1 relative",
              explorerMode === 'validation' ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <CheckCircle2 className="w-3 h-3" />
            Validation
            {validationErrors.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse absolute top-1 right-1" />
            )}
          </button>
          <button
            onClick={() => setExplorerMode('history')}
            className={cn(
              "flex-1 py-1 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1 relative",
              explorerMode === 'history' ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <History className="w-3 h-3" />
            History
            {historyList.length > 0 && (
              <span className="text-[9px] px-1 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                {historyList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* HISTORY MODE AVAILABLE REGARDLESS OF SCHEMA PRESENCE */}
      {explorerMode === 'history' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)] font-sans">
          {/* History Header & Search */}
          <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 px-2.5 py-1.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-md focus-within:border-[var(--border-focus)] transition-all">
                <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                <input
                  type="text"
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  placeholder="Search query history..."
                  className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              {historyList.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  title="Clear all GraphQL history"
                  className="p-1.5 bg-[var(--bg-input)] hover:bg-red-500/10 hover:text-red-400 text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[10px] font-semibold">
              {(['all', 'query', 'mutation', 'subscription'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setHistoryOpTypeFilter(type)}
                  className={cn(
                    "px-2 py-0.5 rounded uppercase tracking-wider transition-all",
                    historyOpTypeFilter === type
                      ? "bg-[var(--primary)] text-white font-bold"
                      : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-secondary)]">
                <Clock className="w-8 h-8 mb-2 opacity-40 text-blue-400" />
                <p className="text-xs font-bold text-[var(--text-primary)] mb-1">No GraphQL History</p>
                <p className="text-[10px] max-w-xs leading-normal">
                  {historySearchTerm || historyOpTypeFilter !== 'all' 
                    ? "No history entries match your current search or filter."
                    : "Queries executed in the GraphQL editor will automatically appear here for quick re-execution."}
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isExpanded = expandedItems[`hist_${item.id}`];
                const isMutation = item.operationType === 'mutation';
                const isSubscription = item.operationType === 'subscription';

                return (
                  <div 
                    key={item.id}
                    className="border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-panel)] p-2.5 shadow-sm transition-all hover:border-[var(--border-strong)] group"
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={cn(
                          "text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
                          isMutation ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          isSubscription ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        )}>
                          {item.operationType}
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">
                          {item.operationName || (item.query.trim().split('\n')[0].slice(0, 30))}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.status && (
                          <span className={cn(
                            "text-[9px] font-mono px-1 rounded",
                            item.status < 300 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
                          )}>
                            {item.status}
                          </span>
                        )}
                        {item.timeMs !== undefined && (
                          <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                            {item.timeMs}ms
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          title="Delete from history"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-400 text-[var(--text-secondary)] rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Query Snippet Preview */}
                    <div className="bg-[var(--bg-input)] rounded p-2 font-mono text-[10px] text-[var(--text-primary)] relative border border-[var(--border-subtle)]/50">
                      <div 
                        className="whitespace-pre-wrap break-words max-h-24 overflow-y-auto font-mono text-[10px] leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightGraphQLCode(
                            isExpanded ? item.query : (item.query.length > 140 ? item.query.slice(0, 140) + '...' : item.query),
                            gqlTheme
                          ) 
                        }}
                      />

                      {item.variables && item.variables !== '{}' && (
                        <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)] text-[9px] text-[var(--text-secondary)]">
                          <span className="font-bold text-amber-400">Variables: </span>
                          <span className="font-mono">{item.variables.length > 50 ? item.variables.slice(0, 50) + '...' : item.variables}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[var(--border-subtle)] text-[10px]">
                      <span className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 opacity-60" />
                        {formatTimestamp(item.timestamp)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {item.query.length > 140 && (
                          <button
                            onClick={() => toggleExpand(`hist_${item.id}`)}
                            className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold"
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(item.query, `hist_${item.id}`)}
                          className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded transition-colors"
                          title="Copy Query"
                        >
                          {copiedText === `hist_${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {onInsertQuery && (
                          <button
                            onClick={() => onInsertQuery(item.query, item.variables)}
                            className="flex items-center gap-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all shadow-sm"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            Run Query
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : !schema ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-[var(--bg-base)] font-sans">
          <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-3 text-purple-400 border border-purple-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">No Introspection Schema</h4>
          <p className="text-[10px] text-[var(--text-secondary)] max-w-xs mb-4 leading-normal">
            Fetch the live GraphQL schema from your endpoint or load a sample schema to explore fields & use the visual query builder.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {onIntrospect && (
              <button
                onClick={onIntrospect}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold py-2 rounded shadow transition-all disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {isLoading ? 'Fetching Introspection...' : 'Run Introspection'}
              </button>
            )}
            {onLoadSampleSchema && (
              <button
                onClick={() => onLoadSampleSchema(SAMPLE_COUNTRIES_SCHEMA)}
                className="w-full flex items-center justify-center gap-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold py-1.5 rounded transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Load Sample Schema (Countries API)
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* DOCS MODE */}
          {explorerMode === 'docs' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)]">
              {/* Search */}
              <div className="p-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-md focus-within:border-[var(--border-focus)] transition-all">
                  <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search schema fields..."
                    className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                  />
                </div>
              </div>

              {/* Navigation tabs */}
              <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[10px] font-bold uppercase tracking-wider shrink-0">
                <button
                  onClick={() => setActiveTab('queries')}
                  className={cn(
                    "flex-1 py-2 text-center border-b-2 transition-all",
                    activeTab === 'queries'
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-panel)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Queries ({filteredQueries.length})
                </button>
                <button
                  onClick={() => setActiveTab('mutations')}
                  className={cn(
                    "flex-1 py-2 text-center border-b-2 transition-all",
                    activeTab === 'mutations'
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-panel)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Mutations ({filteredMutations.length})
                </button>
                <button
                  onClick={() => setActiveTab('types')}
                  className={cn(
                    "flex-1 py-2 text-center border-b-2 transition-all",
                    activeTab === 'types'
                      ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-panel)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Types ({filteredTypes.length})
                </button>
              </div>

              {/* List content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {activeTab === 'queries' && (
                  filteredQueries.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No queries found</div>
                  ) : (
                    filteredQueries.map((field: any) => (
                      <div key={field.name} className="border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-panel)] p-2 mb-1.5 shadow-sm transition-all hover:border-[var(--border-strong)]">
                        <div className="flex items-start justify-between gap-1">
                          <button 
                            onClick={() => toggleExpand(`q_${field.name}`)}
                            className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--primary)] text-left hover:opacity-80 transition-opacity flex-1 min-w-0"
                          >
                            {expandedItems[`q_${field.name}`] ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{field.name}</span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {onInsertQuery && (
                              <button
                                onClick={() => onInsertQuery(generateQueryStub(field, false))}
                                title="Insert query stub"
                                className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--primary)] rounded transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(generateQueryStub(field, false), `q_${field.name}`)}
                              title="Copy query stub"
                              className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--primary)] rounded transition-colors"
                            >
                              {copiedText === `q_${field.name}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="font-mono text-[10px] text-[var(--text-secondary)] mt-1 px-5 truncate">
                          Type: <span className="text-blue-400 font-bold">{getReadableType(field.type)}</span>
                        </div>

                        {expandedItems[`q_${field.name}`] && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] px-2 space-y-2 text-xs">
                            {field.description && (
                              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-hover)] p-1.5 rounded border border-[var(--border-subtle)]/50">
                                {field.description}
                              </p>
                            )}
                            
                            {field.args && field.args.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Arguments:</div>
                                {field.args.map((arg: any) => (
                                  <div key={arg.name} className="flex items-baseline justify-between gap-2 font-mono text-[10px] bg-[var(--bg-hover)] px-2 py-1 rounded">
                                    <span className="font-semibold text-[var(--text-primary)]">{arg.name}</span>
                                    <span className="text-blue-400">{getReadableType(arg.type)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )
                )}

                {activeTab === 'mutations' && (
                  filteredMutations.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No mutations found</div>
                  ) : (
                    filteredMutations.map((field: any) => (
                      <div key={field.name} className="border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-panel)] p-2 mb-1.5 shadow-sm transition-all hover:border-[var(--border-strong)]">
                        <div className="flex items-start justify-between gap-1">
                          <button 
                            onClick={() => toggleExpand(`m_${field.name}`)}
                            className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--text-put)] text-left hover:opacity-80 transition-opacity flex-1 min-w-0"
                          >
                            {expandedItems[`m_${field.name}`] ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                            <span className="truncate">{field.name}</span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {onInsertQuery && (
                              <button
                                onClick={() => onInsertQuery(generateQueryStub(field, true))}
                                title="Insert mutation stub"
                                className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-put)] rounded transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(generateQueryStub(field, true), `m_${field.name}`)}
                              title="Copy mutation stub"
                              className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-put)] rounded transition-colors"
                            >
                              {copiedText === `m_${field.name}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="font-mono text-[10px] text-[var(--text-secondary)] mt-1 px-5 truncate">
                          Type: <span className="text-blue-400 font-bold">{getReadableType(field.type)}</span>
                        </div>

                        {expandedItems[`m_${field.name}`] && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] px-2 space-y-2 text-xs">
                            {field.description && (
                              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-hover)] p-1.5 rounded border border-[var(--border-subtle)]/50">
                                {field.description}
                              </p>
                            )}
                            
                            {field.args && field.args.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Arguments:</div>
                                {field.args.map((arg: any) => (
                                  <div key={arg.name} className="flex items-baseline justify-between gap-2 font-mono text-[10px] bg-[var(--bg-hover)] px-2 py-1 rounded">
                                    <span className="font-semibold text-[var(--text-primary)]">{arg.name}</span>
                                    <span className="text-blue-400">{getReadableType(arg.type)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )
                )}

                {activeTab === 'types' && (
                  filteredTypes.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[var(--text-secondary)]">No types found</div>
                  ) : (
                    filteredTypes.map((type: any) => (
                      <div key={type.name} className="border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-panel)] p-2 mb-1.5 shadow-sm transition-all hover:border-[var(--border-strong)]">
                        <button 
                          onClick={() => toggleExpand(`t_${type.name}`)}
                          className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)] text-left hover:opacity-80 transition-opacity w-full"
                        >
                          {expandedItems[`t_${type.name}`] ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-secondary)]" />}
                          <span className="truncate">{type.name}</span>
                          <span className="text-[9px] bg-[var(--bg-hover)] text-[var(--text-secondary)] font-sans px-1 rounded uppercase tracking-wider ml-auto">
                            {type.kind}
                          </span>
                        </button>

                        {expandedItems[`t_${type.name}`] && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] px-2 space-y-2 text-xs">
                            {type.description && (
                              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-hover)] p-1.5 rounded border border-[var(--border-subtle)]/50">
                                {type.description}
                              </p>
                            )}

                            {type.fields && type.fields.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold mb-1">Fields:</div>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {type.fields.map((f: any) => (
                                    <div key={f.name} className="flex flex-col bg-[var(--bg-hover)] px-2 py-1.5 rounded border border-[var(--border-subtle)]/30">
                                      <div className="flex items-baseline justify-between gap-2 font-mono text-[10px]">
                                        <span className="font-semibold text-[var(--text-primary)]">{f.name}</span>
                                        <span className="text-blue-400 font-bold">{getReadableType(f.type)}</span>
                                      </div>
                                      {f.description && (
                                        <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 leading-normal">
                                          {f.description}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          )}

          {/* BUILDER MODE */}
          {explorerMode === 'builder' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)] p-3 space-y-3 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Operation Type
                </label>
                <div className="flex bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded p-0.5">
                  <button
                    onClick={() => {
                      setBuilderOperation('query');
                      setSelectedField('');
                      setSelectedSubfields({});
                    }}
                    className={cn(
                      "flex-1 py-1 text-xs font-bold rounded transition-all",
                      builderOperation === 'query' ? "bg-blue-500 text-white" : "text-[var(--text-secondary)]"
                    )}
                  >
                    Query
                  </button>
                  <button
                    onClick={() => {
                      setBuilderOperation('mutation');
                      setSelectedField('');
                      setSelectedSubfields({});
                    }}
                    className={cn(
                      "flex-1 py-1 text-xs font-bold rounded transition-all",
                      builderOperation === 'mutation' ? "bg-amber-500 text-white" : "text-[var(--text-secondary)]"
                    )}
                  >
                    Mutation
                  </button>
                </div>
              </div>

              {/* Target Field Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Root Endpoint Field
                </label>
                <select
                  value={activeFieldObj?.name || ''}
                  onChange={(e) => {
                    setSelectedField(e.target.value);
                    setSelectedSubfields({});
                    setBuilderArgs({});
                  }}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2.5 py-1.5 text-xs font-mono font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                >
                  {activeRootFields.map((f: any) => (
                    <option key={f.name} value={f.name}>{f.name} ({getReadableType(f.type)})</option>
                  ))}
                </select>
              </div>

              {/* Arguments Input */}
              {activeFieldObj && activeFieldObj.args && activeFieldObj.args.length > 0 && (
                <div className="space-y-2 border-t border-[var(--border-subtle)] pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                    Field Arguments
                  </span>
                  <div className="space-y-1.5">
                    {activeFieldObj.args.map((arg: any) => (
                      <div key={arg.name} className="flex flex-col gap-1 bg-[var(--bg-input)] p-2 rounded border border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-bold text-[var(--text-primary)]">{arg.name}</span>
                          <span className="text-blue-400">{getReadableType(arg.type)}</span>
                        </div>
                        <input
                          type="text"
                          value={builderArgs[arg.name] || ''}
                          onChange={(e) => setBuilderArgs({ ...builderArgs, [arg.name]: e.target.value })}
                          placeholder={getArgPlaceholder(arg)}
                          className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Return Fields Selection Tree */}
              {activeFieldReturnType && activeFieldReturnType.fields && (
                <div className="space-y-2 border-t border-[var(--border-subtle)] pt-2 flex-1 min-h-0 flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                    Select Return Fields ({activeFieldReturnType.name})
                  </span>
                  <div className="space-y-1 overflow-y-auto max-h-48 pr-1">
                    {activeFieldReturnType.fields.map((f: any) => {
                      const isChecked = !!selectedSubfields[f.name];
                      return (
                        <div
                          key={f.name}
                          onClick={() => setSelectedSubfields({ ...selectedSubfields, [f.name]: !isChecked })}
                          className={cn(
                            "flex items-center justify-between p-1.5 rounded cursor-pointer text-xs font-mono transition-colors",
                            isChecked ? "bg-[var(--primary)]/10 text-[var(--primary)] font-bold" : "bg-[var(--bg-input)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" /> : <Square className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />}
                            <span className="truncate">{f.name}</span>
                          </div>
                          <span className="text-[9px] opacity-70 shrink-0">{getReadableType(f.type)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generated Query Preview */}
              <div className="space-y-1.5 border-t border-[var(--border-subtle)] pt-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Generated Query Preview
                </span>
                <div 
                  className="p-2.5 rounded bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[10px] leading-relaxed whitespace-pre overflow-x-auto max-h-32"
                  dangerouslySetInnerHTML={{ __html: highlightGraphQLCode(generatedBuilderQuery, gqlTheme) }}
                />
              </div>

              {/* Apply Button */}
              {onInsertQuery && (
                <button
                  onClick={() => onInsertQuery(generatedBuilderQuery)}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold py-2 rounded shadow transition-all shrink-0 mt-auto"
                >
                  <Code2 className="w-4 h-4" />
                  Apply Generated Query
                </button>
              )}
            </div>
          )}

          {/* VALIDATION MODE */}
          {explorerMode === 'validation' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)] p-4 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">Query Validation Status</span>
                {validationErrors.length === 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Valid Query
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    <AlertTriangle className="w-3 h-3" /> {validationErrors.length} Issue(s)
                  </span>
                )}
              </div>

              {validationErrors.length === 0 ? (
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center flex flex-col items-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Syntax & Schema Checked</p>
                  <p className="text-[10px] text-[var(--text-secondary)] max-w-xs">
                    Brackets are balanced and fields match the introspection schema definition.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validationErrors.map((err, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-xs font-mono text-red-400"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {err.line && <span className="text-[10px] font-bold opacity-80">Line {err.line}</span>}
                        <span className="break-words">{err.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
