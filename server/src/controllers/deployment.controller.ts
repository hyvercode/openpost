import { Request, Response } from 'express';
import { DeploymentService } from '../services/deployment.service';
import { assertWorkspaceAccess, assertRecordAccess } from '../middleware/ownership';
import { sendError } from '../utils/errors';

export class DeploymentController {
  private deploymentService = new DeploymentService();

  getDeploymentsByWorkspace = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const deployments = await this.deploymentService.getDeploymentsByWorkspace(workspaceId);
      res.json(deployments);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch deployments', error);
    }
  };

  createDeployment = async (req: Request, res: Response) => {
    try {
      const { id, workspaceId, collectionId, collectionName, version, requests, mockConfig } = req.body;
      if (!workspaceId || !collectionId || !collectionName) {
        return sendError(res, 400, 'WorkspaceId, collectionId, and collectionName are required');
      }
      if (!(await assertWorkspaceAccess(req, res, workspaceId))) return;
      const newDeployment = await this.deploymentService.createDeployment({
        id, workspaceId, collectionId, collectionName, version, requests, mockConfig
      });
      res.status(201).json(newDeployment);
    } catch (error: any) {
      sendError(res, 500, 'Failed to create deployment', error);
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
      sendError(res, 500, 'Failed to update deployment', error);
    }
  };

  deleteDeployment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!(await assertRecordAccess(req, res, () => this.deploymentService.getDeploymentById(id)))) return;
      await this.deploymentService.deleteDeployment(id);
      res.json({ success: true, message: 'Deployment deleted' });
    } catch (error: any) {
      sendError(res, 500, 'Failed to delete deployment', error);
    }
  };
}
