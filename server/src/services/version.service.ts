import { VersionRepository, VersionData } from '../repositories/version.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { v4 as uuidv4 } from 'uuid';

export class VersionService {
  private versionRepository = new VersionRepository();
  private collectionRepository = new CollectionRepository();

  async getVersionsByCollection(collectionId: string) {
    return this.versionRepository.findByCollectionId(collectionId);
  }

  async getVersionsByWorkspace(workspaceId: string) {
    return this.versionRepository.findByWorkspaceId(workspaceId);
  }

  async getVersionById(id: string) {
    return this.versionRepository.findById(id);
  }

  async createVersion(data: Partial<VersionData>) {
    if (!data.workspaceId || !data.collectionId || !data.version) {
      throw new Error('WorkspaceId, collectionId, and version are required');
    }

    const versionId = data.id || uuidv4();
    const tags = Array.isArray(data.tags) ? [...data.tags] : ['latest'];

    // If marked as latest, unmark other versions for this collection
    if (tags.includes('latest')) {
      const existing = await this.versionRepository.findByCollectionId(data.collectionId);
      for (const ex of existing) {
        if (ex.tags && Array.isArray(ex.tags) && ex.tags.includes('latest')) {
          const updatedTags = ex.tags.filter((t: string) => t !== 'latest');
          await this.versionRepository.update(ex.id, { tags: updatedTags });
        }
      }
    }

    const fullData: VersionData = {
      id: versionId,
      workspaceId: data.workspaceId,
      collectionId: data.collectionId,
      collectionName: data.collectionName || 'Collection',
      version: data.version,
      name: data.name || null,
      description: data.description || null,
      author: data.author || null,
      folders: data.folders || [],
      requests: data.requests || [],
      mockConfig: data.mockConfig || {},
      tags: tags,
      diffSummary: data.diffSummary || null,
    };

    return this.versionRepository.create(fullData);
  }

  async updateVersion(id: string, data: Partial<VersionData>) {
    return this.versionRepository.update(id, data);
  }

  async rollbackCollectionToVersion(versionId: string) {
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new Error('Version snapshot not found');
    }

    // Update parent collection with snapshot's folders, requests, mockConfig
    const updatedCollection = await this.collectionRepository.update(version.collectionId, {
      folders: version.folders || [],
      requests: version.requests || [],
      mockConfig: version.mockConfig || {},
    });

    return {
      success: true,
      message: `Collection successfully rolled back to version ${version.version}`,
      collection: updatedCollection,
      version: version
    };
  }

  async forkVersionAsCollection(versionId: string, newCollectionName?: string) {
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new Error('Version snapshot not found');
    }

    const newName = newCollectionName || `${version.collectionName} (${version.version} Fork)`;
    const newCollection = await this.collectionRepository.create({
      id: uuidv4(),
      workspaceId: version.workspaceId,
      name: newName,
      description: `Forked from ${version.collectionName} version ${version.version}.`,
      color: '#3b82f6',
      folders: version.folders || [],
      requests: version.requests || [],
      mockConfig: version.mockConfig || {},
    });

    return newCollection;
  }

  async deleteVersion(id: string) {
    return this.versionRepository.delete(id);
  }
}
