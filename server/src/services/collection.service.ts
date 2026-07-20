import { CollectionRepository, CollectionData } from '../repositories/collection.repository';
import { v4 as uuidv4 } from 'uuid';

export class CollectionService {
  private collectionRepository = new CollectionRepository();

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
      requests: data.requests
    };

    return this.collectionRepository.create(fullData);
  }

  async updateCollection(id: string, data: Partial<CollectionData>) {
    return this.collectionRepository.update(id, data);
  }

  async deleteCollection(id: string) {
    return this.collectionRepository.delete(id);
  }
}
