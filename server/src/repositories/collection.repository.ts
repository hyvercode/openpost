import { prisma } from '../db';
import { encField, decField } from '../utils/secretCrypto';

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
  shareVisibility?: "public" | "private";
  mockVisibility?: "public" | "private";
  docVisibility?: "public" | "private";
  /** Optimistic-locking fields (never persisted directly). */
  expectedUpdatedAt?: string;
  force?: boolean;
}

export class CollectionRepository {
  private parseCollection(c: any) {
    return {
      ...c,
      mockConfig: c.mockConfig ? JSON.parse(c.mockConfig) : {},
      folders: c.folders ? JSON.parse(c.folders) : [],
      requests: c.requests ? JSON.parse(decField(c.requests)) : []
    };
  }

  async findByWorkspaceId(workspaceId: string) {
    const collections = await prisma.collection.findMany({
      where: { workspaceId, deletedAt: null }
    });
    return collections.map(this.parseCollection);
  }

  async findById(id: string) {
    const collection = await prisma.collection.findUnique({
      where: { id }
    });
    if (!collection || (collection as any).deletedAt) return null;
    return this.parseCollection(collection);
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
        requests: encField(data.requests ? JSON.stringify(data.requests) : "[]"),
        shareVisibility: data.shareVisibility || "private",
        mockVisibility: data.mockVisibility || "private",
        docVisibility: data.docVisibility || "private"
      }
    });
    return this.parseCollection(created);
  }

  async update(id: string, data: Partial<CollectionData>) {
    // Optimistic locking (PRD #51): when the client sends the updatedAt it
    // last saw, reject stale writes with the current record for conflict UI.
    if (data.expectedUpdatedAt && !data.force) {
      const current = await prisma.collection.findUnique({ where: { id } });
      const currentTs = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const expectedTs = new Date(data.expectedUpdatedAt).getTime();
      if (current && !Number.isNaN(expectedTs) && currentTs !== expectedTs) {
        const err: any = new Error('Conflict: collection changed on server');
        err.code = 'CONFLICT';
        err.current = this.parseCollection(current);
        throw err;
      }
    }
    const { expectedUpdatedAt: _e, force: _f, ...rest } = data;
    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(rest.name !== undefined && { name: rest.name }),
        ...(rest.description !== undefined && { description: rest.description }),
        ...(rest.color !== undefined && { color: rest.color }),
        ...(rest.icon !== undefined && { icon: rest.icon }),
        ...(rest.position !== undefined && { position: rest.position }),
        ...(rest.mockConfig !== undefined && { mockConfig: JSON.stringify(rest.mockConfig) }),
        ...(rest.folders !== undefined && { folders: JSON.stringify(rest.folders) }),
        ...(rest.requests !== undefined && { requests: encField(JSON.stringify(rest.requests)) }),
        ...(rest.shareVisibility !== undefined && { shareVisibility: rest.shareVisibility }),
        ...(rest.mockVisibility !== undefined && { mockVisibility: rest.mockVisibility }),
        ...(rest.docVisibility !== undefined && { docVisibility: rest.docVisibility })
      }
    });
    return this.parseCollection(updated);
  }

  /** Soft delete (PRD #50): record stays recoverable via restore(). */
  async delete(id: string) {
    const deleted = await prisma.collection.update({
      where: { id },
      data: { deletedAt: new Date() } as any,
    });
    return this.parseCollection(deleted);
  }

  async restore(id: string) {
    const restored = await prisma.collection.update({
      where: { id },
      data: { deletedAt: null } as any,
    });
    return this.parseCollection(restored);
  }

  async findTrashByWorkspaceId(workspaceId: string) {
    const collections = await prisma.collection.findMany({
      where: { workspaceId, deletedAt: { not: null } } as any,
    });
    return collections.map(this.parseCollection);
  }
}
