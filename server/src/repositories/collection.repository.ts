import { prisma } from '../db';

export interface CollectionData {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  position?: number;
  mockConfig?: any;
  folders?: any;
  requests?: any;
}

export class CollectionRepository {
  async findByWorkspaceId(workspaceId: string) {
    return prisma.collection.findMany({
      where: { workspaceId }
    });
  }

  async create(data: CollectionData) {
    return prisma.collection.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description || null,
        color: data.color || null,
        icon: data.icon || null,
        position: data.position || 0,
        mockConfig: data.mockConfig ? JSON.parse(JSON.stringify(data.mockConfig)) : {},
        folders: data.folders ? JSON.parse(JSON.stringify(data.folders)) : [],
        requests: data.requests ? JSON.parse(JSON.stringify(data.requests)) : []
      }
    });
  }

  async update(id: string, data: Partial<CollectionData>) {
    return prisma.collection.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.mockConfig !== undefined && { mockConfig: JSON.parse(JSON.stringify(data.mockConfig)) }),
        ...(data.folders !== undefined && { folders: JSON.parse(JSON.stringify(data.folders)) }),
        ...(data.requests !== undefined && { requests: JSON.parse(JSON.stringify(data.requests)) })
      }
    });
  }

  async delete(id: string) {
    return prisma.collection.delete({
      where: { id }
    });
  }
}
