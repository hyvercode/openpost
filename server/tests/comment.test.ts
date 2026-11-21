import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { uid: 'user1', email: 'test@example.com' };
    next();
  },
}));

vi.mock('../src/db', () => ({
  prisma: {
    comment: {
      findMany: mocks.findMany,
      create: mocks.create,
      findUnique: mocks.findUnique,
      delete: mocks.delete,
    },
  },
}));

import commentRoutes from '../src/routes/comment.routes';

const app = express();
app.use(express.json());
app.use('/api/comments', commentRoutes);

describe('Comment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/comments/:requestId returns comments', async () => {
    mocks.findMany.mockResolvedValue([{ id: 'c1' }]);
    const res = await request(app).get('/api/comments/r1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'c1' }]);
  });

  it('POST /api/comments/:requestId validates content', async () => {
    const res = await request(app).post('/api/comments/r1').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/comments/:requestId creates comment as token user', async () => {
    mocks.create.mockImplementation(async (args: any) => ({ id: 'c1', ...args.data }));
    const res = await request(app).post('/api/comments/r1').send({ content: 'hi' });
    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user1' }) })
    );
  });

  it('DELETE /api/comments/:id returns 404 for foreign comment', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'c1', userId: 'other' });
    const res = await request(app).delete('/api/comments/c1');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/comments/:id deletes own comment', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'c1', userId: 'user1' });
    mocks.delete.mockResolvedValue({ id: 'c1' });
    const res = await request(app).delete('/api/comments/c1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
