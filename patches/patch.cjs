const fs = require('fs');
let code = fs.readFileSync('server/src/controllers/collection.controller.ts', 'utf8');
code = code.replace(/getSharedCollection = async \(req: Request, res: Response\) => \{[\s\S]*?res\.json\(collection\);\n    \} catch \(error: any\) \{/m, 
`getSharedCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const collection: any = await this.collectionService.getCollectionById(id);
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      
      if (collection.shareVisibility === 'private') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized: Private collection requires authentication' });
        }
        const token = authHeader.split('Bearer ')[1];
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-for-dev');
          const userId = decoded.uid || decoded.userId;
          const membership = await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId: collection.workspaceId,
                userId: userId
              }
            }
          });
          
          if (!membership && collection.workspace.ownerId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this private collection' });
          }
        } catch (err) {
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
      }
      
      res.json(collection);
    } catch (error: any) {`);
fs.writeFileSync('server/src/controllers/collection.controller.ts', code);
