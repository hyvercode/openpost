import { Request, Response } from 'express';
import { VersionService } from '../services/version.service';

export class VersionController {
  private versionService = new VersionService();

  getVersionsByCollection = async (req: Request, res: Response) => {
    try {
      const { collectionId } = req.params;
      const versions = await this.versionService.getVersionsByCollection(collectionId);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch collection versions', details: error.message });
    }
  };

  getVersionsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const versions = await this.versionService.getVersionsByWorkspace(workspaceId);
      res.json(versions);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workspace versions', details: error.message });
    }
  };

  getVersionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const version = await this.versionService.getVersionById(id);
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }
      res.json(version);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch version', details: error.message });
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

      const newVersion = await this.versionService.createVersion({
        id, workspaceId, collectionId, collectionName,
        version, name, description, author,
        folders, requests, mockConfig, tags, diffSummary
      });

      res.status(201).json(newVersion);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create collection version', details: error.message });
    }
  };

  updateVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, version, author, tags, diffSummary } = req.body;
      const updated = await this.versionService.updateVersion(id, {
        name, description, version, author, tags, diffSummary
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update version', details: error.message });
    }
  };

  rollback = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.versionService.rollbackCollectionToVersion(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to rollback collection', details: error.message });
    }
  };

  fork = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const forked = await this.versionService.forkVersionAsCollection(id, name);
      res.status(201).json(forked);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fork version as collection', details: error.message });
    }
  };

  deleteVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.versionService.deleteVersion(id);
      res.json({ success: true, message: 'Version deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete version', details: error.message });
    }
  };
}
