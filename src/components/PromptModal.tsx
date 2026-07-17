import { useState, useEffect, useRef } from 'react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ isOpen, title, placeholder, initialValue, submitText = 'Create', onSubmit, onCancel }: PromptModalProps) {
  const [value, setValue] = useState(initialValue || '');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-lg p-5 w-80 shadow-2xl">
        <h3 className="text-white text-sm font-semibold mb-4">{title}</h3>
        <input 
          ref={inputRef} 
          value={value} 
          onChange={e => setValue(e.target.value)} 
          onKeyDown={e => { 
            if (e.key === 'Enter' && value.trim()) onSubmit(value.trim()); 
            if (e.key === 'Escape') onCancel(); 
          }} 
          placeholder={placeholder || 'Enter name...'}
          className="w-full bg-[#252525] border border-[#333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#555] transition-colors mb-5" 
        />
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { if (value.trim()) onSubmit(value.trim()); }} 
            disabled={!value.trim()}
            className="px-4 py-1.5 text-xs bg-[#FF6C37] hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
