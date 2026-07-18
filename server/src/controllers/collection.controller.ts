import { Request, Response } from 'express';
import { CollectionService } from '../services/collection.service';

export class CollectionController {
  private collectionService = new CollectionService();

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
      const { id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests } = req.body;
      if (!workspaceId || !name) {
        return res.status(400).json({ error: 'WorkspaceId and name are required' });
      }
      const newCollection = await this.collectionService.createCollection({
        id, workspaceId, name, description, color, icon, position, mockConfig, folders, requests
      });
      res.status(201).json(newCollection);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create collection', details: error.message });
    }
  };

  updateCollection = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, color, icon, position, mockConfig, folders, requests } = req.body;
      const updatedCollection = await this.collectionService.updateCollection(id, {
        name, description, color, icon, position, mockConfig, folders, requests
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
