import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { requireAuth } from '../middleware/auth';
const router = Router();
const c = new WorkflowController();
// Webhook is unauthenticated (token in URL is the secret)
router.post('/webhook/:token', c.webhook);
router.use(requireAuth);
router.get('/workspace/:workspaceId', c.list);
router.get('/:id', c.get);
router.get('/:id/runs', c.runs);
router.post('/workspace/:workspaceId', c.create);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/run', c.runNow);
export default router;
