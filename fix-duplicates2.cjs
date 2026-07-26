const fs = require('fs');
let col = fs.readFileSync('server/src/controllers/collection.controller.ts', 'utf8');
col = col.replace(/id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility, shareVisibility, mockVisibility, docVisibility/g,
"id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility");
fs.writeFileSync('server/src/controllers/collection.controller.ts', col);
