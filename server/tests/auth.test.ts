import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth.routes';
import { prisma } from '../src/db';

vi.mock('../src/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    workspaceMember: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth API - Google Auth', () => {
  it('POST /api/auth/google should reject request without credential', async () => {
    // SECURITY: raw-email login is no longer accepted — a Google-signed
    // ID token (credential) is required.
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        email: 'newuser@gmail.com',
        displayName: 'New User',
        photoURL: 'https://example.com/photo.jpg',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/credential/i);
  });

  it('POST /api/auth/google should reject invalid credential', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/google should reject empty email', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
