import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { Request, Response } from 'express';
import { CollectionService } from '../services/collection.service';

export class CollectionController {
  private collectionService = new CollectionService();

  getSharedCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const collection: any = await this.collectionService.getCollectionById(id);
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      
      const purpose = req.query.purpose || 'import';
      const isPrivate = purpose === 'doc' ? collection.docVisibility === 'private' : collection.shareVisibility === 'private';
      
      if (isPrivate) {
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
          
          if (!membership && (await prisma.workspace.findUnique({ where: { id: collection.workspaceId } }))?.ownerId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this private collection' });
          }
        } catch (err) {
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
      }
      
      res.json(collection);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch shared collection', details: error.message });
    }
  };

  getCollectionsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const collections = await this.collectionService.getCollectionsByWorkspace(workspaceId);
      res.json(collections);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch collections', details: error.message });
    }
  };

  createCollection = async (req: Request, res: Response) => {
    try {
      const { id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility } = req.body;
      if (!workspaceId || !name) {
        return res.status(400).json({ error: 'WorkspaceId and name are required' });
      }
      const newCollection = await this.collectionService.createCollection({
        id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility
      });
      res.status(201).json(newCollection);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create collection', details: error.message });
    }
  };

  updateCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility } = req.body;
      const updatedCollection = await this.collectionService.updateCollection(id, {
        name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility
      });
      res.json(updatedCollection);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update collection', details: error.message });
    }
  };

  deleteCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.collectionService.deleteCollection(id);
      res.json({ success: true, message: 'Collection deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete collection', details: error.message });
    }
  };
}
