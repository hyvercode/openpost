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

    // Add owner as a member with OWNER role
    await this.workspaceRepository.createMember(newWorkspace.id, ownerId, 'OWNER');

    return newWorkspace;
  }

  async updateWorkspace(id: string, name: string) {
    return this.workspaceRepository.update(id, name);
  }

  async deleteWorkspace(id: string) {
    return this.workspaceRepository.delete(id);
  }

  async getMembers(workspaceId: string) {
    return this.workspaceRepository.getMembers(workspaceId);
  }

  async inviteMember(workspaceId: string, email: string, role: string) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    return this.workspaceRepository.createInvitation(workspaceId, email, role, token, expiresAt);
  }

  async updateMember(workspaceId: string, userId: string, data: { role?: string; status?: string }) {
    return this.workspaceRepository.updateMember(workspaceId, userId, data);
  }

  async removeMember(workspaceId: string, userId: string) {
    return this.workspaceRepository.removeMember(workspaceId, userId);
  }

  async getInvitation(token: string) {
    const invitation = await this.workspaceRepository.findInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invitation not found');
    }
    if (invitation.expiresAt < new Date()) {
      throw new Error('Invitation expired');
    }
    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.getInvitation(token);
    
    // Check if already a member
    const existingMember = await this.workspaceRepository.findMember(invitation.workspaceId, userId);
    if (existingMember) {
      await this.workspaceRepository.deleteInvitation(invitation.id);
      return existingMember;
    }

    const member = await this.workspaceRepository.createMember(invitation.workspaceId, userId, invitation.role);
    await this.workspaceRepository.deleteInvitation(invitation.id);
    return member;
  }
}
