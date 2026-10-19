import { ApiCollection, Environment } from '../types';
import { exportToPostman } from './postmanExport';

export function downloadJson(data: any, filename: string) {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportWorkspaceJSON(
  workspaceId: string, 
  collections: ApiCollection[], 
  environments: Environment[], 
  workspaceName?: string
) {
  const exportData = {
    type: 'apitester_export',
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaceId,
    workspaceName: workspaceName || 'Workspace',
    collections,
    environments,
  };
  
  const formattedDate = new Date().toISOString().split('T')[0];
  const cleanWsName = (workspaceName || 'workspace').replace(/\s+/g, '_').toLowerCase();
  downloadJson(exportData, `openpost_workspace_backup_${cleanWsName}_${formattedDate}.json`);
}

export function exportSingleCollectionJSON(collection: ApiCollection) {
  const exportData = {
    type: 'apitester_collection_export',
    version: 1,
    exportedAt: new Date().toISOString(),
    collection,
  };
  
  const formattedDate = new Date().toISOString().split('T')[0];
  const cleanName = (collection.name || 'collection').replace(/\s+/g, '_').toLowerCase();
  downloadJson(exportData, `openpost_collection_${cleanName}_${formattedDate}.json`);
}

export function exportAllPostmanJSON(collections: ApiCollection[], workspaceName?: string) {
  const exportData = exportToPostman(collections);
  const formattedDate = new Date().toISOString().split('T')[0];
  const cleanWsName = (workspaceName || 'workspace').replace(/\s+/g, '_').toLowerCase();
  downloadJson(exportData, `openpost_postman_collection_${cleanWsName}_${formattedDate}.json`);
}
