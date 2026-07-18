import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';

export class WorkspaceController {
  private workspaceService = new WorkspaceService();

  getWorkspaces = async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const workspaces = await this.workspaceService.getWorkspaces(userId ? String(userId) : undefined);
      res.json(workspaces);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workspaces', details: error.message });
    }
  };

  createWorkspace = async (req: Request, res: Response) => {
    try {
      const { id, name, ownerId } = req.body;
      if (!name || !ownerId) {
        return res.status(400).json({ error: 'Name and ownerId are required' });
      }
      const newWorkspace = await this.workspaceService.createWorkspace(id, name, ownerId);
      res.status(201).json(newWorkspace);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create workspace', details: error.message });
    }
  };

  updateWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const updated = await this.workspaceService.updateWorkspace(id, name);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update workspace', details: error.message });
    }
  };

  deleteWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.workspaceService.deleteWorkspace(id);
      res.json({ success: true, message: 'Workspace deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete workspace', details: error.message });
    }
  };
}
