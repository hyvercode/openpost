import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, Save, Settings2 } from 'lucide-react';

export function EnvironmentPanel() {
  const { editingEnvironment } = useStore();
  const [variables, setVariables] = useState<KeyValue[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingEnvironment) {
      setVariables(editingEnvironment.variables?.length ? editingEnvironment.variables : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
    }
  }, [editingEnvironment]);

  const handleSave = async () => {
    if (!editingEnvironment) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "environments", editingEnvironment.id), {
        variables: variables.filter(v => v.key.trim() !== '')
      });
    } catch(e) {
      console.error("Failed to save environment", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (id: string, field: keyof KeyValue, value: string | boolean) => {
    const newVars = variables.map(v => v.id === id ? { ...v, [field]: value } : v);
    if (field === 'key' && variables[variables.length - 1].id === id && value !== '') {
      newVars.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }
    setVariables(newVars);
  };

  const handleRemove = (id: string) => {
    if (variables.length === 1) {
      setVariables([{ id: uuidv4(), key: '', value: '', enabled: true }]);
    } else {
      setVariables(variables.filter(v => v.id !== id));
    }
  };

  if (!editingEnvironment) return null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-[var(--text-primary)] text-lg font-semibold flex items-center gap-2 mb-1">
            <Settings2 className="w-5 h-5 text-[var(--primary)]" />
            {editingEnvironment.name}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">Manage environment variables</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[var(--bg-hover)] border border-[var(--border-strong)] hover:border-[var(--border-focus)] disabled:opacity-50 text-[var(--text-primary)] px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
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
