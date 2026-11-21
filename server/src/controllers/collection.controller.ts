import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { JWT_SECRET } from "../config";
import { Request, Response } from 'express';
import { CollectionService } from '../services/collection.service';
import { assertWorkspaceAccess, assertRecordAccess } from '../middleware/ownership';
import { sendError } from '../utils/errors';

export class CollectionController {
  private collectionService = new CollectionService();

  getSharedCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const collection: any = await this.collectionService.getCollectionById(id);
      if (!collection) {
        return sendError(res, 404, 'Collection not found');
      }
      
      const purpose = req.query.purpose || 'import';
      const isPrivate = purpose === 'doc' ? collection.docVisibility === 'private' : collection.shareVisibility === 'private';
      
      if (isPrivate) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return sendError(res, 401, 'Unauthorized: Private collection requires authentication');
        }
        const token = authHeader.split('Bearer ')[1];
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
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
            return sendError(res, 403, 'Forbidden: You do not have access to this private collection');
          }
        } catch (err) {
          return sendError(res, 401, 'Unauthorized: Invalid token');
        }
      }
      
      res.json(collection);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch shared collection', error);
    }
  };

  getCollectionsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const collections = await this.collectionService.getCollectionsByWorkspace(workspaceId);
      res.json(collections);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch collections', error);
    }
  };

  createCollection = async (req: Request, res: Response) => {
    try {
      const { id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility } = req.body;
      if (!workspaceId || !name) {
        return sendError(res, 400, 'WorkspaceId and name are required');
      }
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const newCollection = await this.collectionService.createCollection({
        id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility
      });
      res.status(201).json(newCollection);
    } catch (error: any) {
      sendError(res, 500, 'Failed to create collection', error);
    }
  };

  updateCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.collectionService.getCollectionById(id)))) return;
      const { name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility, expectedUpdatedAt, force } = req.body;
      const updatedCollection = await this.collectionService.updateCollection(id, {
        name, description, color, icon, position, mockConfig, folders, requests, shareVisibility, mockVisibility, docVisibility,
        expectedUpdatedAt, force,
      });
      res.json(updatedCollection);
    } catch (error: any) {
      if (error?.code === 'CONFLICT') {
        return res.status(409).json({ error: error.message, conflict: error.current });
      }
      sendError(res, 500, 'Failed to update collection', error);
    }
  };

  deleteCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.collectionService.getCollectionById(id)))) return;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      await this.collectionService.deleteCollection(id, actor);
      res.json({ success: true, message: 'Collection moved to trash' });
    } catch (error: any) {
      sendError(res, 500, 'Failed to delete collection', error);
    }
  };

  restoreCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      const restored = await this.collectionService.restoreCollection(id, actor);
      res.json(restored);
    } catch (error: any) {
      sendError(res, 500, 'Failed to restore collection', error);
    }
  };

  getTrash = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const trash = await this.collectionService.getTrashByWorkspace(workspaceId);
      res.json(trash);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch trash', error);
    }
  };
}
