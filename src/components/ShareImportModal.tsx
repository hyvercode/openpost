import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../lib/api';
import { ApiCollection, ApiFolder, RequestItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Share2, Folder, FileCode, Check, AlertCircle, Loader, ArrowRight } from 'lucide-react';

export function ShareImportModal() {
  const { 
    workspaces, 
    collections, 
    setCollections, 
    currentWorkspace, 
    setCurrentWorkspace,
    addToast 
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shareType, setShareType] = useState<'collection' | 'folder' | 'request' | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  // Fetched shared details
  const [sharedCollection, setSharedCollection] = useState<ApiCollection | null>(null);
  const [sharedFolder, setSharedFolder] = useState<ApiFolder | null>(null);
  const [sharedRequest, setSharedRequest] = useState<RequestItem | null>(null);

  // Targets for importing
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>('');
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [targetFolderId, setTargetFolderId] = useState<string>('root'); // 'root' or specific folderId

  // Automatically select target workspace when workspaces are loaded
  useEffect(() => {
    if (!targetWorkspaceId && workspaces.length > 0) {
      if (currentWorkspace) {
        setTargetWorkspaceId(currentWorkspace.id);
      } else {
        setTargetWorkspaceId(workspaces[0].id);
      }
    }
  }, [workspaces, currentWorkspace, targetWorkspaceId]);

  // Automatically select target collection when collections are loaded
  useEffect(() => {
    if (!targetCollectionId && collections.length > 0) {
      setTargetCollectionId(collections[0].id);
    }
  }, [collections, targetCollectionId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sType = params.get('share_type') as 'collection' | 'folder' | 'request' | null;
    const sId = params.get('share_id');
    const cId = params.get('collection_id');

    if (sType && sId) {
      setShareType(sType);
      setShareId(sId);
      setCollectionId(cId);
      setIsOpen(true);
      fetchSharedResource(sType, sId, cId);
    }
  }, []);

  const fetchSharedResource = async (type: string, id: string, parentCollectionId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const targetColId = type === 'collection' ? id : parentCollectionId;
      if (!targetColId) {
        throw new Error('Missing collection context for this shared item.');
      }

      const collectionData = await apiService.getSharedCollection(targetColId);
      setSharedCollection(collectionData);

      if (type === 'collection') {
        // Default target workspace to current or first
        if (currentWorkspace) {
          setTargetWorkspaceId(currentWorkspace.id);
        } else if (workspaces.length > 0) {
          setTargetWorkspaceId(workspaces[0].id);
        }
      } else if (type === 'folder') {
        const folder = collectionData.folders?.find((f: ApiFolder) => f.id === id);
        if (!folder) {
          throw new Error('Shared folder could not be found in the collection.');
        }
        setSharedFolder(folder);
        // Default target collection to first available in current workspace
        if (collections.length > 0) {
          setTargetCollectionId(collections[0].id);
        }
      } else if (type === 'request') {
        const req = collectionData.requests?.find((r: RequestItem) => r.id === id);
        if (!req) {
          throw new Error('Shared request could not be found in the collection.');
        }
        setSharedRequest(req);
        // Default target collection to first available in current workspace
        if (collections.length > 0) {
          setTargetCollectionId(collections[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load shared resource:', err);
      setError(err.response?.data?.error || err.message || 'Failed to retrieve shared information.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Clear url query params safely
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  const handleImport = async () => {
    if (!shareType || !sharedCollection) return;

    setLoading(true);
    setError(null);

    try {
      if (shareType === 'collection') {
        if (!targetWorkspaceId) {
          throw new Error('Please select a target workspace.');
        }

        // Duplicate the entire collection with new IDs to prevent conflicts
        const newColId = uuidv4();
        const idMap = new Map<string, string>();

        const duplicatedFolders = (sharedCollection.folders || []).map((f: ApiFolder) => {
          const newId = uuidv4();
          idMap.set(f.id, newId);
          return {
            ...f,
            id: newId,
          };
        });

        // Remap parent IDs
        const finalFolders = duplicatedFolders.map((f: any) => ({
          ...f,
          parentId: f.parentId ? (idMap.get(f.parentId) || null) : null
        }));

        const finalRequests = (sharedCollection.requests || []).map((r: RequestItem) => {
          const newId = uuidv4();
          return {
            ...r,
            id: newId,
            collectionId: newColId,
            workspaceId: targetWorkspaceId,
            folderId: r.folderId ? (idMap.get(r.folderId) || null) : null
          };
        });

        const newCollection: ApiCollection = {
          ...sharedCollection,
          id: newColId,
          workspaceId: targetWorkspaceId,
          name: `${sharedCollection.name} (Shared)`,
          folders: finalFolders,
          requests: finalRequests,
          position: collections.length
        };

        const created = await apiService.createCollection(newCollection);
        
        // If imported to currently active workspace, add to local store state
        if (currentWorkspace && currentWorkspace.id === targetWorkspaceId) {
          setCollections([...collections, created]);
        } else {
          // Switch to the target workspace so the user sees the imported collection
          const targetWS = workspaces.find(w => w.id === targetWorkspaceId);
          if (targetWS) {
            setCurrentWorkspace(targetWS);
          }
        }

        addToast(`Successfully imported collection "${created.name}"!`, 'success');
        handleClose();

      } else if (shareType === 'folder' && sharedFolder) {
        if (!targetCollectionId) {
          throw new Error('Please select a target collection.');
        }

        const targetCol = collections.find(c => c.id === targetCollectionId);
        if (!targetCol) {
          throw new Error('Target collection not found.');
        }

        // We need to recursively extract the shared folder, all its child folders, and its requests.
        const idMap = new Map<string, string>();
        const folderIdsToProcess = [sharedFolder.id];
        const foldersToDuplicate: ApiFolder[] = [];
        const requestIdsToDuplicate = new Set<string>();

        // Gather all nested subfolders recursively
        while (folderIdsToProcess.length > 0) {
          const currId = folderIdsToProcess.pop()!;
          const f = sharedCollection.folders?.find((fold: ApiFolder) => fold.id === currId);
          if (f && !foldersToDuplicate.some(dup => dup.id === f.id)) {
            foldersToDuplicate.push(f);
            
            // Find child folders
            const subfolders = (sharedCollection.folders || []).filter((sub: ApiFolder) => sub.parentId === currId);
            subfolders.forEach((sf: ApiFolder) => folderIdsToProcess.push(sf.id));

            // Find child requests
            const childRequests = (sharedCollection.requests || []).filter((req: RequestItem) => req.folderId === currId);
            childRequests.forEach((cr: RequestItem) => requestIdsToDuplicate.add(cr.id));
          }
        }

        // Generate new UUIDs for duplicated folders
        const duplicatedFoldersMapped = foldersToDuplicate.map(f => {
          const newId = uuidv4();
          idMap.set(f.id, newId);
          return {
            ...f,
            id: newId,
          };
        });

        // Remap parent IDs. The root parent ID of the shared folder becomes targetFolderId or null
        const finalFolders = duplicatedFoldersMapped.map(f => {
          const origFolder = foldersToDuplicate.find(orig => orig.id === f.id || idMap.get(orig.id) === f.id);
          const origParentId = origFolder?.parentId;

          let newParentId: string | null = null;
          if (origFolder?.id === sharedFolder.id) {
            newParentId = targetFolderId === 'root' ? null : targetFolderId;
          } else if (origParentId) {
            newParentId = idMap.get(origParentId) || null;
          }

          return {
            ...f,
            parentId: newParentId,
            position: (targetCol.folders || []).filter(item => item.parentId === newParentId).length
          };
        });

        // Duplicate and remap requests
        const duplicatedRequests = (sharedCollection.requests || [])
          .filter((r: RequestItem) => r.folderId && requestIdsToDuplicate.has(r.id))
          .map((r: RequestItem) => {
            const newId = uuidv4();
            return {
              ...r,
              id: newId,
              collectionId: targetCollectionId,
              workspaceId: targetCol.workspaceId,
              folderId: r.folderId ? (idMap.get(r.folderId) || null) : null
            };
          });

        // Save back into collection
        const updatedFolders = [...(targetCol.folders || []), ...finalFolders];
        const updatedRequests = [...(targetCol.requests || []), ...duplicatedRequests];

        await apiService.updateCollection(targetCollectionId, {
          folders: updatedFolders,
          requests: updatedRequests
        });

        setCollections(collections.map(c => c.id === targetCollectionId ? { ...c, folders: updatedFolders, requests: updatedRequests } : c));
        addToast(`Successfully imported folder "${sharedFolder.name}"!`, 'success');
        handleClose();

      } else if (shareType === 'request' && sharedRequest) {
        if (!targetCollectionId) {
          throw new Error('Please select a target collection.');
        }

        const targetCol = collections.find(c => c.id === targetCollectionId);
        if (!targetCol) {
          throw new Error('Target collection not found.');
        }

        const newRequest: RequestItem = {
          ...sharedRequest,
          id: uuidv4(),
          collectionId: targetCollectionId,
          workspaceId: targetCol.workspaceId,
          folderId: targetFolderId === 'root' ? null : targetFolderId
        };

        const updatedRequests = [...(targetCol.requests || []), newRequest];

        await apiService.updateCollection(targetCollectionId, {
          requests: updatedRequests
        });

        setCollections(collections.map(c => c.id === targetCollectionId ? { ...c, requests: updatedRequests } : c));
        addToast(`Successfully imported request "${newRequest.name}"!`, 'success');
        handleClose();
      }
    } catch (err: any) {
      console.error('Failed to import shared resource:', err);
      setError(err.message || 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Selected collection for folder/request re-renders to get target folders
  const currentTargetCollection = collections.find(c => c.id === targetCollectionId);
  const targetFoldersList = currentTargetCollection?.folders || [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in backdrop-blur-sm">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans text-xs max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-[var(--bg-surface)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
            <Share2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Import Shared Resource</h2>
            <p className="text-[10px] text-[var(--text-secondary)]">Fetch and duplicate shared API workspace items safely.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {loading && !sharedCollection && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader className="w-8 h-8 animate-spin text-[var(--primary)]" />
              <p className="text-[var(--text-secondary)] font-medium">Fetching sharing metadata from server...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Import Error</span>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && sharedCollection && (
            <div className="space-y-4">
              
              {/* Item Info Box */}
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                  Shared {shareType} Info
                </span>

                {shareType === 'collection' && (
                  <div className="flex items-start gap-2.5">
                    <Folder className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm">{sharedCollection.name}</h3>
                      <p className="text-[var(--text-secondary)] mt-1">{sharedCollection.description || 'No description provided.'}</p>
                      <div className="flex gap-2.5 mt-2.5 text-[10px] text-[var(--text-secondary)] font-semibold">
                        <span>📁 {(sharedCollection.folders || []).length} Folders</span>
                        <span>•</span>
                        <span>⚡ {(sharedCollection.requests || []).length} Requests</span>
                      </div>
                    </div>
                  </div>
                )}

                {shareType === 'folder' && sharedFolder && (
                  <div className="flex items-start gap-2.5">
                    <Folder className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)] text-sm">{sharedFolder.name}</h3>
                      <p className="text-[var(--text-secondary)] mt-1">From collection: {sharedCollection.name}</p>
                    </div>
                  </div>
                )}

                {shareType === 'request' && sharedRequest && (
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        sharedRequest.method === 'GET' ? 'bg-green-500/15 text-[var(--text-get)]' :
                        sharedRequest.method === 'POST' ? 'bg-blue-500/15 text-[var(--text-post)]' :
                        sharedRequest.method === 'PUT' ? 'bg-yellow-500/15 text-[var(--text-put)]' :
                        sharedRequest.method === 'DELETE' ? 'bg-red-500/15 text-[var(--text-delete)]' : 'bg-gray-500/15 text-gray-400'
                      }`}>
                        {sharedRequest.method}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">{sharedRequest.name}</h3>
                      <p className="text-[var(--text-secondary)] font-mono text-[10px] truncate mt-1 bg-[var(--bg-input)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                        {sharedRequest.url || 'No URL specified'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination Form */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                  Select Destination
                </span>

                {/* COLLECTION TARGET: Select Workspace */}
                {shareType === 'collection' && (
                  <div className="space-y-1.5">
                    <label className="text-[var(--text-secondary)] font-semibold block">Workspace</label>
                    <select
                      value={targetWorkspaceId}
                      onChange={(e) => setTargetWorkspaceId(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer font-semibold"
                    >
                      <option value="" disabled>-- Select Workspace --</option>
                      {workspaces.map(ws => (
                        <option key={ws.id} value={ws.id}>{ws.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* FOLDER / REQUEST TARGET: Select Collection */}
                {(shareType === 'folder' || shareType === 'request') && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[var(--text-secondary)] font-semibold block">Target Collection</label>
                      <select
                        value={targetCollectionId}
                        onChange={(e) => {
                          setTargetCollectionId(e.target.value);
                          setTargetFolderId('root');
                        }}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer font-semibold"
                      >
                        <option value="" disabled>-- Select Collection --</option>
                        {collections.map(col => (
                          <option key={col.id} value={col.id}>{col.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* FOLDER / REQUEST TARGET: Select Parent Folder (Optionally) */}
                    {targetCollectionId && (
                      <div className="space-y-1.5 animate-slide-down">
                        <label className="text-[var(--text-secondary)] font-semibold block">
                          Target Folder {shareType === 'folder' ? '(Optional Parent)' : ''}
                        </label>
                        <select
                          value={targetFolderId}
                          onChange={(e) => setTargetFolderId(e.target.value)}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer font-semibold"
                        >
                          <option value="root">Root Collection Level</option>
                          {targetFoldersList.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-bold transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          
          <button
            onClick={handleImport}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-[var(--primary)]/20"
            disabled={loading || !sharedCollection}
          >
            {loading ? (
              <>
                <Loader className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <span>Import Item</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
