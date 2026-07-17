import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../utils';

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  onValueChange,
  className,
  ...props
}: AutocompleteInputProps) {
  const { currentEnvironment } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [startIndex, setStartIndex] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const variables = currentEnvironment?.variables || [];
  const filteredVars = variables.filter(v => 
    v.key && v.key.toLowerCase().includes(query.toLowerCase())
  );

  const checkAndShowDropdown = (text: string, pos: number) => {
    const textBeforeCursor = text.slice(0, pos);
    const openIdx = textBeforeCursor.lastIndexOf('{{');
    if (openIdx === -1) {
      setShowDropdown(false);
      return;
    }

    const closeIdx = textBeforeCursor.indexOf('}}', openIdx);
    if (closeIdx !== -1 && closeIdx < pos) {
      setShowDropdown(false);
      return;
    }

    const q = textBeforeCursor.slice(openIdx + 2);
    if (q.includes('\n') || q.includes('\r')) {
      setShowDropdown(false);
      return;
    }

    setQuery(q);
    setStartIndex(openIdx);
    setShowDropdown(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(val);

    const pos = e.target.selectionStart || 0;
    checkAndShowDropdown(val, pos);
  };

  const selectVariable = (varName: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const val = input.value;
    const pos = input.selectionStart || 0;

    const before = val.slice(0, startIndex);
    const after = val.slice(pos);
    const insertText = `{{${varName}}}`;
    const newValue = before + insertText + after;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      // Fallback: Dispatch native input event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, newValue);
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }

    setShowDropdown(false);
    setActiveIndex(0);

    // Focus and restore cursor pos after state updates
    setTimeout(() => {
      input.focus();
      const newCursorPos = startIndex + insertText.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectVariable(filteredVars[activeIndex].key);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  const handleKeyUpAndClick = (e: any) => {
    const pos = e.target.selectionStart || 0;
    checkAndShowDropdown(e.target.value || '', pos);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showDropdown && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setTimeout(() => setShowDropdown(false), 150);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  return (
    <div className="relative w-full flex items-center">
      <input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={handleKeyUpAndClick}
        onKeyUp={handleKeyUpAndClick}
        className={className}
        {...props}
      />
      {showDropdown && filteredVars.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1 shadow-lg ring-1 ring-black ring-opacity-5">
          {filteredVars.map((v, idx) => (
            <div
              key={v.id}
              className={cn(
                "flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors",
                idx === activeIndex 
                  ? "bg-[var(--bg-hover)] text-[var(--primary)] font-semibold" 
                  : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectVariable(v.key);
              }}
            >
              <span className="font-mono truncate mr-2 text-[var(--text-primary)]">{v.key}</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[120px]">
                {v.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AutocompleteTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function AutocompleteTextarea({
  value,
  onChange,
  onValueChange,
  className,
  ...props
}: AutocompleteTextareaProps) {
  const { currentEnvironment } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [startIndex, setStartIndex] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const variables = currentEnvironment?.variables || [];
  const filteredVars = variables.filter(v => 
    v.key && v.key.toLowerCase().includes(query.toLowerCase())
  );

  const checkAndShowDropdown = (text: string, pos: number) => {
    const textBeforeCursor = text.slice(0, pos);
    const openIdx = textBeforeCursor.lastIndexOf('{{');
    if (openIdx === -1) {
      setShowDropdown(false);
      return;
    }

    const closeIdx = textBeforeCursor.indexOf('}}', openIdx);
    if (closeIdx !== -1 && closeIdx < pos) {
      setShowDropdown(false);
      return;
    }

    const q = textBeforeCursor.slice(openIdx + 2);
    if (q.includes('\n') || q.includes('\r')) {
      setShowDropdown(false);
      return;
    }

    setQuery(q);
    setStartIndex(openIdx);
    setShowDropdown(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(val);

    const pos = e.target.selectionStart || 0;
    checkAndShowDropdown(val, pos);
  };

  const selectVariable = (varName: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const val = textarea.value;
    const pos = textarea.selectionStart || 0;

    const before = val.slice(0, startIndex);
    const after = val.slice(pos);
    const insertText = `{{${varName}}}`;
    const newValue = before + insertText + after;

    if (onValueChange) {
      onValueChange(newValue);
    } else {
      const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (nativeTextareaValueSetter) {
        nativeTextareaValueSetter.call(textarea, newValue);
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
      }
    }

    setShowDropdown(false);
    setActiveIndex(0);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startIndex + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectVariable(filteredVars[activeIndex].key);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  const handleKeyUpAndClick = (e: any) => {
    const pos = e.target.selectionStart || 0;
    checkAndShowDropdown(e.target.value || '', pos);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (showDropdown && textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setTimeout(() => setShowDropdown(false), 150);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  return (
    <div className="relative w-full flex-1 flex flex-col">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={handleKeyUpAndClick}
        onKeyUp={handleKeyUpAndClick}
        className={className}
        {...props}
      />
      {showDropdown && filteredVars.length > 0 && (
        <div className="absolute left-4 bottom-full z-50 mb-1 w-64 max-h-48 overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1 shadow-lg ring-1 ring-black ring-opacity-5">
          {filteredVars.map((v, idx) => (
            <div
              key={v.id}
              className={cn(
                "flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors",
                idx === activeIndex 
                  ? "bg-[var(--bg-hover)] text-[var(--primary)] font-semibold" 
                  : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectVariable(v.key);
              }}
            >
              <span className="font-mono truncate mr-2 text-[var(--text-primary)]">{v.key}</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[120px]">
                {v.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
