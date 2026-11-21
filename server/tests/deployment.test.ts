import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  getDeploymentsByWorkspace: vi.fn(),
  getDeploymentById: vi.fn(),
  createDeployment: vi.fn(),
  updateDeployment: vi.fn(),
  deleteDeployment: vi.fn(),
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

vi.mock('../src/services/deployment.service', () => ({
  DeploymentService: class {
    getDeploymentsByWorkspace = mocks.getDeploymentsByWorkspace;
    getDeploymentById = mocks.getDeploymentById;
    createDeployment = mocks.createDeployment;
    updateDeployment = mocks.updateDeployment;
    deleteDeployment = mocks.deleteDeployment;
  },
}));

import deploymentRoutes from '../src/routes/deployment.routes';

const app = express();
app.use(express.json());
app.use('/api/deployments', deploymentRoutes);

describe('Deployment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/deployments/:workspaceId returns deployments', async () => {
    mocks.getDeploymentsByWorkspace.mockResolvedValue([{ id: 'd1' }]);
    const res = await request(app).get('/api/deployments/ws1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'd1' }]);
  });

  it('POST /api/deployments validates required fields', async () => {
    const res = await request(app).post('/api/deployments').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/deployments creates deployment', async () => {
    mocks.createDeployment.mockResolvedValue({ id: 'd1' });
    const res = await request(app)
      .post('/api/deployments')
      .send({ workspaceId: 'ws1', collectionId: 'c1', collectionName: 'C' });
    expect(res.status).toBe(201);
  });

  it('PUT /api/deployments/:id updates deployment', async () => {
    mocks.getDeploymentById.mockResolvedValue({ id: 'd1' });
    mocks.updateDeployment.mockResolvedValue({ id: 'd1' });
    const res = await request(app).put('/api/deployments/d1').send({ collectionName: 'C2' });
    expect(res.status).toBe(200);
  });

  it('DELETE /api/deployments/:id deletes deployment', async () => {
    mocks.getDeploymentById.mockResolvedValue({ id: 'd1' });
    mocks.deleteDeployment.mockResolvedValue(undefined);
    const res = await request(app).delete('/api/deployments/d1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
