import { WorkspaceRepository } from '../repositories/workspace.repository';
import { UserRepository } from '../repositories/user.repository';
import { v4 as uuidv4 } from 'uuid';

export class WorkspaceService {
  private workspaceRepository = new WorkspaceRepository();
  private userRepository = new UserRepository();

  async getWorkspaces(userId?: string) {
    return this.workspaceRepository.findMany(userId);
  }

  async createWorkspace(id: string | undefined, name: string, ownerId: string) {
    if (!name || !ownerId) {
      throw new Error('Name and ownerId are required');
    }

    const workspaceId = id || uuidv4();

    // Ensure User exists before creating WorkspaceMember link
    const userExists = await this.userRepository.findByUid(ownerId);
    if (!userExists) {
      await this.userRepository.create(
        ownerId,
        ownerId.includes('@') ? ownerId : 'user@example.com',
        'User'
      );
    }

    const newWorkspace = await this.workspaceRepository.create(workspaceId, name, ownerId);

    // Add owner as a member
    await this.workspaceRepository.createMember(newWorkspace.id, ownerId);

    return newWorkspace;
  }

  async updateWorkspace(id: string, name: string) {
    return this.workspaceRepository.update(id, name);
  }

  async deleteWorkspace(id: string) {
    return this.workspaceRepository.delete(id);
  }
}
