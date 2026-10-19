import { DeploymentRepository, DeploymentData } from '../repositories/deployment.repository';
import { v4 as uuidv4 } from 'uuid';

export class DeploymentService {
  private deploymentRepository = new DeploymentRepository();

  async getDeploymentsByWorkspace(workspaceId: string) {
    return this.deploymentRepository.findByWorkspaceId(workspaceId);
  }

  async getDeploymentById(id: string) {
    return this.deploymentRepository.findById(id);
  }

  async createDeployment(data: Partial<DeploymentData>) {
    if (!data.workspaceId || !data.collectionId || !data.collectionName) {
      throw new Error('WorkspaceId, collectionId, and collectionName are required');
    }

    const fullData: DeploymentData = {
      id: data.id || uuidv4(),
      workspaceId: data.workspaceId,
      collectionId: data.collectionId,
      collectionName: data.collectionName,
      version: data.version,
      requests: data.requests,
      mockConfig: data.mockConfig
    };

    return this.deploymentRepository.create(fullData);
  }

  async updateDeployment(id: string, data: Partial<DeploymentData>) {
    return this.deploymentRepository.update(id, data);
  }

  async deleteDeployment(id: string) {
    return this.deploymentRepository.delete(id);
  }
}
