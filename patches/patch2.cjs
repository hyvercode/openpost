const fs = require('fs');
let code = fs.readFileSync('server/src/controllers/collection.controller.ts', 'utf8');
code = code.replace(/collection\.workspace\.ownerId !== userId/, 
`(await prisma.workspace.findUnique({ where: { id: collection.workspaceId } }))?.ownerId !== userId`);
fs.writeFileSync('server/src/controllers/collection.controller.ts', code);
