import { Request, Response } from 'express';
import { prisma } from '../db';

export class CommentController {
  getComments = async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const comments = await prisma.comment.findMany({
        where: { requestId },
        include: {
          user: {
            select: { uid: true, email: true, displayName: true, photoURL: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      res.json(comments);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch comments', details: err.message });
    }
  };

  createComment = async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { content, userId } = req.body;
      
      if (!content || !userId) {
        return res.status(400).json({ error: 'Missing content or userId' });
      }

      const comment = await prisma.comment.create({
        data: {
          requestId,
          content,
          userId
        },
        include: {
          user: {
            select: { uid: true, email: true, displayName: true, photoURL: true }
          }
        }
      });
      res.json(comment);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create comment', details: err.message });
    }
  };

  deleteComment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.comment.delete({ where: { id } });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete comment', details: err.message });
    }
  };
}
