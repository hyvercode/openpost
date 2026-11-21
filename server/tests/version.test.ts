import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  getVersionById: vi.fn(),
  getVersionsByCollection: vi.fn(),
  getVersionsByWorkspace: vi.fn(),
  createVersion: vi.fn(),
  updateVersion: vi.fn(),
  rollbackCollectionToVersion: vi.fn(),
  forkVersionAsCollection: vi.fn(),
  deleteVersion: vi.fn(),
  getCollectionById: vi.fn(),
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

vi.mock('../src/services/version.service', () => ({
  VersionService: class {
    getVersionById = mocks.getVersionById;
    getVersionsByCollection = mocks.getVersionsByCollection;
    getVersionsByWorkspace = mocks.getVersionsByWorkspace;
    createVersion = mocks.createVersion;
    updateVersion = mocks.updateVersion;
    rollbackCollectionToVersion = mocks.rollbackCollectionToVersion;
    forkVersionAsCollection = mocks.forkVersionAsCollection;
    deleteVersion = mocks.deleteVersion;
  },
}));

vi.mock('../src/services/collection.service', () => ({
  CollectionService: class {
    getCollectionById = mocks.getCollectionById;
  },
}));

import versionRoutes from '../src/routes/version.routes';

const app = express();
app.use(express.json());
app.use('/api/versions', versionRoutes);

describe('Version API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/versions/collection/:id returns 404 when collection missing', async () => {
    mocks.getCollectionById.mockResolvedValue(null);
    const res = await request(app).get('/api/versions/collection/c1');
    expect(res.status).toBe(404);
  });

  it('GET /api/versions/collection/:id returns versions', async () => {
    mocks.getCollectionById.mockResolvedValue({ id: 'c1', workspaceId: 'ws1' });
    mocks.getVersionsByCollection.mockResolvedValue([{ id: 'v1' }]);
    const res = await request(app).get('/api/versions/collection/c1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'v1' }]);
  });

  it('POST /api/versions validates required fields', async () => {
    const res = await request(app).post('/api/versions').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/versions/:id/rollback returns result', async () => {
    mocks.getVersionById.mockResolvedValue({ id: 'v1' });
    mocks.rollbackCollectionToVersion.mockResolvedValue({ ok: true });
    const res = await request(app).post('/api/versions/v1/rollback');
    expect(res.status).toBe(200);
  });

  it('DELETE /api/versions/:id deletes version', async () => {
    mocks.getVersionById.mockResolvedValue({ id: 'v1' });
    mocks.deleteVersion.mockResolvedValue(undefined);
    const res = await request(app).delete('/api/versions/v1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
