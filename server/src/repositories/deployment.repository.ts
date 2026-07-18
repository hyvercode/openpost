import { prisma } from '../db';

export interface DeploymentData {
  id: string;
  workspaceId: string;
  collectionId: string;
  collectionName: string;
  version?: string;
  requests?: any;
  mockConfig?: any;
}

export class DeploymentRepository {
  async findByWorkspaceId(workspaceId: string) {
    return prisma.deployment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.deployment.findUnique({
      where: { id }
    });
  }

  async create(data: DeploymentData) {
    return prisma.deployment.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        collectionId: data.collectionId,
        collectionName: data.collectionName,
        version: data.version || 'v1',
        requests: data.requests ? JSON.parse(JSON.stringify(data.requests)) : [],
        mockConfig: data.mockConfig ? JSON.parse(JSON.stringify(data.mockConfig)) : {}
      }
    });
  }

  async update(id: string, data: Partial<DeploymentData>) {
    return prisma.deployment.update({
      where: { id },
      data: {
        ...(data.mockConfig !== undefined && { mockConfig: data.mockConfig ? JSON.parse(JSON.stringify(data.mockConfig)) : undefined }),
        ...(data.requests !== undefined && { requests: data.requests ? JSON.parse(JSON.stringify(data.requests)) : undefined }),
        ...(data.collectionName !== undefined && { collectionName: data.collectionName })
      }
    });
  }

  async delete(id: string) {
    return prisma.deployment.delete({
      where: { id }
    });
  }
}
