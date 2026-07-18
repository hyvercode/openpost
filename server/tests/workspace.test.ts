import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import workspaceRoutes from '../src/routes/workspace.routes';
import { prisma } from '../src/db';

vi.mock('../src/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    workspaceMember: {
      create: vi.fn(),
    }
  }
}));

const app = express();
app.use(express.json());
app.use('/api/workspaces', workspaceRoutes);

describe('Workspace API', () => {
  it('GET /api/workspaces should return all workspaces', async () => {
    const mockWorkspaces = [{ id: '1', name: 'Test', ownerId: 'user1' }];
    (prisma.workspace.findMany as any).mockResolvedValue(mockWorkspaces);

    const res = await request(app).get('/api/workspaces');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockWorkspaces);
  });

  it('POST /api/workspaces should create a new workspace', async () => {
    const newWorkspace = { id: '1', name: 'New Test', ownerId: 'user1' };
    (prisma.user.findUnique as any).mockResolvedValue({ uid: 'user1' });
    (prisma.workspace.create as any).mockResolvedValue(newWorkspace);
    (prisma.workspaceMember.create as any).mockResolvedValue({});

    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'New Test', ownerId: 'user1' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Test');
    expect(prisma.workspaceMember.create).toHaveBeenCalled();
  });

  it('POST /api/workspaces should validate required fields', async () => {
    const res = await request(app)
      .post('/api/workspaces')
      .send({ name: 'New Test' }); // Missing ownerId

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name and ownerId are required');
  });
});
