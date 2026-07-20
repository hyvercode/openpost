import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { cn } from '../utils';
import { AlertCircle } from 'lucide-react';

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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variables = currentEnvironment?.variables || [];
  const filteredVars = variables.filter(v => 
    v.key && v.key.toLowerCase().includes(query.toLowerCase())
  );

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 250)
      });
    }
  };

  const checkAndShowDropdown = (text: string, pos: number) => {
    const textBeforeCursor = text.slice(0, pos);
    const openIdx = textBeforeCursor.lastIndexOf('{{');
    
    if (openIdx === -1) {
      setShowDropdown(false);
      return;
    }

    // Check if there's a close tag before the cursor after the last open tag
    const closeIdx = textBeforeCursor.indexOf('}}', openIdx);
    if (closeIdx !== -1 && closeIdx < pos) {
      setShowDropdown(false);
      return;
    }

    const q = textBeforeCursor.slice(openIdx + 2);
    // Don't show if there's a newline
    if (q.includes('\n') || q.includes('\r')) {
      setShowDropdown(false);
      return;
    }

    setQuery(q);
    setStartIndex(openIdx);
    setShowDropdown(true);
    updateDropdownPosition();
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
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredVars.length > 0) {
        setActiveIndex(prev => (prev + 1) % filteredVars.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredVars.length > 0) {
        setActiveIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredVars.length > 0) {
        e.preventDefault();
        selectVariable(filteredVars[activeIndex].key);
      }
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
      if (showDropdown && 
          inputRef.current && !inputRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    const handleScroll = () => {
      if (showDropdown) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
    }
  }, [showDropdown, query]);

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
      
      {showDropdown && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] mt-1 overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl ring-1 ring-black ring-opacity-5"
          style={{ 
            top: `${dropdownPos.top}px`, 
            left: `${dropdownPos.left}px`, 
            width: `${dropdownPos.width}px` 
          }}
        >
          {!currentEnvironment ? (
            <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              No environment selected
            </div>
          ) : filteredVars.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic">
              {query ? `No variables matching "${query}"` : 'No variables in environment'}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredVars.map((v, idx) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors",
                    idx === activeIndex 
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold" 
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectVariable(v.key);
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]/30" />
                    <span className="font-mono truncate">{v.key}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[150px] opacity-60">
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variables = currentEnvironment?.variables || [];
  const filteredVars = variables.filter(v => 
    v.key && v.key.toLowerCase().includes(query.toLowerCase())
  );

  const updateDropdownPosition = () => {
    if (textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      // For textarea, we might want to position it relative to the cursor, but that's hard.
      // So we'll just position it at the bottom of the textarea.
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 300)
      });
    }
  };

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
    updateDropdownPosition();
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
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredVars.length > 0) {
        setActiveIndex(prev => (prev + 1) % filteredVars.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredVars.length > 0) {
        setActiveIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredVars.length > 0) {
        e.preventDefault();
        selectVariable(filteredVars[activeIndex].key);
      }
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
      if (showDropdown && 
          textareaRef.current && !textareaRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    const handleScroll = () => {
      if (showDropdown) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
    }
  }, [showDropdown, query]);

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
      
      {showDropdown && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] mt-1 overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl ring-1 ring-black ring-opacity-5"
          style={{ 
            top: `${dropdownPos.top}px`, 
            left: `${dropdownPos.left}px`, 
            width: `${dropdownPos.width}px` 
          }}
        >
          {!currentEnvironment ? (
            <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              No environment selected
            </div>
          ) : filteredVars.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic">
              {query ? `No variables matching "${query}"` : 'No variables in environment'}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredVars.map((v, idx) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors",
                    idx === activeIndex 
                      ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold" 
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectVariable(v.key);
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]/30" />
                    <span className="font-mono truncate">{v.key}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[180px] opacity-60">
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

interface AutocompleteTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}
