import { EnvironmentRepository, EnvironmentData } from '../repositories/environment.repository';
import { v4 as uuidv4 } from 'uuid';

export class EnvironmentService {
  private environmentRepository = new EnvironmentRepository();

  async getEnvironmentsByWorkspace(workspaceId: string) {
    return this.environmentRepository.findByWorkspaceId(workspaceId);
  }

  async createEnvironment(data: Partial<EnvironmentData>) {
    if (!data.workspaceId || !data.name) {
      throw new Error('WorkspaceId and name are required');
    }

    const fullData: EnvironmentData = {
      id: data.id || uuidv4(),
      workspaceId: data.workspaceId,
      name: data.name,
      variables: data.variables,
      position: data.position
    };

    return this.environmentRepository.create(fullData);
  }

  async updateEnvironment(id: string, data: Partial<EnvironmentData>) {
    return this.environmentRepository.update(id, data);
  }

  async deleteEnvironment(id: string) {
    return this.environmentRepository.delete(id);
  }
}
