import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { requireAuth, requireWorkspaceAccess } from '../middleware/auth';

const router = Router();
const workspaceController = new WorkspaceController();

router.use(requireAuth);

router.get('/', workspaceController.getWorkspaces);
router.post('/', workspaceController.createWorkspace);
router.put('/:id', requireWorkspaceAccess, workspaceController.updateWorkspace);
router.delete('/:id', requireWorkspaceAccess, workspaceController.deleteWorkspace);

router.get('/:id/members', requireWorkspaceAccess, workspaceController.getMembers);
router.post('/:id/invite', requireWorkspaceAccess, workspaceController.inviteMember);
router.patch('/:id/members/:userId', requireWorkspaceAccess, workspaceController.updateMember);
router.delete('/:id/members/:userId', requireWorkspaceAccess, workspaceController.removeMember);

router.get('/invitations/:token', workspaceController.getInvitation);
router.post('/invitations/:token/accept', workspaceController.acceptInvitation);

export default router;
