import { CollectionRepository, CollectionData } from '../repositories/collection.repository';
import { VersionRepository } from '../repositories/version.repository';
import { v4 as uuidv4 } from 'uuid';
import { audit } from './audit.service';

const AUTO_SNAPSHOT_CAP = 30;

interface ReqDiff {
  added: number;
  removed: number;
  modified: number;
  breaking: number;
}

/** Minimal contract diff (PRD #55): compare request sets by id/method/url. */
function diffRequests(oldReqs: any[], newReqs: any[]): ReqDiff {
  const key = (r: any) => r?.id || `${r?.method || ''} ${r?.url || ''}`;
  const oldMap = new Map(oldReqs.map((r) => [key(r), r]));
  const newMap = new Map(newReqs.map((r) => [key(r), r]));
  let added = 0;
  let removed = 0;
  let modified = 0;
  let breaking = 0;
  for (const [k, nr] of newMap) {
    const or = oldMap.get(k);
    if (!or) {
      added++;
      continue;
    }
    const om = String(or.method || '').toUpperCase();
    const nm = String(nr.method || '').toUpperCase();
    const ou = String(or.url || '');
    const nu = String(nr.url || '');
    if (om !== nm || ou !== nu) {
      modified++;
      // Method change or path removal on same id = breaking for consumers.
      if (om !== nm) breaking++;
    }
  }
  for (const k of oldMap.keys()) {
    if (!newMap.has(k)) {
      removed++;
      breaking++; // removed endpoint breaks consumers
    }
  }
  return { added, removed, modified, breaking };
}

export class CollectionService {
  private collectionRepository = new CollectionRepository();
  private versionRepository = new VersionRepository();

  async getCollectionsByWorkspace(workspaceId: string) {
    return this.collectionRepository.findByWorkspaceId(workspaceId);
  }

  async getCollectionById(id: string) {
    return this.collectionRepository.findById(id);
  }

  async createCollection(data: Partial<CollectionData>) {
    if (!data.workspaceId || !data.name) {
      throw new Error('WorkspaceId and name are required');
    }

    const fullData: CollectionData = {
      id: data.id || uuidv4(),
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      position: data.position,
      mockConfig: data.mockConfig,
      folders: data.folders,
      requests: data.requests,
      shareVisibility: data.shareVisibility,
      mockVisibility: data.mockVisibility,
      docVisibility: data.docVisibility
    };

    return this.collectionRepository.create(fullData);
  }

  async updateCollection(id: string, data: Partial<CollectionData>) {
    // Auto-snapshot (PRD #54 fase 1): preserve the pre-update state so every
    // change is recoverable and diffable. Failures here must not block the
    // update itself.
    const before = await this.collectionRepository.findById(id).catch(() => null);
    const updated = await this.collectionRepository.update(id, data);
    if (before) {
      this.snapshotAuto(before, updated).catch((e) => console.error('[autosnapshot] failed:', e?.message));
    }
    return updated;
  }

  private async snapshotAuto(before: any, after?: any): Promise<void> {
    const existing = await this.versionRepository.findByCollectionId(before.id);
    const autoSnaps = existing.filter((v: any) => Array.isArray(v.tags) && v.tags.includes('auto'));
    // Prune oldest auto snapshots beyond cap.
    if (autoSnaps.length >= AUTO_SNAPSHOT_CAP) {
      const sorted = [...autoSnaps].sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const excess = sorted.slice(0, autoSnaps.length - AUTO_SNAPSHOT_CAP + 1);
      for (const old of excess) {
        await this.versionRepository.delete(old.id).catch(() => {});
      }
    }
    await this.versionRepository.create({
      id: uuidv4(),
      workspaceId: before.workspaceId,
      collectionId: before.id,
      collectionName: before.name,
      version: `auto-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`,
      name: 'Auto snapshot',
      description: 'Automatic snapshot before update',
      author: 'system',
      folders: before.folders || [],
      requests: before.requests || [],
      mockConfig: before.mockConfig || {},
      tags: ['auto'],
      diffSummary: after ? diffRequests(before.requests || [], after.requests || []) : null,
    });
  }

  async deleteCollection(id: string, actorUserId?: string) {
    const existing = await this.collectionRepository.findById(id);
    const result = await this.collectionRepository.delete(id);
    await audit('collection.delete', {
      workspaceId: existing?.workspaceId,
      userId: actorUserId,
      entityType: 'collection',
      entityId: id,
      detail: existing?.name,
    });
    return result;
  }

  async restoreCollection(id: string, actorUserId?: string) {
    const result = await this.collectionRepository.restore(id);
    const record = await this.collectionRepository.findById(id);
    await audit('collection.restore', {
      workspaceId: record?.workspaceId,
      userId: actorUserId,
      entityType: 'collection',
      entityId: id,
      detail: record?.name,
    });
    return result;
  }

  async getTrashByWorkspace(workspaceId: string) {
    return this.collectionRepository.findTrashByWorkspaceId(workspaceId);
  }
}
