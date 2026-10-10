import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { requireAuth } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
const router = Router();
const c = new WorkflowController();
// Webhook is unauthenticated (token in URL is the secret) — strict limit,
// it executes outbound HTTP on every hit.
router.post('/webhook/:token', rateLimiter(10), c.webhook);
router.use(requireAuth);
router.get('/workspace/:workspaceId', c.list);
router.get('/:id', c.get);
router.get('/:id/runs', c.runs);
router.post('/workspace/:workspaceId', rateLimiter(30), c.create);
router.put('/:id', rateLimiter(30), c.update);
router.delete('/:id', c.remove);
router.post('/:id/run', rateLimiter(10), c.runNow);
export default router;
