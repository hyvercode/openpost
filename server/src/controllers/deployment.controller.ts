import { Request, Response } from 'express';
import { DeploymentService } from '../services/deployment.service';

export class DeploymentController {
  private deploymentService = new DeploymentService();

  getDeploymentsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const deployments = await this.deploymentService.getDeploymentsByWorkspace(workspaceId);
      res.json(deployments);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch deployments', details: error.message });
    }
  };

  createDeployment = async (req: Request, res: Response) => {
    try {
      const { id, workspaceId, collectionId, collectionName, version, requests, mockConfig } = req.body;
      if (!workspaceId || !collectionId || !collectionName) {
        return res.status(400).json({ error: 'WorkspaceId, collectionId, and collectionName are required' });
      }
      const newDeployment = await this.deploymentService.createDeployment({
        id, workspaceId, collectionId, collectionName, version, requests, mockConfig
      });
      res.status(201).json(newDeployment);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create deployment', details: error.message });
    }
  };

  updateDeployment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { mockConfig, requests, collectionName } = req.body;
      const updated = await this.deploymentService.updateDeployment(id, {
        mockConfig, requests, collectionName
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update deployment', details: error.message });
    }
  };

  deleteDeployment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.deploymentService.deleteDeployment(id);
      res.json({ success: true, message: 'Deployment deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete deployment', details: error.message });
    }
  };
}
