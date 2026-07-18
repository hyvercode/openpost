import { Router } from 'express';
import { DeploymentController } from '../controllers/deployment.controller';

const router = Router();
const deploymentController = new DeploymentController();

router.get('/:workspaceId', deploymentController.getDeploymentsByWorkspace);
router.post('/', deploymentController.createDeployment);
router.put('/:id', deploymentController.updateDeployment);
router.delete('/:id', deploymentController.deleteDeployment);

export default router;
