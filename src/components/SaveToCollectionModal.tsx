import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Folder, FolderPlus, Plus, Save, Check, FileCode, Layers } from 'lucide-react';
import { apiService } from '../lib/api';
import { RequestItem, ApiCollection, ApiFolder } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../utils';

export function SaveToCollectionModal() {
  const {
    isSaveToCollectionModalOpen,
    setIsSaveToCollectionModalOpen,
    requestToSaveModal,
    setRequestToSaveModal,
    collections,
    setCollections,
    currentWorkspace,
    activeRequest,
    setActiveRequest,
    draftRequests,
    removeDraftRequest,
    updateDraftRequest,
    openTabs,
    setOpenTabs,
    addToast
  } = useStore();

  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSaveToCollectionModalOpen && requestToSaveModal) {
      setRequestName(requestToSaveModal.name || 'Untitled Request');
      setRequestDescription(requestToSaveModal.description || '');
      setSelectedCollectionId(requestToSaveModal.collectionId || collections[0]?.id || '');
      setSelectedFolderId(requestToSaveModal.folderId || '');
      setIsCreatingNewCollection(false);
      setNewCollectionName('');
    }
  }, [isSaveToCollectionModalOpen, requestToSaveModal, collections]);

  if (!isSaveToCollectionModalOpen || !requestToSaveModal) return null;

  const currentSelectedCollection = collections.find(c => c.id === selectedCollectionId);
  const availableFolders = currentSelectedCollection?.folders || [];

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim() || !currentWorkspace) return;
    try {
      const newCol: Omit<ApiCollection, 'id'> = {
        name: newCollectionName.trim(),
        workspaceId: currentWorkspace.id,
        requests: [],
        folders: []
      };
      const created = await apiService.createCollection(newCol);
      setCollections([...collections, created]);
      setSelectedCollectionId(created.id);
      setIsCreatingNewCollection(false);
      setNewCollectionName('');
      addToast(`Collection "${created.name}" created`, 'success', 2000);
    } catch (err) {
      console.error('Failed to create collection:', err);
      addToast('Failed to create collection', 'error');
    }
  };

  const handleSaveToCollection = async () => {
    if (!selectedCollectionId) {
      addToast('Please select or create a collection first', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const targetCol = collections.find(c => c.id === selectedCollectionId);
      if (!targetCol) throw new Error('Target collection not found');

      const isMoveFromOtherCol = requestToSaveModal.collectionId && requestToSaveModal.collectionId !== selectedCollectionId;
      const oldColId = requestToSaveModal.collectionId;

      // Updated Request item
      const updatedReq: RequestItem = {
        ...requestToSaveModal,
        name: requestName.trim() || 'Untitled Request',
        description: requestDescription.trim(),
        collectionId: selectedCollectionId,
        folderId: selectedFolderId || null,
        workspaceId: currentWorkspace?.id || requestToSaveModal.workspaceId
      };

      // 1. If moved from another collection, remove from old collection
      let updatedCollections = [...collections];
      if (isMoveFromOtherCol) {
        updatedCollections = updatedCollections.map(c => {
          if (c.id === oldColId) {
            return {
              ...c,
              requests: c.requests.filter(r => r.id !== updatedReq.id)
            };
          }
          return c;
        });
      }

      // 2. Add or update in target collection
      updatedCollections = updatedCollections.map(c => {
        if (c.id === selectedCollectionId) {
          const exists = c.requests.some(r => r.id === updatedReq.id);
          const newRequests = exists
            ? c.requests.map(r => r.id === updatedReq.id ? updatedReq : r)
            : [...c.requests, updatedReq];
          return {
            ...c,
            requests: newRequests
          };
        }
        return c;
      });

      // Update state in store
      setCollections(updatedCollections);

      // Persist to backend database
      const finalTargetCol = updatedCollections.find(c => c.id === selectedCollectionId)!;
      await apiService.updateCollection(selectedCollectionId, finalTargetCol);

      if (isMoveFromOtherCol) {
        const finalOldCol = updatedCollections.find(c => c.id === oldColId);
        if (finalOldCol) {
          await apiService.updateCollection(oldColId, finalOldCol);
        }
      }

      // 3. If was in draft requests, remove from drafts
      removeDraftRequest(updatedReq.id);

      // 4. Update activeRequest if current
      if (activeRequest?.id === updatedReq.id) {
        setActiveRequest(updatedReq);
      }

      // 5. Update openTab name & method if open
      setOpenTabs(openTabs.map(tab => {
        if (tab.id === updatedReq.id) {
          return {
            ...tab,
            name: updatedReq.name,
            method: updatedReq.method
          };
        }
        return tab;
      }));

      addToast(`Request "${updatedReq.name}" saved to collection "${targetCol.name}"`, 'success', 2500);
      setIsSaveToCollectionModalOpen(false);
      setRequestToSaveModal(null);
    } catch (err) {
      console.error('Failed to save request to collection:', err);
      addToast('Failed to save request to collection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {requestToSaveModal.collectionId ? 'Move Request to Collection' : 'Save Request to Collection'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Organize your standalone request into a collection and folder.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsSaveToCollectionModalOpen(false);
              setRequestToSaveModal(null);
            }}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 bg-[var(--bg-panel)]">
          {/* Request Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Request Name
            </label>
            <input 
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="e.g. Get User Profile"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              placeholder="Add notes or API documentation details..."
              className="w-full px-3 py-2 text-xs bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          {/* Destination Collection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Select Destination Collection
              </label>
              {!isCreatingNewCollection && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCollection(true)}
                  className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  New Collection
                </button>
              )}
            </div>

            {isCreatingNewCollection ? (
              <div className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg">
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="New Collection Name..."
                  className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none px-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateNewCollection}
                  disabled={!newCollectionName.trim()}
                  className="px-2.5 py-1 bg-[var(--primary)] text-white text-[11px] font-bold rounded hover:opacity-90 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCollection(false)}
                  className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1"
                >
                  Cancel
                </button>
              </div>
            ) : collections.length === 0 ? (
              <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-secondary)] flex items-center justify-between">
                <span>No collections available.</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCollection(true)}
                  className="px-2.5 py-1 bg-[var(--primary)] text-white text-[11px] font-bold rounded"
                >
                  Create One
                </button>
              </div>
            ) : (
              <select
                value={selectedCollectionId}
                onChange={(e) => {
                  setSelectedCollectionId(e.target.value);
                  setSelectedFolderId('');
                }}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                {collections.map(c => (
                  <option key={c.id} value={c.id}>
                    📁 {c.name} ({c.requests?.length || 0} requests)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Optional Folder Selection */}
          {availableFolders.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Select Folder (Optional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value="">(Root level of collection)</option>
                {availableFolders.map((f: ApiFolder) => (
                  <option key={f.id} value={f.id}>
                    📂 {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIsSaveToCollectionModalOpen(false);
              setRequestToSaveModal(null);
            }}
            className="px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveToCollection}
            disabled={isSaving || !selectedCollectionId}
            className="px-4 py-1.5 bg-[var(--primary)] hover:opacity-90 text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save to Collection'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
