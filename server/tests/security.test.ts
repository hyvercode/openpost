import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import collectionRoutes from '../src/routes/collection.routes';
import environmentRoutes from '../src/routes/environment.routes';
import monitorRoutes from '../src/routes/monitor.routes';
import workspaceRoutes from '../src/routes/workspace.routes';
import { assertUrlSafe, ipIsBlocked, createPinnedLookup } from '../src/services/ssrf';
import { prisma } from '../src/db';

// Real auth (JWT verify), mocked DB.
vi.mock('../src/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workspace: { findUnique: vi.fn(), findMany: vi.fn() },
    workspaceMember: { findUnique: vi.fn() },
    collection: { findMany: vi.fn(), findUnique: vi.fn() },
    environment: { findMany: vi.fn(), findUnique: vi.fn() },
    monitor: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-config';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config';

function appWith(routes: Array<[string, any]>) {
  const app = express();
  app.use(express.json());
  for (const [path, router] of routes) app.use(path, router);
  return app;
}

function userToken(uid: string) {
  return jwt.sign({ userId: uid, tv: 0 }, JWT_SECRET, { expiresIn: '1h' });
}

const MEMBER = { status: 'ACTIVE', role: 'EDITOR', workspace: { id: 'ws1', ownerId: 'owner1' } };

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.user.findUnique as any).mockResolvedValue({ uid: 'userA', email: 'a@test.com', tokenVersion: 0 });
  (prisma.workspaceMember.findUnique as any).mockResolvedValue(MEMBER);
  (prisma.workspace.findUnique as any).mockResolvedValue({ id: 'ws1', ownerId: 'owner1' });
});

describe('auth-required routes (IDOR regression)', () => {
  it('rejects unauthenticated collection access with 401', async () => {
    const app = appWith([['/api/collections', collectionRoutes]]);
    const res = await request(app).get('/api/collections/ws1');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated environment access with 401', async () => {
    const app = appWith([['/api/environments', environmentRoutes]]);
    const res = await request(app).get('/api/environments/ws1');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated monitor listing with 401', async () => {
    const app = appWith([['/api/monitors', monitorRoutes]]);
    const res = await request(app).get('/api/monitors/workspace/ws1');
    expect(res.status).toBe(401);
  });

  it('hides foreign workspace data with 404 (no ID oracle)', async () => {
    (prisma.workspaceMember.findUnique as any).mockResolvedValue(null);
    (prisma.workspace.findUnique as any).mockResolvedValue({ id: 'ws-other', ownerId: 'someone-else' });
    const app = appWith([['/api/collections', collectionRoutes]]);
    const res = await request(app)
      .get('/api/collections/ws-other')
      .set('Authorization', `Bearer ${userToken('userA')}`);
    expect(res.status).toBe(404);
  });

  it('allows member access to own workspace data', async () => {
    (prisma.collection.findMany as any).mockResolvedValue([]);
    const app = appWith([['/api/collections', collectionRoutes]]);
    const res = await request(app)
      .get('/api/collections/ws1')
      .set('Authorization', `Bearer ${userToken('userA')}`);
    expect(res.status).toBe(200);
  });

  it('rejects revoked tokens (tokenVersion mismatch)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ uid: 'userA', email: 'a@test.com', tokenVersion: 5 });
    const app = appWith([['/api/workspaces', workspaceRoutes]]);
    const res = await request(app)
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${userToken('userA')}`);
    expect(res.status).toBe(401);
  });
});

describe('SSRF guard (unit)', () => {
  it('blocks cloud metadata IPs', async () => {
    await expect(assertUrlSafe('http://169.254.169.254/latest')).rejects.toMatchObject({ status: 403 });
    await expect(assertUrlSafe('http://100.100.100.100/')).rejects.toMatchObject({ status: 403 });
  });

  it('blocks localhost and private hostnames', async () => {
    await expect(assertUrlSafe('http://localhost:3000/')).rejects.toMatchObject({ status: 403 });
    await expect(assertUrlSafe('http://myapp.internal/')).rejects.toMatchObject({ status: 403 });
    await expect(assertUrlSafe('http://app.local/')).rejects.toMatchObject({ status: 403 });
  });

  it('blocks non-http schemes and URL credentials', async () => {
    await expect(assertUrlSafe('file:///etc/passwd')).rejects.toMatchObject({ status: 400 });
    await expect(assertUrlSafe('gopher://example.com/')).rejects.toMatchObject({ status: 400 });
    await expect(assertUrlSafe('https://user:pass@example.com/')).rejects.toMatchObject({ status: 400 });
  });

  it('ipIsBlocked rejects private/loopback/link-local', () => {
    expect(ipIsBlocked('127.0.0.1')).toBe(true);
    expect(ipIsBlocked('10.0.0.5')).toBe(true);
    expect(ipIsBlocked('192.168.1.1')).toBe(true);
    expect(ipIsBlocked('::1')).toBe(true);
    expect(ipIsBlocked('::ffff:127.0.0.1')).toBe(true);
    expect(ipIsBlocked('93.184.215.14')).toBe(false);
  });

  it('pinned lookup honors { all: true } (Node 20+ autoSelectFamily)', async () => {
    const lookup = createPinnedLookup('example.com', '93.184.215.14');
    const single: any = await new Promise((resolve, reject) =>
      lookup('example.com', {}, (err: any, address: any, family: any) => (err ? reject(err) : resolve({ address, family })))
    );
    expect(single).toEqual({ address: '93.184.215.14', family: 4 });
    const all: any = await new Promise((resolve, reject) =>
      lookup('example.com', { all: true }, (err: any, addrs: any) => (err ? reject(err) : resolve(addrs)))
    );
    expect(all).toEqual([{ address: '93.184.215.14', family: 4 }]);
    await expect(
      new Promise((_resolve, reject) =>
        lookup('evil.com', {}, (err: any) => (err ? reject(err) : null))
      )
    ).rejects.toThrow();
  });
});
