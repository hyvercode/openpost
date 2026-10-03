import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { requireAuth, requireWorkspaceAccess } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateBody, workspaceCreateSchema } from '../middleware/validation';

const router = Router();
const workspaceController = new WorkspaceController();

router.use(requireAuth);

router.get('/', workspaceController.getWorkspaces);
// Trash must be registered before any single-segment GET param route.
router.get('/trash', workspaceController.getTrash);
router.post('/', validateBody(workspaceCreateSchema), workspaceController.createWorkspace);
// Rename: any active member (VIEWER+) may read, but only EDITOR+ renames.
router.put('/:id', requireWorkspaceAccess, workspaceController.updateWorkspace);
// Delete workspace: OWNER only (soft delete, recoverable via restore).
router.delete('/:id', requireRole('OWNER'), workspaceController.deleteWorkspace);
// Restore from trash: OWNER only.
router.post('/:id/restore', requireRole('OWNER'), workspaceController.restoreWorkspace);
// Audit log: ADMIN+ only.
router.get('/:id/audit', requireRole('ADMIN'), workspaceController.getAuditLog);

router.get('/:id/members', requireWorkspaceAccess, workspaceController.getMembers);
// Member management: ADMIN+ only.
router.post('/:id/invite', requireRole('ADMIN'), workspaceController.inviteMember);
router.get('/:id/invitations', requireRole('ADMIN'), workspaceController.getPendingInvitations);
router.patch('/:id/members/:userId', requireRole('ADMIN'), workspaceController.updateMember);
router.delete('/:id/members/:userId', requireRole('ADMIN'), workspaceController.removeMember);

router.get('/invitations/:token', workspaceController.getInvitation);
router.post('/invitations/:token/accept', workspaceController.acceptInvitation);
router.post('/invitations/:invitationId/resend', requireAuth, workspaceController.resendInvitation);
router.delete('/invitations/:invitationId', requireAuth, workspaceController.cancelInvitation);

export default router;
