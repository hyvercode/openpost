import { Request, Response } from 'express';
import { VersionService } from '../services/version.service';
import { CollectionService } from '../services/collection.service';
import { assertWorkspaceAccess, assertRecordAccess } from '../middleware/ownership';

export class VersionController {
  private versionService = new VersionService();
  private collectionService = new CollectionService();

  getVersionsByCollection = async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      // Versions inherit the parent collection's workspace for authorization.
      const collection: any = await this.collectionService.getCollectionById(collectionId);
      if (!collection?.workspaceId) {
        return res.status(404).json({ error: 'Not found' });
      }
      if (!(await assertWorkspaceAccess(req, res, collection.workspaceId))) return;
      const versions = await this.versionService.getVersionsByCollection(collectionId);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch collection versions' });
    }
  };

  getVersionsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const versions = await this.versionService.getVersionsByWorkspace(workspaceId);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workspace versions' });
    }
  };

  getVersionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.versionService.getVersionById(id)))) return;
      const version = await this.versionService.getVersionById(id);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      res.json(version);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch version' });
    }
  };

  createVersion = async (req: Request, res: Response) => {
    try {
      const {
        id, workspaceId, collectionId, collectionName,
        version, name, description, author,
        folders, requests, mockConfig, tags, diffSummary
      } = req.body;

      if (!workspaceId || !collectionId || !version) {
        return res.status(400).json({ error: 'workspaceId, collectionId, and version are required' });
      }
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;

      const newVersion = await this.versionService.createVersion({
        id, workspaceId, collectionId, collectionName,
        version, name, description, author,
        folders, requests, mockConfig, tags, diffSummary
      });

      res.status(201).json(newVersion);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create collection version' });
    }
  };

  updateVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.versionService.getVersionById(id)))) return;
      const { name, description, version, author, tags, diffSummary } = req.body;
      const updated = await this.versionService.updateVersion(id, {
        name, description, version, author, tags, diffSummary
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update version' });
    }
  };

  rollback = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.versionService.getVersionById(id)))) return;
      const result = await this.versionService.rollbackCollectionToVersion(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to rollback collection' });
    }
  };

  fork = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.versionService.getVersionById(id)))) return;
      const { name } = req.body;
      const forked = await this.versionService.forkVersionAsCollection(id, name);
      res.status(201).json(forked);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fork version as collection' });
    }
  };

  deleteVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.versionService.getVersionById(id)))) return;
      await this.versionService.deleteVersion(id);
      res.json({ success: true, message: 'Version deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete version' });
    }
  };
}
