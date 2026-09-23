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
  it('POST /api/auth/google should register a new Google user and create default workspace', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const mockUser = {
      uid: 'google-user-1',
      email: 'newuser@gmail.com',
      displayName: 'New User',
      photoURL: 'https://example.com/photo.jpg',
      isEmailVerified: true,
    };
    (prisma.user.create as any).mockResolvedValue(mockUser);
    (prisma.workspace.create as any).mockResolvedValue({ id: 'ws-1', name: "New User's Workspace" });
    (prisma.workspaceMember.create as any).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        email: 'newuser@gmail.com',
        displayName: 'New User',
        photoURL: 'https://example.com/photo.jpg',
      });

    expect(res.status).toBe(200);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.email).toBe('newuser@gmail.com');
    expect(res.body.token).toBeDefined();
    expect(prisma.workspace.create).toHaveBeenCalled();
  });

  it('POST /api/auth/google should login an existing Google user', async () => {
    const existingUser = {
      uid: 'google-user-1',
      email: 'existing@gmail.com',
      displayName: 'Existing User',
      photoURL: null,
      isEmailVerified: true,
    };
    (prisma.user.findUnique as any).mockResolvedValue(existingUser);
    (prisma.user.update as any).mockResolvedValue({
      ...existingUser,
      photoURL: 'https://example.com/avatar.jpg',
    });
    (prisma.workspaceMember.count as any).mockResolvedValue(1);

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        email: 'existing@gmail.com',
        photoURL: 'https://example.com/avatar.jpg',
      });

    expect(res.status).toBe(200);
    expect(res.body.isNewUser).toBe(false);
    expect(res.body.user.email).toBe('existing@gmail.com');
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/auth/google should reject empty email', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
