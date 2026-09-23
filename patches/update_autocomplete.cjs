const fs = require('fs');
const content = fs.readFileSync('src/components/AutocompleteInput.tsx', 'utf8');

const regex = /export function AutocompleteTextarea\(\{[\s\S]*?\}\s*\ninterface AutocompleteTextareaProps/m;

const replacement = `
export function AutocompleteTextarea({
  value,
  onChange,
  onValueChange,
  className,
  dictionary = [],
  ...props
}: AutocompleteTextareaProps) {
  const { environments } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [startIndex, setStartIndex] = useState(-1);
  const [mode, setMode] = useState<'env' | 'dict'>('env');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variables = React.useMemo(() => {
    const vars: Record<string, any> = {};
    environments.forEach(env => {
      env.variables.forEach(v => {
        if (v.key && !vars[v.key]) {
          vars[v.key] = v;
        }
      });
    });
    return Object.values(vars);
  }, [environments]);

  const filteredVars = mode === 'env'
    ? variables.filter(v => v.key && v.key.toLowerCase().includes(query.toLowerCase()))
    : dictionary.filter(d => d.key && d.key.toLowerCase().includes(query.toLowerCase()));

  const updateDropdownPosition = () => {
    if (textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 300)
      });
    }
  };

  const checkAndShowDropdown = (text: string, pos: number) => {
    const textBeforeCursor = text.slice(0, pos);
    
    // Check for environment variables {{...}}
    const openIdx = textBeforeCursor.lastIndexOf('{{');
    if (openIdx !== -1) {
      const closeIdx = textBeforeCursor.indexOf('}}', openIdx);
      if (closeIdx === -1 || closeIdx >= pos) {
        const q = textBeforeCursor.slice(openIdx + 2);
        if (!q.includes('\\n') && !q.includes('\\r')) {
          setMode('env');
          setQuery(q);
          setStartIndex(openIdx);
          setShowDropdown(true);
          updateDropdownPosition();
          return;
        }
      }
    }
    
    // Check for generic dictionary words if provided
    if (dictionary && dictionary.length > 0) {
      const match = textBeforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
      if (match) {
        const q = match[0];
        if (q.length > 0) {
          setMode('dict');
          setQuery(q);
          setStartIndex(pos - q.length);
          setShowDropdown(true);
          updateDropdownPosition();
          return;
        }
      }
    }

    setShowDropdown(false);
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
    const insertText = mode === 'env' ? \`{{\${varName}}}\` : varName;
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

  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
    }
  }, [showDropdown, query]);

  const highlightedCode = React.useMemo(() => {
    let escaped = String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    escaped = escaped.replace(/{{([^{}]+)}}/g, (match) => {
      const varName = match.slice(2, -2);
      const exists = variables.some(v => v.key === varName && v.enabled !== false);
      return \`<span class="\${cn(
        "rounded cursor-help",
        exists ? "text-orange-400 bg-orange-400/10" : "text-gray-400 bg-gray-400/10 outline outline-1 outline-dashed outline-gray-500/30"
      )}" title="\${exists ? 'Environment Variable' : 'Undefined Variable'}">\${match}</span>\`;
    });

    if (dictionary && dictionary.length > 0) {
      const allWords = dictionary.map(d => d.key).join('|');
      if (allWords) {
        const regex = new RegExp(\`\\\\b(\${allWords})\\\\b\`, 'g');
        escaped = escaped.replace(regex, (match) => {
          const dictItem = dictionary.find(d => d.key === match);
          if (dictItem && dictItem.type === 'keyword') {
            return \`<span class="text-pink-400 font-bold">\${match}</span>\`;
          } else if (dictItem && dictItem.type === 'type') {
            return \`<span class="text-yellow-400">\${match}</span>\`;
          } else if (dictItem && dictItem.type === 'field') {
            return \`<span class="text-blue-400">\${match}</span>\`;
          }
          return match;
        });
      }
    }

    return escaped + (escaped.endsWith('\\n') ? ' ' : '');
  }, [value, variables, dictionary]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (bgRef.current) {
      bgRef.current.scrollTop = e.currentTarget.scrollTop;
      bgRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="relative w-full flex-1 flex flex-col min-h-0 overflow-hidden">
      <div 
        ref={bgRef}
        className={cn(
          className,
          "absolute inset-0 pointer-events-none break-words whitespace-pre-wrap overflow-hidden border-transparent focus:border-transparent bg-transparent"
        )}
        style={{ color: 'var(--text-primary)' }}
        dangerouslySetInnerHTML={{ __html: highlightedCode || (props.placeholder ? \`<span class="text-[var(--text-secondary)]">\${props.placeholder}</span>\` : '') }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={handleKeyUpAndClick}
        onKeyUp={handleKeyUpAndClick}
        onScroll={handleScroll}
        className={cn(
          className,
          "relative z-10 text-transparent caret-[var(--text-primary)] bg-transparent"
        )}
        {...props}
      />
      
      {showDropdown && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] mt-1 overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl ring-1 ring-black ring-opacity-5"
          style={{ 
            top: \`\${dropdownPos.top}px\`, 
            left: \`\${dropdownPos.left}px\`, 
            width: \`\${dropdownPos.width}px\` 
          }}
        >
          {mode === 'env' && environments.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              No environments available
            </div>
          ) : filteredVars.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic">
              {query ? \`No matches for "\${query}"\` : 'No suggestions'}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredVars.map((v, idx) => (
                <div
                  key={v.id || v.key}
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
                    {mode === 'env' ? (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)]/30" />
                    ) : null}
                    <span className="font-mono truncate">{v.key}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate max-w-[180px] opacity-60">
                    {mode === 'env' ? (v.isSecret || v.type === 'secret' ? '••••••••' : v.value) : (v.type || v.detail)}
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

interface AutocompleteTextareaProps
`;

const newContent = content.replace(regex, replacement.trim() + '\ninterface AutocompleteTextareaProps');
fs.writeFileSync('src/components/AutocompleteInput.tsx', newContent);
console.log(content.length, newContent.length);
