const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch mock collection
code = code.replace(/const collection = await prisma\.collection\.findUnique\(\{\n\s*where: \{ id: collectionId \}\n\s*\}\);/,
`const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    });
    
    if (collection && collection.mockVisibility === 'private') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Private mock server requires authentication' });
      }
      try {
        const decoded = (await import('jsonwebtoken')).default.verify(authHeader.split('Bearer ')[1], process.env.JWT_SECRET || 'fallback-secret-key-for-dev');
        const userId = decoded.uid || decoded.userId;
        const membership = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: collection.workspaceId, userId } }
        });
        const workspace = await prisma.workspace.findUnique({ where: { id: collection.workspaceId }});
        if (!membership && workspace?.ownerId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }`);

// Patch mock deployment
code = code.replace(/const deployment = await prisma\.deployment\.findUnique\(\{\n\s*where: \{ id: deployId \}\n\s*\}\);/,
`const deployment = await prisma.deployment.findUnique({
      where: { id: deployId }
    });
    
    if (deployment && deployment.mockVisibility === 'private') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Private mock server requires authentication' });
      }
      try {
        const decoded = (await import('jsonwebtoken')).default.verify(authHeader.split('Bearer ')[1], process.env.JWT_SECRET || 'fallback-secret-key-for-dev');
        const userId = decoded.uid || decoded.userId;
        const membership = await prisma.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: deployment.workspaceId, userId } }
        });
        const workspace = await prisma.workspace.findUnique({ where: { id: deployment.workspaceId }});
        if (!membership && workspace?.ownerId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }`);

fs.writeFileSync('server.ts', code);
