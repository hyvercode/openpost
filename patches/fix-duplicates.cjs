const fs = require('fs');

let col = fs.readFileSync('server/src/controllers/collection.controller.ts', 'utf8');
col = col.replace(/const \{ id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility, shareVisibility, mockVisibility, docVisibility, shareVisibility, mockVisibility, docVisibility \} = req\.body;/g, 
"const { id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility } = req.body;");

col = col.replace(/const \{ name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility, shareVisibility, mockVisibility, docVisibility \} = req\.body;/g,
"const { name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility } = req.body;");

fs.writeFileSync('server/src/controllers/collection.controller.ts', col);


let dep = fs.readFileSync('server/src/controllers/deployment.controller.ts', 'utf8');
dep = dep.replace(/const \{ mockConfig, requests, collectionName, mockVisibility, mockVisibility \} = req\.body;/g,
"const { mockConfig, requests, collectionName, mockVisibility } = req.body;");

fs.writeFileSync('server/src/controllers/deployment.controller.ts', dep);
