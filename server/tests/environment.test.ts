import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  getEnvironmentById: vi.fn(),
  getEnvironmentsByWorkspace: vi.fn(),
  createEnvironment: vi.fn(),
  updateEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  restoreEnvironment: vi.fn(),
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

vi.mock('../src/services/environment.service', () => ({
  EnvironmentService: class {
    getEnvironmentById = mocks.getEnvironmentById;
    getEnvironmentsByWorkspace = mocks.getEnvironmentsByWorkspace;
    createEnvironment = mocks.createEnvironment;
    updateEnvironment = mocks.updateEnvironment;
    deleteEnvironment = mocks.deleteEnvironment;
    restoreEnvironment = mocks.restoreEnvironment;
  },
}));

import environmentRoutes from '../src/routes/environment.routes';

const app = express();
app.use(express.json());
app.use('/api/environments', environmentRoutes);

describe('Environment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/environments/:workspaceId should return environments', async () => {
    mocks.getEnvironmentsByWorkspace.mockResolvedValue([{ id: 'e1', name: 'Dev' }]);
    const res = await request(app).get('/api/environments/ws1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'e1', name: 'Dev' }]);
  });

  it('POST /api/environments should validate workspaceId and name', async () => {
    const res = await request(app).post('/api/environments').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('WorkspaceId and name are required');
  });

  it('POST /api/environments should create an environment', async () => {
    mocks.createEnvironment.mockResolvedValue({ id: 'e1', name: 'New' });
    const res = await request(app)
      .post('/api/environments')
      .send({ workspaceId: 'ws1', name: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New');
  });

  it('PUT /api/environments/:id should map CONFLICT to 409', async () => {
    mocks.updateEnvironment.mockRejectedValue({
      code: 'CONFLICT',
      message: 'stale',
      current: { id: 'e1' },
    });
    const res = await request(app).put('/api/environments/e1').send({ name: 'X' });
    expect(res.status).toBe(409);
  });

  it('DELETE /api/environments/:id should soft-delete', async () => {
    mocks.deleteEnvironment.mockResolvedValue({});
    const res = await request(app).delete('/api/environments/e1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/environments/:id/restore should restore', async () => {
    mocks.restoreEnvironment.mockResolvedValue({ id: 'e1', name: 'Dev' });
    const res = await request(app).post('/api/environments/e1/restore');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('e1');
  });
});
