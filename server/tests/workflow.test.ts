import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  listByWorkspace: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  getRuns: vi.fn(),
  run: vi.fn(),
  findUnique: vi.fn(),
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

vi.mock('../src/middleware/rateLimiter', () => ({
  rateLimiter: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../src/services/workflow.service', () => ({
  WorkflowService: class {
    listByWorkspace = mocks.listByWorkspace;
    getById = mocks.getById;
    create = mocks.create;
    update = mocks.update;
    remove = mocks.remove;
    getRuns = mocks.getRuns;
    run = mocks.run;
  },
}));

vi.mock('../src/db', () => ({
  prisma: { workflow: { findUnique: mocks.findUnique } },
}));

import workflowRoutes from '../src/routes/workflow.routes';

const app = express();
app.use(express.json());
app.use('/api/workflows', workflowRoutes);

describe('Workflow API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/workflows/workspace/:id returns workflows', async () => {
    mocks.listByWorkspace.mockResolvedValue([{ id: 'w1' }]);
    const res = await request(app).get('/api/workflows/workspace/ws1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'w1' }]);
  });

  it('GET /api/workflows/:id returns 404 when missing', async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/workflows/nope');
    expect(res.status).toBe(404);
  });

  it('GET /api/workflows/:id returns workflow', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'w1', workspaceId: 'ws1' });
    mocks.getById.mockResolvedValue({ id: 'w1' });
    const res = await request(app).get('/api/workflows/w1');
    expect(res.status).toBe(200);
  });

  it('POST /api/workflows/workspace/:id creates workflow', async () => {
    mocks.create.mockResolvedValue({ id: 'w1' });
    const res = await request(app).post('/api/workflows/workspace/ws1').send({ name: 'W' });
    expect(res.status).toBe(201);
  });

  it('POST /api/workflows/:id/run runs workflow', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'w1', workspaceId: 'ws1' });
    mocks.run.mockResolvedValue({ ok: true });
    const res = await request(app).post('/api/workflows/w1/run').send({});
    expect(res.status).toBe(200);
  });

  it('POST /api/workflows/webhook/:token returns 404 for unknown token', async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/workflows/webhook/bad').send({});
    expect(res.status).toBe(404);
  });

  it('DELETE /api/workflows/:id removes workflow', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'w1', workspaceId: 'ws1' });
    mocks.remove.mockResolvedValue({ id: 'w1' });
    const res = await request(app).delete('/api/workflows/w1');
    expect(res.status).toBe(200);
  });
});
