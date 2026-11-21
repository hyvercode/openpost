import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  listByWorkspace: vi.fn(),
  getRuns: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  runMonitor: vi.fn(),
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

vi.mock('../src/services/monitor.service', () => ({
  MonitorService: class {
    listByWorkspace = mocks.listByWorkspace;
    getRuns = mocks.getRuns;
    create = mocks.create;
    update = mocks.update;
    remove = mocks.remove;
    runMonitor = mocks.runMonitor;
  },
}));

vi.mock('../src/db', () => ({
  prisma: { monitor: { findUnique: mocks.findUnique } },
}));

import monitorRoutes from '../src/routes/monitor.routes';

const app = express();
app.use(express.json());
app.use('/api/monitors', monitorRoutes);

describe('Monitor API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/monitors/workspace/:id returns monitors', async () => {
    mocks.listByWorkspace.mockResolvedValue([{ id: 'm1' }]);
    const res = await request(app).get('/api/monitors/workspace/ws1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'm1' }]);
  });

  it('GET /api/monitors/:id/runs returns 404 when missing', async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/monitors/nope/runs');
    expect(res.status).toBe(404);
  });

  it('POST /api/monitors/workspace/:id creates monitor', async () => {
    mocks.create.mockResolvedValue({ id: 'm1' });
    const res = await request(app).post('/api/monitors/workspace/ws1').send({ name: 'M' });
    expect(res.status).toBe(201);
  });

  it('PUT /api/monitors/:id updates monitor', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'm1', workspaceId: 'ws1' });
    mocks.update.mockResolvedValue({ id: 'm1' });
    const res = await request(app).put('/api/monitors/m1').send({ name: 'M2' });
    expect(res.status).toBe(200);
  });

  it('POST /api/monitors/:id/run runs monitor', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'm1', workspaceId: 'ws1' });
    mocks.runMonitor.mockResolvedValue({ ok: true });
    const res = await request(app).post('/api/monitors/m1/run');
    expect(res.status).toBe(200);
  });

  it('DELETE /api/monitors/:id removes monitor', async () => {
    mocks.findUnique.mockResolvedValue({ id: 'm1', workspaceId: 'ws1' });
    mocks.remove.mockResolvedValue({ id: 'm1' });
    const res = await request(app).delete('/api/monitors/m1');
    expect(res.status).toBe(200);
  });
});
