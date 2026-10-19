import { useState, useEffect, useRef } from 'react';
import { 
  Folder, Database, Globe, Lock, Terminal, Cpu, Cloud, Code, Activity, Shield, Zap, X
} from 'lucide-react';
import { cn } from '../utils';

interface CustomizeCollectionModalProps {
  isOpen: boolean;
  title: string;
  initialName: string;
  initialColor?: string;
  initialIcon?: string;
  onSubmit: (name: string, color: string, icon: string) => void;
  onCancel: () => void;
}

export const COLORS = [
  { name: 'Default', hex: '', class: 'bg-zinc-400 hover:bg-zinc-500' },
  { name: 'Red', hex: '#ef4444', class: 'bg-red-500 hover:bg-red-600' },
  { name: 'Orange', hex: '#f97316', class: 'bg-orange-500 hover:bg-orange-600' },
  { name: 'Yellow', hex: '#eab308', class: 'bg-yellow-500 hover:bg-yellow-600' },
  { name: 'Green', hex: '#22c55e', class: 'bg-emerald-500 hover:bg-emerald-600' },
  { name: 'Blue', hex: '#3b82f6', class: 'bg-blue-500 hover:bg-blue-600' },
  { name: 'Indigo', hex: '#6366f1', class: 'bg-indigo-500 hover:bg-indigo-600' },
  { name: 'Purple', hex: '#a855f7', class: 'bg-purple-500 hover:bg-purple-600' },
  { name: 'Pink', hex: '#ec4899', class: 'bg-pink-500 hover:bg-pink-600' },
];

export const ICONS = [
  { name: 'Folder', component: Folder },
  { name: 'Database', component: Database },
  { name: 'Globe', component: Globe },
  { name: 'Lock', component: Lock },
  { name: 'Terminal', component: Terminal },
  { name: 'Cpu', component: Cpu },
  { name: 'Cloud', component: Cloud },
  { name: 'Code', component: Code },
  { name: 'Activity', component: Activity },
  { name: 'Shield', component: Shield },
  { name: 'Zap', component: Zap },
];

export function getCollectionIcon(iconName?: string) {
  const icon = ICONS.find(i => i.name === iconName);
  return icon ? icon.component : Folder;
}

export function CustomizeCollectionModal({ 
  isOpen, 
  title, 
  initialName, 
  initialColor = '', 
  initialIcon = 'Folder', 
  onSubmit, 
  onCancel 
}: CustomizeCollectionModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(initialIcon);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setColor(initialColor);
      setIcon(initialIcon || 'Folder');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialName, initialColor, initialIcon]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[var(--text-primary)] text-sm font-bold tracking-tight">{title}</h3>
          <button 
            onClick={onCancel}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Collection Name</label>
          <input 
            ref={inputRef} 
            value={name} 
            onChange={e => setName(e.target.value)} 
            onKeyDown={e => { 
              if (e.key === 'Enter' && name.trim()) onSubmit(name.trim(), color, icon); 
              if (e.key === 'Escape') onCancel(); 
            }} 
            placeholder="Enter name..."
            className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors" 
          />
        </div>

        {/* Color Palette Choice */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Color Tag</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => {
              const isSelected = color === c.hex;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all flex items-center justify-center relative hover:scale-110 border border-black/10 shadow-sm",
                    c.class,
                    isSelected ? "ring-2 ring-offset-2 ring-[var(--primary)] ring-offset-[var(--bg-panel)]" : ""
                  )}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Icon Grid Choice */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Custom Icon</label>
          <div className="grid grid-cols-6 gap-1.5 bg-[var(--bg-hover)]/40 p-2 border border-[var(--border-subtle)] rounded-lg">
            {ICONS.map((i) => {
              const IconComp = i.component;
              const isSelected = icon === i.name;
              return (
                <button
                  key={i.name}
                  type="button"
                  onClick={() => setIcon(i.name)}
                  title={i.name}
                  className={cn(
                    "p-2 rounded flex items-center justify-center border transition-all text-[var(--text-secondary)]",
                    isSelected 
                      ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] font-bold scale-105" 
                      : "border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview Segment */}
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <div className="bg-[var(--bg-hover)]/30 border border-[var(--border-subtle)] rounded-lg px-3 py-2 flex items-center gap-2 select-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mr-2">Preview:</span>
            <div className="flex items-center gap-2">
              {(() => {
                const SelectedIcon = getCollectionIcon(icon);
                return <SelectedIcon className="w-4 h-4" style={{ color: color || 'var(--primary)' }} />;
              })()}
              <span className="text-xs text-[var(--text-primary)] font-medium truncate">{name || 'New Collection'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-1">
          <button 
            type="button"
            onClick={onCancel} 
            className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => { if (name.trim()) onSubmit(name.trim(), color, icon); }} 
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs bg-[var(--primary)] hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
