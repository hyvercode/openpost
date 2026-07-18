import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';

const router = Router();
const workspaceController = new WorkspaceController();

router.get('/', workspaceController.getWorkspaces);
router.post('/', workspaceController.createWorkspace);
router.put('/:id', workspaceController.updateWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);

export default router;
