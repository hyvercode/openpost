import { WorkspaceRepository } from '../repositories/workspace.repository';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from './email.service';
import { v4 as uuidv4 } from 'uuid';

export class WorkspaceService {
  private workspaceRepository = new WorkspaceRepository();
  private userRepository = new UserRepository();
  private emailService = new EmailService();

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
    if (!email) {
      throw new Error('Email is required');
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Check if there is already a pending active invitation for this email in this workspace
    const existingInvitations = await this.workspaceRepository.getInvitationsByWorkspace(workspaceId);
    const hasPending = existingInvitations.some(i => i.email.toLowerCase().trim() === emailLower && i.expiresAt > new Date());
    if (hasPending) {
      throw new Error('An active invitation is already pending for this email');
    }

    // 2. Check if user is already a member of this workspace
    const existingMembers = await this.workspaceRepository.getMembers(workspaceId);
    const isAlreadyMember = existingMembers.some(m => m.user?.email?.toLowerCase().trim() === emailLower);
    if (isAlreadyMember) {
      throw new Error('This user is already a member of this workspace');
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.workspaceRepository.createInvitation(workspaceId, emailLower, role, token, expiresAt);
    
    // Send email
    try {
      const workspace = await this.workspaceRepository.findById(workspaceId);
      if (workspace) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const inviteLink = `${appUrl}/?invitation=${token}`;
        await this.emailService.sendInvitationEmail(emailLower, workspace.name, inviteLink);
      }
    } catch (error) {
      console.error('Failed to send invitation email but record was created:', error);
    }

    return invitation;
  }

  async updateMember(workspaceId: string, userId: string, data: { role?: string; status?: string }) {
    return this.workspaceRepository.updateMember(workspaceId, userId, data);
  }

  async removeMember(workspaceId: string, userId: string) {
    return this.workspaceRepository.removeMember(workspaceId, userId);
  }

  async getPendingInvitations(workspaceId: string) {
    return this.workspaceRepository.getInvitationsByWorkspace(workspaceId);
  }

  async resendInvitation(invitationId: string) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const invitation = await this.workspaceRepository.updateInvitationExpiry(invitationId, expiresAt, token);

    // Send email
    try {
      const workspace = await this.workspaceRepository.findById(invitation.workspaceId);
      if (workspace) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const inviteLink = `${appUrl}/?invitation=${token}`;
        await this.emailService.sendInvitationEmail(invitation.email, workspace.name, inviteLink);
      }
    } catch (error) {
      console.error('Failed to resend invitation email:', error);
    }

    return invitation;
  }

  async cancelInvitation(invitationId: string) {
    return this.workspaceRepository.deleteInvitation(invitationId);
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
