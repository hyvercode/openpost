import { Request, Response } from 'express';
import { DeploymentService } from '../services/deployment.service';
import { assertWorkspaceAccess, assertRecordAccess } from '../middleware/ownership';

export class DeploymentController {
  private deploymentService = new DeploymentService();

  getDeploymentsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const deployments = await this.deploymentService.getDeploymentsByWorkspace(workspaceId);
      res.json(deployments);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch deployments' });
    }
  };

  createDeployment = async (req: Request, res: Response) => {
    try {
      const { id, workspaceId, collectionId, collectionName, version, requests, mockConfig } = req.body;
      if (!workspaceId || !collectionId || !collectionName) {
        return res.status(400).json({ error: 'WorkspaceId, collectionId, and collectionName are required' });
      }
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const newDeployment = await this.deploymentService.createDeployment({
        id, workspaceId, collectionId, collectionName, version, requests, mockConfig
      });
      res.status(201).json(newDeployment);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create deployment' });
    }
  };

  updateDeployment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.deploymentService.getDeploymentById(id)))) return;
      const { mockConfig, requests, collectionName, mockVisibility } = req.body;
      const updated = await this.deploymentService.updateDeployment(id, {
        mockConfig, requests, collectionName, mockVisibility
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update deployment' });
    }
  };

  deleteDeployment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.deploymentService.getDeploymentById(id)))) return;
      await this.deploymentService.deleteDeployment(id);
      res.json({ success: true, message: 'Deployment deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete deployment' });
    }
  };
}
