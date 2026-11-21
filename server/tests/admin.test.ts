import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  auditFindMany: vi.fn(),
  usageFindMany: vi.fn(),
}));

vi.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { uid: 'admin1', email: 'admin@example.com' };
    next();
  },
}));

vi.mock('../src/middleware/admin', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../src/db', () => ({
  prisma: {
    user: { count: mocks.count },
    workspace: { count: mocks.count },
    collection: { count: mocks.count },
    monitor: { count: mocks.count },
    monitorRun: { count: mocks.count },
    auditLog: { count: mocks.count, findMany: mocks.auditFindMany },
    usageMeter: { findMany: mocks.usageFindMany },
  },
}));

import adminRoutes from '../src/routes/admin.routes';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/admin/stats returns counters', async () => {
    mocks.count.mockResolvedValue(3);
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      users: 3,
      workspaces: 3,
      collections: 3,
      monitors: 3,
      runs24h: 3,
      audit24h: 3,
    });
  });

  it('GET /api/admin/audit caps limit at 500', async () => {
    mocks.auditFindMany.mockResolvedValue([]);
    const res = await request(app).get('/api/admin/audit?limit=9999');
    expect(res.status).toBe(200);
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });

  it('GET /api/admin/usage aggregates by action', async () => {
    mocks.usageFindMany.mockResolvedValue([
      { action: 'proxy', userId: 'u1', count: 2 },
      { action: 'proxy', userId: 'u2', count: 1 },
    ]);
    const res = await request(app).get('/api/admin/usage?month=2026-01');
    expect(res.status).toBe(200);
    expect(res.body.byAction).toEqual({ proxy: 3 });
    expect(res.body.meteredUsers).toBe(2);
    expect(res.body.topUsers[0]).toEqual({ userId: 'u1', total: 2 });
  });
});
