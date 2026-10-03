import { Router } from 'express';
import { VersionController } from '../controllers/version.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const versionController = new VersionController();

router.use(requireAuth);

router.get('/collection/:collectionId', versionController.getVersionsByCollection);
router.get('/workspace/:workspaceId', versionController.getVersionsByWorkspace);
router.get('/:id', versionController.getVersionById);
router.post('/', versionController.createVersion);
router.put('/:id', versionController.updateVersion);
router.post('/:id/rollback', versionController.rollback);
router.post('/:id/fork', versionController.fork);
router.delete('/:id', versionController.deleteVersion);

export default router;
