const fs = require('fs');
const content = fs.readFileSync('src/components/AutocompleteInput.tsx', 'utf8');
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
`;
// find export function AutocompleteTextarea({ ... and checkAndShowDropdown
const pattern = /export function AutocompleteTextarea\(\{[\s\S]*?checkAndShowDropdown = \([^)]*\) => \{[\s\S]*?setShowDropdown\(false\);\n      return;\n    }\n    setQuery\(q\);\n    setStartIndex\(openIdx\);\n    setShowDropdown\(true\);\n    updateDropdownPosition\(\);\n  };/m;
const newContent = content.replace(pattern, replacement.trim());
fs.writeFileSync('src/components/AutocompleteInput.tsx', newContent);
console.log('done');
