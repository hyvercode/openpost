import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validateAvatarDataUrl } from '../src/controllers/user.controller';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock('../src/middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { uid: 'user1', email: 'test@example.com' };
    next();
  },
}));

vi.mock('../src/services/user.service', () => ({
  UserService: class {
    getUser = mocks.getUser;
    upsertUser = mocks.upsertUser;
  },
}));

import userRoutes from '../src/routes/user.routes';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/users/:uid returns 404 when missing', async () => {
    mocks.getUser.mockResolvedValue(null);
    const res = await request(app).get('/api/users/nope');
    expect(res.status).toBe(404);
  });

  it('GET /api/users/:uid returns user', async () => {
    mocks.getUser.mockResolvedValue({ uid: 'user1' });
    const res = await request(app).get('/api/users/user1');
    expect(res.status).toBe(200);
  });

  it('POST /api/users forbids updating another profile', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ uid: 'other', email: 'x@y.z' });
    expect(res.status).toBe(403);
  });

  it('POST /api/users/avatar rejects empty image', async () => {
    const res = await request(app).post('/api/users/avatar').send({});
    expect(res.status).toBe(400);
  });

  it('DELETE /api/users/avatar clears avatar', async () => {
    mocks.upsertUser.mockResolvedValue({ uid: 'user1', photoURL: null });
    const res = await request(app).delete('/api/users/avatar');
    expect(res.status).toBe(200);
    expect(mocks.upsertUser).toHaveBeenCalledWith('user1', { photoURL: null });
  });
});

describe('validateAvatarDataUrl', () => {
  it('accepts https URLs under 2048 chars', () => {
    expect(validateAvatarDataUrl('https://example.com/a.png')).toBeNull();
  });

  it('rejects overlong URLs', () => {
    expect(validateAvatarDataUrl('https://example.com/' + 'a'.repeat(2048))).toBe(
      'Avatar URL is too long'
    );
  });

  it('rejects non-image data URLs', () => {
    expect(validateAvatarDataUrl('data:text/plain;base64,abcd')).toBe(
      'Avatar must be a PNG, JPEG, GIF or WebP image'
    );
  });

  it('accepts small png data URL', () => {
    const tiny = 'data:image/png;base64,' + 'A'.repeat(100);
    expect(validateAvatarDataUrl(tiny)).toBeNull();
  });
});
