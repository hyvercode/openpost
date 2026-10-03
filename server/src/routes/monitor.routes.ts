import { Router } from 'express';
import { MonitorController } from '../controllers/monitor.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const monitorController = new MonitorController();

router.use(requireAuth);

router.get('/workspace/:workspaceId', monitorController.list);
router.post('/workspace/:workspaceId', monitorController.create);
router.get('/:id/runs', monitorController.runs);
router.put('/:id', monitorController.update);
router.delete('/:id', monitorController.remove);
router.post('/:id/run', monitorController.runNow);

export default router;
