import { EnvironmentRepository, EnvironmentData } from '../repositories/environment.repository';
import { v4 as uuidv4 } from 'uuid';
import { audit } from './audit.service';

export class EnvironmentService {
  private environmentRepository = new EnvironmentRepository();

  async getEnvironmentsByWorkspace(workspaceId: string) {
    return this.environmentRepository.findByWorkspaceId(workspaceId);
  }

  async getEnvironmentById(id: string) {
    return this.environmentRepository.findById(id);
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

  async deleteEnvironment(id: string, actorUserId?: string) {
    const existing = await this.environmentRepository.findById(id);
    const result = await this.environmentRepository.delete(id);
    await audit('environment.delete', {
      workspaceId: existing?.workspaceId,
      userId: actorUserId,
      entityType: 'environment',
      entityId: id,
      detail: existing?.name,
    });
    return result;
  }

  async restoreEnvironment(id: string, actorUserId?: string) {
    const result = await this.environmentRepository.restore(id);
    const record = await this.environmentRepository.findById(id);
    await audit('environment.restore', {
      workspaceId: record?.workspaceId,
      userId: actorUserId,
      entityType: 'environment',
      entityId: id,
      detail: record?.name,
    });
    return result;
  }
}
