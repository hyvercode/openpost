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
  private parseDep(d: any) {
    if (!d) return d;
    return {
      ...d,
      requests: d.requests ? JSON.parse(d.requests) : [],
      mockConfig: d.mockConfig ? JSON.parse(d.mockConfig) : {}
    };
  }

  async findByWorkspaceId(workspaceId: string) {
    const deps = await prisma.deployment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    return deps.map(this.parseDep);
  }

  async findById(id: string) {
    const dep = await prisma.deployment.findUnique({
      where: { id }
    });
    return this.parseDep(dep);
  }

  async create(data: DeploymentData) {
    const created = await prisma.deployment.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        collectionId: data.collectionId,
        collectionName: data.collectionName,
        version: data.version || 'v1',
        requests: data.requests ? JSON.stringify(data.requests) : "[]",
        mockConfig: data.mockConfig ? JSON.stringify(data.mockConfig) : "{}"
      }
    });
    return this.parseDep(created);
  }

  async update(id: string, data: Partial<DeploymentData>) {
    const updated = await prisma.deployment.update({
      where: { id },
      data: {
        ...(data.mockConfig !== undefined && { mockConfig: data.mockConfig ? JSON.stringify(data.mockConfig) : undefined }),
        ...(data.requests !== undefined && { requests: data.requests ? JSON.stringify(data.requests) : undefined }),
        ...(data.collectionName !== undefined && { collectionName: data.collectionName })
      }
    });
    return this.parseDep(updated);
  }

  async delete(id: string) {
    const deleted = await prisma.deployment.delete({
      where: { id }
    });
    return this.parseDep(deleted);
  }
}
