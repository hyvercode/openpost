import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = Router();
const adminController = new AdminController();

router.use(requireAuth, requireAdmin);

router.get('/stats', adminController.stats);
router.get('/audit', adminController.audit);
router.get('/usage', adminController.usage);

export default router;
