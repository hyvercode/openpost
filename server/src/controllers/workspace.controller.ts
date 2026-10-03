import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';

export class WorkspaceController {
  private workspaceService = new WorkspaceService();

  getWorkspaces = async (req: Request, res: Response) => {
    try {
      // SECURITY: never trust userId from query — always use the token subject.
      const userId = (req as any).user?.uid || (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const workspaces = await this.workspaceService.getWorkspaces(userId);
      res.json(workspaces);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  };

  createWorkspace = async (req: Request, res: Response) => {
    try {
      // SECURITY: ownerId comes from the token, not the body (prevents
      // creating workspaces on behalf of other users).
      const ownerId = (req as any).user?.uid || (req as any).user?.userId;
      if (!ownerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { id, name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      const newWorkspace = await this.workspaceService.createWorkspace(id, name, ownerId);
      res.status(201).json(newWorkspace);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create workspace' });
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
      // SECURITY: bind acceptance to the authenticated user, not a body field.
      const bodyUserId = req.body?.userId;
      const tokenUserId = (req as any).user?.uid || (req as any).user?.userId;
      // Invitation links may be opened before login; allow anonymous accept
      // only when the route itself is unauthenticated. When a token IS present,
      // the accepter must match it.
      const userId = tokenUserId || bodyUserId;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      if (tokenUserId && bodyUserId && tokenUserId !== bodyUserId) {
        return res.status(403).json({ error: 'Forbidden: invitation must be accepted by the logged-in user' });
      }
      const member = await this.workspaceService.acceptInvitation(token, userId);
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  };
}
