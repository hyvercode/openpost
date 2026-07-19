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
  private parseCollection(c: any) {
    return {
      ...c,
      mockConfig: c.mockConfig ? JSON.parse(c.mockConfig) : {},
      folders: c.folders ? JSON.parse(c.folders) : [],
      requests: c.requests ? JSON.parse(c.requests) : []
    };
  }

  async findByWorkspaceId(workspaceId: string) {
    const collections = await prisma.collection.findMany({
      where: { workspaceId }
    });
    return collections.map(this.parseCollection);
  }

  async create(data: CollectionData) {
    const created = await prisma.collection.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description || null,
        color: data.color || null,
        icon: data.icon || null,
        position: data.position || 0,
        mockConfig: data.mockConfig ? JSON.stringify(data.mockConfig) : "{}",
        folders: data.folders ? JSON.stringify(data.folders) : "[]",
        requests: data.requests ? JSON.stringify(data.requests) : "[]"
      }
    });
    return this.parseCollection(created);
  }

  async update(id: string, data: Partial<CollectionData>) {
    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.mockConfig !== undefined && { mockConfig: JSON.stringify(data.mockConfig) }),
        ...(data.folders !== undefined && { folders: JSON.stringify(data.folders) }),
        ...(data.requests !== undefined && { requests: JSON.stringify(data.requests) })
      }
    });
    return this.parseCollection(updated);
  }

  async delete(id: string) {
    const deleted = await prisma.collection.delete({
      where: { id }
    });
    return this.parseCollection(deleted);
  }
}
