import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const commentController = new CommentController();

router.use(requireAuth);

router.get('/:requestId', commentController.getComments);
router.post('/:requestId', commentController.createComment);
router.delete('/:id', commentController.deleteComment);

export default router;
