import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router = Router();
const userController = new UserController();

router.get('/:uid', userController.getUser);
router.post('/', userController.upsertUser);

export default router;
