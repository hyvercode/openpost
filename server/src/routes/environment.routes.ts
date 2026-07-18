import { Router } from 'express';
import { EnvironmentController } from '../controllers/environment.controller';

const router = Router();
const environmentController = new EnvironmentController();

router.get('/:workspaceId', environmentController.getEnvironmentsByWorkspace);
router.post('/', environmentController.createEnvironment);
router.put('/:id', environmentController.updateEnvironment);
router.delete('/:id', environmentController.deleteEnvironment);

export default router;
