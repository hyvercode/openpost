import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Settings2, Plus, Eye, EyeOff, Save, Check, Lock, Unlock, Trash2, Globe, Layers, Sparkles } from 'lucide-react';
import { KeyValue, Environment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../lib/api';
import { cn } from '../utils';

export function QuickEnvironmentModal() {
  const { 
    isQuickEnvModalOpen, 
    setIsQuickEnvModalOpen, 
    environments, 
    setEnvironments, 
    currentEnvironment, 
    setCurrentEnvironment,
    editingEnvironment,
    setEditingEnvironment,
    setActiveView,
    currentWorkspace,
    addToast
  } = useStore();

  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [variables, setVariables] = useState<KeyValue[]>([]);
  const [envName, setEnvName] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    if (isQuickEnvModalOpen) {
      const activeId = currentEnvironment?.id || environments[0]?.id || '';
      setSelectedEnvId(activeId);
    }
  }, [isQuickEnvModalOpen, currentEnvironment, environments]);

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  useEffect(() => {
    if (selectedEnv) {
      const storeVars = selectedEnv.variables || [];
      const normalizedVariables = storeVars.map(v => ({
        id: v.id || uuidv4(),
        key: v.key || '',
        value: v.value || '',
        enabled: v.enabled !== false,
        isSecret: v.isSecret ?? (v.type === 'secret'),
        type: v.type || (v.isSecret ? 'secret' : 'text')
      }));
      setVariables(normalizedVariables.length ? normalizedVariables : [{ id: uuidv4(), key: '', value: '', enabled: true, isSecret: false }]);
      setEnvName(selectedEnv.name || '');
    } else {
      setVariables([]);
      setEnvName('');
    }
  }, [selectedEnvId, environments]);

  if (!isQuickEnvModalOpen) return null;

  const handleCreateNewEnvironment = async () => {
    if (!currentWorkspace) return;
    try {
      const newEnv: Omit<Environment, 'id'> = {
        name: 'New Environment',
        workspaceId: currentWorkspace.id,
        variables: [
          { id: uuidv4(), key: 'baseUrl', value: 'https://api.example.com', enabled: true },
          { id: uuidv4(), key: 'apiKey', value: 'secret_12345', enabled: true, isSecret: true }
        ]
      };
      const created = await apiService.createEnvironment(newEnv);
      setEnvironments([...environments, created]);
      setSelectedEnvId(created.id);
      setCurrentEnvironment(created);
      addToast('New environment created', 'success', 2000);
    } catch (err) {
      console.error('Failed to create environment:', err);
      addToast('Failed to create environment', 'error');
    }
  };

  const handleSave = async () => {
    if (!selectedEnv) return;
    setIsSaving(true);
    try {
      const filteredVars = variables.filter(v => v.key.trim() !== '');
      const updatedEnv = {
        ...selectedEnv,
        name: envName,
        variables: filteredVars
      };

      await apiService.updateEnvironment(selectedEnv.id, {
        name: envName,
        variables: filteredVars
      });
      
      const newEnvs = environments.map(e => e.id === selectedEnv.id ? updatedEnv : e);
      setEnvironments(newEnvs);

      if (currentEnvironment && currentEnvironment.id === selectedEnv.id) {
        setCurrentEnvironment(updatedEnv);
      }

      if (editingEnvironment && editingEnvironment.id === selectedEnv.id) {
        setEditingEnvironment(updatedEnv);
      }
      
      addToast(`Environment "${envName}" saved successfully!`, 'success', 2000);
    } catch (e) {
      console.error('Failed to save quick environment:', e);
      addToast('Failed to save environment', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVariable = () => {
    setVariables(prev => [...prev, { id: uuidv4(), key: '', value: '', enabled: true, isSecret: false }]);
  };

  const handleChange = (id: string, field: keyof KeyValue, value: any) => {
    setVariables(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleToggleSecret = (id: string) => {
    setVariables(prev => prev.map(v => {
      if (v.id === id) {
        const nextSecret = !v.isSecret;
        return {
          ...v,
          isSecret: nextSecret,
          type: nextSecret ? 'secret' : 'text'
        };
      }
      return v;
    }));
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRemove = (id: string) => {
    setVariables(prev => {
      const newVars = prev.filter(v => v.id !== id);
      return newVars.length === 0 
        ? [{ id: uuidv4(), key: '', value: '', enabled: true, isSecret: false }]
        : newVars;
    });
  };

  const filteredVars = variables.filter(v => 
    !filterQuery || v.key.toLowerCase().includes(filterQuery.toLowerCase()) || v.value.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)]">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Environment Variables Manager
                <span className="text-[10px] font-mono font-normal bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
                  Quick Access
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Inspect and edit environment variables used across HTTP headers, body, params & scripts.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsQuickEnvModalOpen(false)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          
          {/* Environment Sidebar Selector */}
          <div className="w-full md:w-56 p-3 bg-[var(--bg-surface)] flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Environments</span>
              <button
                onClick={handleCreateNewEnvironment}
                className="text-[10px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto max-h-44 md:max-h-full flex-1">
              {environments.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--text-secondary)] italic">
                  No environments found.
                </div>
              ) : (
                environments.map(env => {
                  const isActive = env.id === currentEnvironment?.id;
                  const isSelected = env.id === selectedEnvId;
                  return (
                    <div
                      key={env.id}
                      onClick={() => setSelectedEnvId(env.id)}
                      className={cn(
                        "group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold border-[var(--primary)]/30" 
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400 opacity-40"
                        )} />
                        <span className="truncate">{env.name}</span>
                      </div>
                      
                      {isActive ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Active</span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentEnvironment(env);
                            addToast(`Active environment set to "${env.name}"`, 'success', 2000);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[9px] text-[var(--text-secondary)] hover:text-[var(--primary)] underline"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Variables Table */}
          <div className="flex-1 flex flex-col p-4 bg-[var(--bg-panel)] overflow-hidden">
            {selectedEnv ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[var(--primary)]" />
                    <input 
                      type="text"
                      value={envName}
                      onChange={(e) => setEnvName(e.target.value)}
                      className="bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--primary)] px-1"
                      placeholder="Environment Name"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder="Filter variables..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded text-[var(--text-primary)] outline-none w-36 sm:w-44 focus:border-[var(--primary)]"
                    />
                    <button 
                      onClick={handleAddVariable}
                      className="px-2.5 py-1 bg-[var(--bg-hover)] hover:bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Row
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-base)]">
                  <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                    <div className="w-8 shrink-0 py-1.5 text-center">En</div>
                    <div className="flex-1 py-1.5 px-2 border-l border-[var(--border-subtle)]">Key</div>
                    <div className="flex-1 py-1.5 px-2 border-l border-[var(--border-subtle)]">Value</div>
                    <div className="w-24 shrink-0 py-1.5 text-center border-l border-[var(--border-subtle)]">Type</div>
                    <div className="w-8 shrink-0"></div>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]/40">
                    {filteredVars.map(item => {
                      const isSecret = !!item.isSecret;
                      const isRevealed = !!revealedIds[item.id];

                      return (
                        <div key={item.id} className="flex items-center group hover:bg-[var(--bg-hover)]/30 text-xs font-mono">
                          <div className="w-8 shrink-0 flex items-center justify-center">
                            <input 
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) => handleChange(item.id, 'enabled', e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-[var(--primary)]"
                            />
                          </div>
                          <div className="flex-1 px-2 py-1 border-l border-[var(--border-subtle)]">
                            <input 
                              type="text"
                              value={item.key}
                              onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                              placeholder="VARIABLE_NAME"
                              className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50"
                            />
                          </div>
                          <div className="relative flex-1 px-2 py-1 border-l border-[var(--border-subtle)] flex items-center">
                            <input 
                              type={isSecret && !isRevealed ? "password" : "text"}
                              value={item.value}
                              onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                              placeholder="value"
                              className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 pr-6"
                            />
                            {isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleReveal(item.id)}
                                className="absolute right-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          <div className="w-24 shrink-0 border-l border-[var(--border-subtle)] flex items-center justify-center py-1">
                            <button
                              type="button"
                              onClick={() => handleToggleSecret(item.id)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans border transition-colors",
                                isSecret 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                              )}
                            >
                              {isSecret ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                              <span>{isSecret ? 'Secret' : 'Text'}</span>
                            </button>
                          </div>
                          <div className="w-8 shrink-0 flex items-center justify-center">
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-delete)] p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--text-secondary)]">
                <Layers className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">No Environment Selected</p>
                <p className="text-xs mb-4 max-w-xs">Select or create an environment from the left sidebar to start defining key-value variables.</p>
                <button
                  onClick={handleCreateNewEnvironment}
                  className="px-4 py-2 bg-[var(--primary)] text-white font-bold text-xs rounded-lg shadow-sm hover:opacity-90"
                >
                  Create Environment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <button
            onClick={() => {
              setIsQuickEnvModalOpen(false);
              if (selectedEnv) {
                setEditingEnvironment(selectedEnv);
                setActiveView('environment');
              }
            }}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] underline flex items-center gap-1 font-medium"
          >
            <span>Open Full Environment Tab</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQuickEnvModalOpen(false)}
              className="px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedEnv}
              className="px-4 py-1.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
