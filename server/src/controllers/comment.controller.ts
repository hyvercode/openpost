import { Request, Response } from 'express';
import { prisma } from '../db';

function tokenUserId(req: Request): string | null {
  const u = (req as any).user;
  return u?.uid || u?.userId || null;
}

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
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  };

  createComment = async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { content } = req.body;
      // SECURITY: author is always the token subject, never a body field.
      const userId = tokenUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!content) {
        return res.status(400).json({ error: 'Missing content' });
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
      res.status(500).json({ error: 'Failed to create comment' });
    }
  };

  deleteComment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = tokenUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Only the comment author may delete it (no existence oracle).
      const existing = await prisma.comment.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: 'Not found' });
      }
      await prisma.comment.delete({ where: { id } });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  };
}
