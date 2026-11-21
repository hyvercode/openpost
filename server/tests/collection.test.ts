import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  getCollectionById: vi.fn(),
  getCollectionsByWorkspace: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  restoreCollection: vi.fn(),
  getTrashByWorkspace: vi.fn(),
}));

vi.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { uid: 'user1', email: 'test@example.com' };
    next();
  },
}));

vi.mock('../src/middleware/ownership', () => ({
  assertWorkspaceAccess: vi.fn(async () => true),
  assertRecordAccess: vi.fn(async () => true),
}));

vi.mock('../src/services/collection.service', () => ({
  CollectionService: class {
    getCollectionById = mocks.getCollectionById;
    getCollectionsByWorkspace = mocks.getCollectionsByWorkspace;
    createCollection = mocks.createCollection;
    updateCollection = mocks.updateCollection;
    deleteCollection = mocks.deleteCollection;
    restoreCollection = mocks.restoreCollection;
    getTrashByWorkspace = mocks.getTrashByWorkspace;
  },
}));

import collectionRoutes from '../src/routes/collection.routes';

const app = express();
app.use(express.json());
app.use('/api/collections', collectionRoutes);

describe('Collection API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/collections/:workspaceId should return collections', async () => {
    mocks.getCollectionsByWorkspace.mockResolvedValue([{ id: 'c1', name: 'C' }]);
    const res = await request(app).get('/api/collections/ws1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'c1', name: 'C' }]);
  });

  it('POST /api/collections should validate workspaceId and name', async () => {
    const res = await request(app).post('/api/collections').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('WorkspaceId and name are required');
  });

  it('POST /api/collections should create a collection', async () => {
    mocks.createCollection.mockResolvedValue({ id: 'c1', name: 'New' });
    const res = await request(app)
      .post('/api/collections')
      .send({ workspaceId: 'ws1', name: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New');
  });

  it('PUT /api/collections/:id should map CONFLICT to 409', async () => {
    mocks.updateCollection.mockRejectedValue({
      code: 'CONFLICT',
      message: 'stale',
      current: { id: 'c1' },
    });
    const res = await request(app).put('/api/collections/c1').send({ name: 'X' });
    expect(res.status).toBe(409);
  });

  it('DELETE /api/collections/:id should soft-delete', async () => {
    mocks.deleteCollection.mockResolvedValue({});
    const res = await request(app).delete('/api/collections/c1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/collections/shared/:id should 404 when missing', async () => {
    mocks.getCollectionById.mockResolvedValue(null);
    const res = await request(app).get('/api/collections/shared/nope');
    expect(res.status).toBe(404);
  });
});
