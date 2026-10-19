const fs = require('fs');
let content = fs.readFileSync('src/components/AutocompleteInput.tsx', 'utf8');
content = content.replace(
  /  dictionary\?: \{ key: string; detail\?: string; type\?: string; id\?: string \}\[\]\n/,
  "  dictionary?: { key: string; detail?: string; type?: string; id?: string }[];\n"
);
fs.writeFileSync('src/components/AutocompleteInput.tsx', content);
