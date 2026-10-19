const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

// Insert gqlDictionary useMemo
const useMemoString = `
  const gqlDictionary = React.useMemo(() => {
    if (!introspectionSchema || !introspectionSchema.types) return [];
    const dict = new Map<string, any>();
    
    // Keywords
    ['query', 'mutation', 'subscription', 'fragment', 'on'].forEach(k => {
      dict.set(k, { key: k, type: 'keyword' });
    });

    introspectionSchema.types.forEach((t: any) => {
      if (t.name && !t.name.startsWith('__')) {
        if (!dict.has(t.name)) dict.set(t.name, { key: t.name, type: 'type', detail: t.kind });
        if (t.fields) {
          t.fields.forEach((f: any) => {
            if (!dict.has(f.name)) dict.set(f.name, { key: f.name, type: 'field', detail: f.type?.name || f.type?.kind });
          });
        }
      }
    });

    return Array.from(dict.values());
  }, [introspectionSchema]);
`;

// we can insert it just before "const hasInvalidHeaders = ..." inside RequestPanel component body
// let's just find a good place inside RequestPanel component.
// I'll insert it right after "const [saveStatus, setSaveStatus] = useState<...>" or similar.
const injectionRegex = /const \[saveStatus, setSaveStatus\] = useState<'Saved' \| 'Saving\.\.\.' \| 'Changed' \| ''>\(''\);\n/;
content = content.replace(injectionRegex, match => match + useMemoString + '\n');

// Update AutocompleteTextarea usage
content = content.replace(
  /<AutocompleteTextarea\s*value=\{bodyContent\}\s*onValueChange=\{setBodyContent\}\s*placeholder="query \{ \.\.\. \}"\s*className="w-full h-full bg-transparent p-4 font-mono text-xs text-\[var\(--text-primary\)\] outline-none resize-none"\s*\/>/m,
  `<AutocompleteTextarea\n                        value={bodyContent}\n                        onValueChange={setBodyContent}\n                        placeholder="query { ... }"\n                        dictionary={gqlDictionary}\n                        className="w-full h-full bg-transparent p-4 font-mono text-xs text-[var(--text-primary)] outline-none resize-none"\n                      />`
);

fs.writeFileSync('src/components/RequestPanel.tsx', content);
console.log('done');
