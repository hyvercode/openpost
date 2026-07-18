import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../lib/api';
import { Trash2, Save, Settings2, Plus, Check } from 'lucide-react';

export function EnvironmentPanel() {
  const { editingEnvironment, setEditingEnvironment, environments, setEnvironments, addToast } = useStore();
  const [variables, setVariables] = useState<KeyValue[]>([]);
  const [envName, setEnvName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Changed' | ''>('');

  const skipNextAutosave = useRef(false);
  const loadedEnvIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingEnvironment) {
      if (editingEnvironment.id !== loadedEnvIdRef.current) {
        loadedEnvIdRef.current = editingEnvironment.id;
        skipNextAutosave.current = true;
        
        const normalizedVariables = (editingEnvironment.variables || []).map(v => ({
          id: v.id || uuidv4(),
          key: v.key || '',
          value: v.value || '',
          enabled: v.enabled !== false
        }));
        setVariables(normalizedVariables.length ? normalizedVariables : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
        setEnvName(editingEnvironment.name || '');
        setSaveStatus('');
      }
    } else {
      loadedEnvIdRef.current = null;
      setVariables([]);
      setEnvName('');
      setSaveStatus('');
    }
  }, [editingEnvironment]);

  const handleAutosaveEnvironment = async (currentVariables: KeyValue[], currentEnvName: string) => {
    if (!editingEnvironment) return;
    setSaveStatus('Saving...');
    try {
      const filteredVars = currentVariables.filter(v => v.key.trim() !== '');
      const updatedEnv = {
        ...editingEnvironment,
        name: currentEnvName,
        variables: filteredVars
      };

      await apiService.updateEnvironment(editingEnvironment.id, {
        name: currentEnvName,
        variables: filteredVars
      });
      
      setEditingEnvironment(updatedEnv);
      setEnvironments(environments.map(e => e.id === editingEnvironment.id ? updatedEnv : e));

      // If this environment is also the active current environment, synchronize it too
      const { currentEnvironment, setCurrentEnvironment } = useStore.getState();
      if (currentEnvironment && currentEnvironment.id === editingEnvironment.id) {
        setCurrentEnvironment(updatedEnv);
      }
      
      setSaveStatus('Saved');
    } catch (e) {
      console.error("Autosave environment failed", e);
      setSaveStatus('Changed');
    }
  };

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!editingEnvironment || editingEnvironment.id !== loadedEnvIdRef.current) return;

    // Check if anything actually changed compared to the current editingEnvironment in store
    const isNameSame = envName === (editingEnvironment.name || '');
    
    const cleanVars = variables.filter(v => v.key.trim() !== '');
    const storeVars = editingEnvironment.variables || [];
    
    const isVarsSame = cleanVars.length === storeVars.length && cleanVars.every((v, i) => {
      const sv = storeVars[i];
      return sv && v.key === sv.key && v.value === sv.value && v.enabled === sv.enabled;
    });

    if (isNameSame && isVarsSame) {
      return;
    }
    
    setSaveStatus('Changed');
    
    const timeout = setTimeout(() => {
      handleAutosaveEnvironment(variables, envName);
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [variables, envName]);

  const handleSave = async () => {
    if (!editingEnvironment) return;
    setIsSaving(true);
    setSaveStatus('Saving...');
    try {
      const filteredVars = variables.filter(v => v.key.trim() !== '');
      const updatedEnv = {
        ...editingEnvironment,
        name: envName,
        variables: filteredVars
      };

      await apiService.updateEnvironment(editingEnvironment.id, {
        name: envName,
        variables: filteredVars
      });
      
      setEditingEnvironment(updatedEnv);
      setEnvironments(environments.map(e => e.id === editingEnvironment.id ? updatedEnv : e));

      // If this environment is also the active current environment, synchronize it too
      const { currentEnvironment, setCurrentEnvironment } = useStore.getState();
      if (currentEnvironment && currentEnvironment.id === editingEnvironment.id) {
        setCurrentEnvironment(updatedEnv);
      }
      
      setSaveStatus('Saved');
      addToast(`Environment "${envName}" saved`, 'success', 2000);
    } catch(e) {
      console.error("Failed to save environment", e);
      setSaveStatus('Changed');
      addToast('Failed to save environment', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVariable = () => {
    setVariables(prev => [...prev, { id: uuidv4(), key: '', value: '', enabled: true }]);
  };

  const handleChange = (id: string, field: keyof KeyValue, value: string | boolean) => {
    setVariables(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleRemove = (id: string) => {
    setVariables(prev => {
      const newVars = prev.filter(v => v.id !== id);
      return newVars.length === 0 
        ? [{ id: uuidv4(), key: '', value: '', enabled: true }]
        : newVars;
    });
  };

  if (!editingEnvironment) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 group">
            <Settings2 className="w-5 h-5 text-[var(--primary)] shrink-0" />
            <input 
              type="text"
              value={envName}
              onChange={(e) => setEnvName(e.target.value)}
              className="bg-transparent border-b border-transparent focus:border-[var(--primary)] text-[var(--text-primary)] text-lg font-semibold outline-none w-full max-w-md transition-colors"
              placeholder="Environment Name"
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Manage environment variables for this environment</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center min-w-[80px] text-xs font-medium text-[var(--text-secondary)]">
            {saveStatus === 'Saving...' && <span className="animate-pulse">Saving...</span>}
            {saveStatus === 'Saved' && <span className="flex items-center gap-1 text-green-500"><Check className="w-3.5 h-3.5" /> Saved</span>}
            {saveStatus === 'Changed' && <span>Unsaved...</span>}
          </div>
          <button 
            onClick={handleAddVariable}
            className="bg-[var(--bg-hover)] border border-[var(--border-strong)] hover:border-[var(--border-focus)] text-[var(--text-primary)] px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Variable
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded">
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="w-8 shrink-0 border-r border-[var(--border-subtle)]"></div>
          <div className="flex-1 py-2 px-3 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)] border-r border-[var(--border-subtle)]">Variable</div>
          <div className="flex-1 py-2 px-3 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)]">Initial Value</div>
          <div className="w-10 shrink-0"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {variables.map((item) => (
            <div key={item.id} className="flex items-center group mb-1 border-b border-[var(--bg-panel)] pb-1">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={item.enabled}
                  onChange={(e) => handleChange(item.id, 'enabled', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 accent-[var(--primary)] text-[var(--primary)] focus:ring-offset-gray-900"
                />
              </div>
              <div className="flex-1 px-1">
                <input
                  type="text"
                  placeholder="Key (e.g., API_KEY)"
                  value={item.key || ''}
                  onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                  className="w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors"
                />
              </div>
              <div className="flex-1 px-1">
                <input
                  type="text"
                  placeholder="Value"
                  value={item.value || ''}
                  onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                  className="w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors"
                />
              </div>
              <div className="w-10 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleRemove(item.id)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-delete)] p-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
