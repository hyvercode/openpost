import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const userController = new UserController();

router.get('/:uid', requireAuth, userController.getUser);
router.post('/', requireAuth, userController.upsertUser);

export default router;
