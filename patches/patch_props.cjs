const fs = require('fs');
let content = fs.readFileSync('src/components/AutocompleteInput.tsx', 'utf8');
content = content.replace(
  /interface AutocompleteTextareaProps extends Omit<React\.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' \| 'onChange'> \{/,
  "interface AutocompleteTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {\n  dictionary?: { key: string; detail?: string; type?: string; id?: string }[];"
);
fs.writeFileSync('src/components/AutocompleteInput.tsx', content);
