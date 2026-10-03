import { Request, Response } from 'express';
import { EnvironmentService } from '../services/environment.service';
import { assertWorkspaceAccess, assertRecordAccess } from '../middleware/ownership';

export class EnvironmentController {
  private environmentService = new EnvironmentService();

  getEnvironmentsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const environments = await this.environmentService.getEnvironmentsByWorkspace(workspaceId);
      res.json(environments);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch environments' });
    }
  };

  createEnvironment = async (req: Request, res: Response) => {
    try {
      const { id, workspaceId, name, variables, position } = req.body;
      if (!workspaceId || !name) {
        return res.status(400).json({ error: 'WorkspaceId and name are required' });
      }
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const newEnv = await this.environmentService.createEnvironment({
        id, workspaceId, name, variables, position
      });
      res.status(201).json(newEnv);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create environment' });
    }
  };

  updateEnvironment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.environmentService.getEnvironmentById(id)))) return;
      const { name, variables, position } = req.body;
      const updated = await this.environmentService.updateEnvironment(id, {
        name, variables, position
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update environment' });
    }
  };

  deleteEnvironment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.environmentService.getEnvironmentById(id)))) return;
      await this.environmentService.deleteEnvironment(id);
      res.json({ success: true, message: 'Environment deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete environment' });
    }
  };
}
