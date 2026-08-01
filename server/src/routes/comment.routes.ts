import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';

const router = Router();
const commentController = new CommentController();

router.get('/:requestId', commentController.getComments);
router.post('/:requestId', commentController.createComment);
router.delete('/:id', commentController.deleteComment);

export default router;
