const fs = require('fs');
let code = fs.readFileSync('server/src/repositories/deployment.repository.ts', 'utf8');

code = code.replace(/\.\.\.\(data\.collectionName !== undefined && \{ collectionName: data\.collectionName \}\)&& \{ collectionName: data\.collectionName \}\) \{ collectionName: data\.collectionName \}\),/g, 
"...(data.collectionName !== undefined && { collectionName: data.collectionName }),");

fs.writeFileSync('server/src/repositories/deployment.repository.ts', code);
