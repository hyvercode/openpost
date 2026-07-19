import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, BookOpen, Plus, Copy, Check, Hash, Eye, HelpCircle } from 'lucide-react';
import { cn } from '../utils';

interface GraphQLSchemaExplorerProps {
  schema: any; // Standard GraphQL Introspection __schema
  onInsertQuery?: (queryStub: string) => void;
}

export const GraphQLSchemaExplorer: React.FC<GraphQLSchemaExplorerProps> = ({
  schema,
  onInsertQuery
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'queries' | 'mutations' | 'types'>('queries');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const queryTypeName = schema?.queryType?.name || 'Query';
  const mutationTypeName = schema?.mutationType?.name || 'Mutation';

  const typesList = schema?.types || [];

  // Find the query and mutation type objects
  const queryTypeObj = useMemo(() => typesList.find((t: any) => t.name === queryTypeName), [typesList, queryTypeName]);
  const mutationTypeObj = useMemo(() => typesList.find((t: any) => t.name === mutationTypeName), [typesList, mutationTypeName]);

  // Other user-defined or non-internal types
  const customTypes = useMemo(() => {
    return typesList.filter((t: any) => {
      // Filter out query/mutation/subscription types and built-in __ internals
      if (t.name === queryTypeName || t.name === mutationTypeName) return false;
      if (t.name.startsWith('__')) return false;
      // Filter out standard scalars
      if (['String', 'Int', 'Boolean', 'Float', 'ID'].includes(t.name)) return false;
      return true;
    });
  }, [typesList, queryTypeName, mutationTypeName]);

  // Helper to resolve nested types to readable names
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

  // Helper to construct a template query stub for a field
  const generateQueryStub = (field: any, isMutation: boolean = false): string => {
    const args = field.args || [];
    const hasArgs = args.length > 0;
    
    let argsString = '';
    if (hasArgs) {
      argsString = '(' + args.map((arg: any) => `${arg.name}: ${getArgPlaceholder(arg)}`).join(', ') + ')';
    }

    // Determine type kind to see if we should request subfields
    const returnType = field.type;
    const isScalarOrEnum = isTypeScalarOrEnum(returnType);

    const indent = '  ';
    let subfields = '';
    if (!isScalarOrEnum) {
      subfields = ` {\n${indent}${indent}# Add fields to query\n${indent}}`;
    }

    if (isMutation) {
      return `mutation {\n${indent}${field.name}${argsString}${subfields || ' # returns scalar'}\n}`;
    } else {
      return `query {\n${indent}${field.name}${argsString}${subfields || ' # returns scalar'}\n}`;
    }
  };

  const getArgPlaceholder = (arg: any): string => {
    const readable = getReadableType(arg.type);
    if (readable.includes('!')) {
      if (readable.startsWith('Int')) return '0';
      if (readable.startsWith('Float')) return '0.0';
      if (readable.startsWith('Boolean')) return 'true';
      return '""';
    }
    return 'null';
  };

  const isTypeScalarOrEnum = (typeObj: any): boolean => {
    if (!typeObj) return true;
    if (typeObj.kind === 'NON_NULL' || typeObj.kind === 'LIST') {
      return isTypeScalarOrEnum(typeObj.ofType);
    }
    return typeObj.kind === 'SCALAR' || typeObj.kind === 'ENUM';
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1500);
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

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] border-l border-[var(--border-subtle)] w-80 shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Schema Explorer</span>
        </div>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Browse queries, mutations, and types returned by the schema introspection.
        </p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-md focus-within:border-[var(--border-focus)] transition-all">
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search schema..."
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
      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[var(--bg-base)]">
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
                  <div className="flex items-center gap-1.5 shrink-0">
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
                  <div className="flex items-center gap-1.5 shrink-0">
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
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 no-scrollbar">
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

                    {type.enumValues && type.enumValues.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">Enum Values:</div>
                        <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                          {type.enumValues.map((val: any) => (
                            <span key={val.name} className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded text-[var(--text-primary)]" title={val.description}>
                              {val.name}
                            </span>
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
  );
};
