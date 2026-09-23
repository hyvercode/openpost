const fs = require('fs');
let code = fs.readFileSync('server/src/repositories/deployment.repository.ts', 'utf8');

code = code.replace(/mockConfig: data\.mockConfig \? JSON\.stringify\(data\.mockConfig\) : "\{\}"/,
`mockConfig: data.mockConfig ? JSON.stringify(data.mockConfig) : "{}",\n        mockVisibility: data.mockVisibility || "private"`);

fs.writeFileSync('server/src/repositories/deployment.repository.ts', code);
