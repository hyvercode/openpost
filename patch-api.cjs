const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(/async getSharedCollection\(id: string\): Promise<ApiCollection> \{\n    const res = await api\.get\(\`\/collections\/shared\/\$\{id\}\`\);\n    return res\.data;\n  \},/,
`async getSharedCollection(id: string, purpose: 'import' | 'doc' = 'import'): Promise<ApiCollection> {
    const res = await api.get(\`/collections/shared/\$\{id\}?purpose=\$\{purpose\}\`);
    return res.data;
  },`);

fs.writeFileSync('src/lib/api.ts', code);
