import { prisma } from '../db';

export interface VersionData {
  id: string;
  workspaceId: string;
  collectionId: string;
  collectionName: string;
  version: string;
  name?: string | null;
  description?: string | null;
  author?: string | null;
  folders?: any;
  requests?: any;
  mockConfig?: any;
  tags?: any;
  diffSummary?: any;
  createdAt?: Date;
}

export class VersionRepository {
  private parseVersion(v: any) {
    if (!v) return v;
    return {
      ...v,
      folders: v.folders ? JSON.parse(v.folders) : [],
      requests: v.requests ? JSON.parse(v.requests) : [],
      mockConfig: v.mockConfig ? JSON.parse(v.mockConfig) : {},
      tags: v.tags ? JSON.parse(v.tags) : [],
      diffSummary: v.diffSummary ? JSON.parse(v.diffSummary) : null,
    };
  }

  async findByCollectionId(collectionId: string) {
    const versions = await (prisma as any).collectionVersion.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' }
    });
    return versions.map((v: any) => this.parseVersion(v));
  }

  async findByWorkspaceId(workspaceId: string) {
    const versions = await (prisma as any).collectionVersion.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
    return versions.map((v: any) => this.parseVersion(v));
  }

  async findById(id: string) {
    const version = await (prisma as any).collectionVersion.findUnique({
      where: { id }
    });
    return this.parseVersion(version);
  }

  async create(data: VersionData) {
    const created = await (prisma as any).collectionVersion.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        collectionId: data.collectionId,
        collectionName: data.collectionName,
        version: data.version,
        name: data.name || null,
        description: data.description || null,
        author: data.author || null,
        folders: data.folders ? JSON.stringify(data.folders) : "[]",
        requests: data.requests ? JSON.stringify(data.requests) : "[]",
        mockConfig: data.mockConfig ? JSON.stringify(data.mockConfig) : "{}",
        tags: data.tags ? JSON.stringify(data.tags) : "[]",
        diffSummary: data.diffSummary ? JSON.stringify(data.diffSummary) : null,
      }
    });
    return this.parseVersion(created);
  }

  async update(id: string, data: Partial<VersionData>) {
    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.version !== undefined) updatePayload.version = data.version;
    if (data.author !== undefined) updatePayload.author = data.author;
    if (data.tags !== undefined) updatePayload.tags = JSON.stringify(data.tags);
    if (data.folders !== undefined) updatePayload.folders = JSON.stringify(data.folders);
    if (data.requests !== undefined) updatePayload.requests = JSON.stringify(data.requests);
    if (data.mockConfig !== undefined) updatePayload.mockConfig = JSON.stringify(data.mockConfig);
    if (data.diffSummary !== undefined) updatePayload.diffSummary = JSON.stringify(data.diffSummary);

    const updated = await (prisma as any).collectionVersion.update({
      where: { id },
      data: updatePayload
    });
    return this.parseVersion(updated);
  }

  async delete(id: string) {
    const deleted = await (prisma as any).collectionVersion.delete({
      where: { id }
    });
    return this.parseVersion(deleted);
  }
}
