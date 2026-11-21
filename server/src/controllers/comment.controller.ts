import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendError } from '../utils/errors';

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
      sendError(res, 500, 'Failed to fetch comments', err);
    }
  };

  createComment = async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const { content } = req.body;
      // SECURITY: author is always the token subject, never a body field.
      const userId = tokenUserId(req);
      if (!userId) {
        return sendError(res, 401, 'Unauthorized');
      }

      if (!content) {
        return sendError(res, 400, 'Missing content');
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
      sendError(res, 500, 'Failed to create comment', err);
    }
  };

  deleteComment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = tokenUserId(req);
      if (!userId) {
        return sendError(res, 401, 'Unauthorized');
      }
      // Only the comment author may delete it (no existence oracle).
      const existing = await prisma.comment.findUnique({ where: { id } });
      if (!existing || existing.userId !== userId) {
        return sendError(res, 404, 'Not found');
      }
      await prisma.comment.delete({ where: { id } });
      res.json({ success: true });
    } catch (err: any) {
      sendError(res, 500, 'Failed to delete comment', err);
    }
  };
}
