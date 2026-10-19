import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';

export class WorkspaceController {
  private workspaceService = new WorkspaceService();

  getWorkspaces = async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const workspaces = await this.workspaceService.getWorkspaces(userId ? String(userId) : undefined);
      res.json(workspaces);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workspaces', details: error.message });
    }
  };

  createWorkspace = async (req: Request, res: Response) => {
    try {
      const { id, name, ownerId } = req.body;
      if (!name || !ownerId) {
        return res.status(400).json({ error: 'Name and ownerId are required' });
      }
      const newWorkspace = await this.workspaceService.createWorkspace(id, name, ownerId);
      res.status(201).json(newWorkspace);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create workspace', details: error.message });
    }
  };

  updateWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const updated = await this.workspaceService.updateWorkspace(id, name);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update workspace', details: error.message });
    }
  };

  deleteWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.workspaceService.deleteWorkspace(id);
      res.json({ success: true, message: 'Workspace deleted' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete workspace', details: error.message });
    }
  };

  getMembers = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const members = await this.workspaceService.getMembers(id);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch members', details: error.message });
    }
  };

  inviteMember = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email, role } = req.body;
      const invitation = await this.workspaceService.inviteMember(id, email, role || 'MEMBER');
      res.status(201).json(invitation);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to invite member', details: error.message });
    }
  };

  updateMember = async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const { role, status } = req.body;
      const updated = await this.workspaceService.updateMember(id, userId, { role, status });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update member', details: error.message });
    }
  };

  removeMember = async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      await this.workspaceService.removeMember(id, userId);
      res.json({ success: true, message: 'Member removed' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to remove member', details: error.message });
    }
  };

  getPendingInvitations = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitations = await this.workspaceService.getPendingInvitations(id);
      res.json(invitations);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch invitations', details: error.message });
    }
  };

  resendInvitation = async (req: Request, res: Response) => {
    try {
      const { invitationId } = req.params;
      const invitation = await this.workspaceService.resendInvitation(invitationId);
      res.json(invitation);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to resend invitation', details: error.message });
    }
  };

  cancelInvitation = async (req: Request, res: Response) => {
    try {
      const { invitationId } = req.params;
      await this.workspaceService.cancelInvitation(invitationId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to cancel invitation', details: error.message });
    }
  };

  getInvitation = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const invitation = await this.workspaceService.getInvitation(token);
      res.json(invitation);
    } catch (error: any) {
      res.status(404).json({ error: 'Invitation not found or expired', details: error.message });
    }
  };

  acceptInvitation = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const member = await this.workspaceService.acceptInvitation(token, userId);
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to accept invitation', details: error.message });
    }
  };
}
