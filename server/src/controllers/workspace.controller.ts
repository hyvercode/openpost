import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { sendError } from '../utils/errors';

export class WorkspaceController {
  private workspaceService = new WorkspaceService();

  getWorkspaces = async (req: Request, res: Response) => {
    try {
      // SECURITY: never trust userId from query — always use the token subject.
      const userId = (req as any).user?.uid || (req as any).user?.userId;
      if (!userId) {
        return sendError(res, 401, 'Unauthorized');
      }
      const workspaces = await this.workspaceService.getWorkspaces(userId);
      res.json(workspaces);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch workspaces', error);
    }
  };

  createWorkspace = async (req: Request, res: Response) => {
    try {
      // SECURITY: ownerId comes from the token, not the body (prevents
      // creating workspaces on behalf of other users).
      const ownerId = (req as any).user?.uid || (req as any).user?.userId;
      if (!ownerId) {
        return sendError(res, 401, 'Unauthorized');
      }
      const { id, name } = req.body;
      if (!name) {
        return sendError(res, 400, 'Name is required');
      }
      const newWorkspace = await this.workspaceService.createWorkspace(id, name, ownerId);
      res.status(201).json(newWorkspace);
    } catch (error: any) {
      sendError(res, 500, 'Failed to create workspace', error);
    }
  };

  updateWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const updated = await this.workspaceService.updateWorkspace(id, name);
      res.json(updated);
    } catch (error: any) {
      sendError(res, 500, 'Failed to update workspace', error);
    }
  };

  deleteWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      await this.workspaceService.deleteWorkspace(id, actor);
      res.json({ success: true, message: 'Workspace moved to trash' });
    } catch (error: any) {
      sendError(res, 500, 'Failed to delete workspace', error);
    }
  };

  restoreWorkspace = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      const restored = await this.workspaceService.restoreWorkspace(id, actor);
      res.json(restored);
    } catch (error: any) {
      sendError(res, 500, 'Failed to restore workspace', error);
    }
  };

  getTrash = async (req: Request, res: Response) => {
    try {
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      if (!actor) return sendError(res, 401, 'Unauthorized');
      const trash = await this.workspaceService.getTrash(actor);
      res.json(trash);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch trash', error);
    }
  };

  getAuditLog = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
      const log = await this.workspaceService.getAuditLog(id, limit);
      res.json(log);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch audit log', error);
    }
  };

  getMembers = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const members = await this.workspaceService.getMembers(id);
      res.json(members);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch members', error);
    }
  };

  inviteMember = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { email, role } = req.body;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      const invitation = await this.workspaceService.inviteMember(id, email, role || 'VIEWER', actor);
      res.status(201).json(invitation);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to invite member' });
    }
  };

  updateMember = async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const { role, status } = req.body;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      const updated = await this.workspaceService.updateMember(id, userId, { role, status }, actor);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update member' });
    }
  };

  removeMember = async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.params;
      const actor = (req as any).user?.uid || (req as any).user?.userId;
      await this.workspaceService.removeMember(id, userId, actor);
      res.json({ success: true, message: 'Member removed' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to remove member' });
    }
  };

  getPendingInvitations = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invitations = await this.workspaceService.getPendingInvitations(id);
      res.json(invitations);
    } catch (error: any) {
      sendError(res, 500, 'Failed to fetch invitations', error);
    }
  };

  resendInvitation = async (req: Request, res: Response) => {
    try {
      const { invitationId } = req.params;
      const invitation = await this.workspaceService.resendInvitation(invitationId);
      res.json(invitation);
    } catch (error: any) {
      sendError(res, 500, 'Failed to resend invitation', error);
    }
  };

  cancelInvitation = async (req: Request, res: Response) => {
    try {
      const { invitationId } = req.params;
      await this.workspaceService.cancelInvitation(invitationId);
      res.json({ success: true });
    } catch (error: any) {
      sendError(res, 500, 'Failed to cancel invitation', error);
    }
  };

  getInvitation = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const invitation = await this.workspaceService.getInvitation(token);
      res.json(invitation);
    } catch (error: any) {
      sendError(res, 404, 'Invitation not found or expired', error);
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
        return sendError(res, 400, 'userId is required');
      }
      if (tokenUserId && bodyUserId && tokenUserId !== bodyUserId) {
        return sendError(res, 403, 'Forbidden: invitation must be accepted by the logged-in user');
      }
      const member = await this.workspaceService.acceptInvitation(token, userId);
      res.json(member);
    } catch (error: any) {
      sendError(res, 500, 'Failed to accept invitation', error);
    }
  };
}
