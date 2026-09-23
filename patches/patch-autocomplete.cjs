const fs = require('fs');
let code = fs.readFileSync('src/components/AutocompleteInput.tsx', 'utf8');

// 1. Add suggestions prop to AutocompleteInputProps
code = code.replace(
  /type\?: string;\n\}/,
  `type?: string;\n  suggestions?: string[];\n}`
);

// 2. Add suggestions prop to AutocompleteInput function signature
code = code.replace(
  /onValueChange,\n  className,\n  \.\.\.props\n\}: AutocompleteInputProps\) \{/,
  `onValueChange,\n  className,\n  suggestions,\n  ...props\n}: AutocompleteInputProps) {`
);

// 3. Add dropdownMode state and logic to checkAndShowDropdown
code = code.replace(
  /const \[dropdownPos, setDropdownPos\] = useState\(\{ top: 0, left: 0, width: 0 \}\);/,
  `const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });\n  const [dropdownMode, setDropdownMode] = useState<'env' | 'suggestions'>('env');`
);

// Replace filteredVars and checkAndShowDropdown
code = code.replace(
  /const filteredVars = variables\.filter\(v => \n    v\.key && v\.key\.toLowerCase\(\)\.includes\(query\.toLowerCase\(\)\)\n  \);/,
  `const filteredVars = variables.filter(v => \n    v.key && v.key.toLowerCase().includes(query.toLowerCase())\n  );\n  const filteredSuggestions = (suggestions || []).filter(s => s.toLowerCase().includes(query.toLowerCase()));`
);

const checkAndShowDropdownLogic = `
  const checkAndShowDropdown = (text: string, pos: number) => {
    const textBeforeCursor = text.slice(0, pos);
    const openIdx = textBeforeCursor.lastIndexOf('{{');
    
    if (openIdx !== -1) {
      const closeIdx = textBeforeCursor.indexOf('}}', openIdx);
      if (closeIdx === -1 || closeIdx >= pos) {
        const q = textBeforeCursor.slice(openIdx + 2);
        if (!q.includes('\\n') && !q.includes('\\r')) {
          setQuery(q);
          setStartIndex(openIdx);
          setDropdownMode('env');
          setShowDropdown(true);
          updateDropdownPosition();
          return;
        }
      }
    }
    
    if (suggestions && suggestions.length > 0) {
      // For suggestions, we'll autocomplete the entire input value.
      setQuery(text);
      setStartIndex(0);
      setDropdownMode('suggestions');
      const filtered = suggestions.filter(s => s.toLowerCase().includes(text.toLowerCase()) && s !== text);
      if (filtered.length > 0) {
        setShowDropdown(true);
        updateDropdownPosition();
        return;
      }
    }

    setShowDropdown(false);
  };
`;
code = code.replace(/const checkAndShowDropdown = \(text: string, pos: number\) => \{[\s\S]*?updateDropdownPosition\(\);\n  \};/, checkAndShowDropdownLogic);


// Replace selectVariable
const selectVariableLogic = `
  const selectVariable = (varName: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    
    let newValue = '';
    let newCursorPos = 0;
    
    if (dropdownMode === 'env') {
      const val = input.value;
      const pos = input.selectionStart || 0;
      const before = val.slice(0, startIndex);
      const after = val.slice(pos);
      const insertText = \`{{\${varName}}}\`;
      newValue = before + insertText + after;
      newCursorPos = startIndex + insertText.length;
    } else {
      newValue = varName;
      newCursorPos = varName.length;
    }

    if (onValueChange) {
      onValueChange(newValue);
    } else {
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
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };
`;
code = code.replace(/const selectVariable = \(varName: string\) => \{[\s\S]*?\}, 10\);\n  \};/, selectVariableLogic);

// Replace keydown activeIndex logic
code = code.replace(/if \(filteredVars\.length > 0\) \{/g, `if (dropdownMode === 'env' ? filteredVars.length > 0 : filteredSuggestions.length > 0) {`);
code = code.replace(/setActiveIndex\(prev => \(prev \+ 1\) % filteredVars\.length\);/g, `setActiveIndex(prev => (prev + 1) % (dropdownMode === 'env' ? filteredVars.length : filteredSuggestions.length));`);
code = code.replace(/setActiveIndex\(prev => \(prev - 1 \+ filteredVars\.length\) % filteredVars\.length\);/g, `setActiveIndex(prev => (prev - 1 + (dropdownMode === 'env' ? filteredVars.length : filteredSuggestions.length)) % (dropdownMode === 'env' ? filteredVars.length : filteredSuggestions.length));`);
code = code.replace(/selectVariable\(filteredVars\[activeIndex\]\.key\);/g, `selectVariable(dropdownMode === 'env' ? filteredVars[activeIndex].key : filteredSuggestions[activeIndex]);`);


// Replace dropdown render
const renderDropdown = `
          {dropdownMode === 'env' ? (
            environments.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                No environments available
              </div>
            ) : filteredVars.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic">
                {query ? \`No variables matching "\${query}"\` : 'No variables in environments'}
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
                      {v.isSecret || v.type === 'secret' ? '••••••••' : v.value}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredSuggestions.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-[var(--text-secondary)] italic">
                No suggestions
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredSuggestions.map((s, idx) => (
                  <div
                    key={s}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs transition-colors",
                      idx === activeIndex 
                        ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold" 
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectVariable(s);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono truncate">{s}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
`;

code = code.replace(/\{environments\.length === 0 \? \([\s\S]*?<\/div>\n          \)}/, renderDropdown);

fs.writeFileSync('src/components/AutocompleteInput.tsx', code);
