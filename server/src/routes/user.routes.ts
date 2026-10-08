import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();

router.post('/avatar', requireAuth, userController.updateAvatar);
router.delete('/avatar', requireAuth, userController.deleteAvatar);
router.get('/:uid', requireAuth, userController.getUser);
router.post('/', requireAuth, userController.upsertUser);

export default router;
