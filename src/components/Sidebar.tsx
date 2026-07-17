import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Folder, Play, Plus, Settings2, Users, Upload, Download, MoreVertical, Trash2, ChevronRight, ChevronDown, Edit2, Search, Copy, ChevronLeft, Palette, Rocket, Globe, ExternalLink, BookOpen } from 'lucide-react';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ApiCollection, RequestItem } from '../types';
import { PromptModal } from './PromptModal';
import { ConfirmModal } from './ConfirmModal';
import { CustomizeCollectionModal, getCollectionIcon } from './CustomizeCollectionModal';

export function Sidebar() {
  const { 
    collections, 
    environments, 
    deployments,
    activeRequest, 
    setActiveRequest, 
    setActiveView, 
    setEditingEnvironment, 
    currentWorkspace, 
    openTab,
    setSidebarCollapsed,
    sidebarWidth,
    user,
    workspaces,
    setCurrentWorkspace
  } = useStore();
  const [activeTab, setActiveTab] = useState<'collections' | 'environments' | 'deployments'>('collections');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  
  const [modal, setModal] = useState<{isOpen: boolean, title: string, type: 'collection'|'request'|'environment'|'folder'|'rename_collection'|'rename_folder'|'rename_request'|'workspace'|'rename_workspace'|'invite_member'|'deploy', targetId?: string, targetFolderId?: string, targetRequestId?: string, initialValue?: string}>({isOpen: false, title: '', type: 'collection'});
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [customizationModal, setCustomizationModal] = useState<{
    isOpen: boolean;
    collectionId: string;
    name: string;
    color: string;
    icon: string;
  }>({
    isOpen: false,
    collectionId: '',
    name: '',
    color: '',
    icon: ''
  });

  const { filteredCollections, filteredEnvironments } = useMemo(() => {
    if (!searchQuery.trim()) return { filteredCollections: collections, filteredEnvironments: environments };
    const lowerQuery = searchQuery.toLowerCase();

    const filteredEnvironments = environments.filter(env => env.name.toLowerCase().includes(lowerQuery));

    const filteredCollections = collections.map(collection => {
      const collectionMatches = collection.name.toLowerCase().includes(lowerQuery);

      const matchingFolders = new Set<string>();
      const matchingRequests = new Set<string>();

      collection.requests?.forEach(req => {
        if (req.name.toLowerCase().includes(lowerQuery)) matchingRequests.add(req.id);
      });

      collection.folders?.forEach(folder => {
        if (folder.name.toLowerCase().includes(lowerQuery)) matchingFolders.add(folder.id);
      });

      const foldersToProcess = [...matchingFolders];
      while (foldersToProcess.length > 0) {
        const folderId = foldersToProcess.pop()!;
        collection.folders?.forEach(f => {
          if (f.parentId === folderId && !matchingFolders.has(f.id)) {
            matchingFolders.add(f.id);
            foldersToProcess.push(f.id);
          }
        });
        collection.requests?.forEach(r => {
          if (r.folderId === folderId && !matchingRequests.has(r.id)) {
            matchingRequests.add(r.id);
          }
        });
      }

      collection.requests?.forEach(req => {
        if (matchingRequests.has(req.id)) {
          let currentFolderId = req.folderId;
          while (currentFolderId && !matchingFolders.has(currentFolderId)) {
            matchingFolders.add(currentFolderId);
            const folder = collection.folders?.find(f => f.id === currentFolderId);
            currentFolderId = folder ? folder.parentId : null;
          }
        }
      });

      collection.folders?.forEach(folder => {
        if (matchingFolders.has(folder.id)) {
          let currentFolderId = folder.parentId;
          while (currentFolderId && !matchingFolders.has(currentFolderId)) {
            matchingFolders.add(currentFolderId);
            const f = collection.folders?.find(f => f.id === currentFolderId);
            currentFolderId = f ? f.parentId : null;
          }
        }
      });

      if (collectionMatches || matchingFolders.size > 0 || matchingRequests.size > 0) {
        return {
          ...collection,
          folders: collection.folders?.filter(f => collectionMatches || matchingFolders.has(f.id)) || [],
          requests: collection.requests?.filter(r => collectionMatches || matchingFolders.has(r.folderId!) || matchingRequests.has(r.id)) || []
        };
      }
      return null;
    }).filter(Boolean) as ApiCollection[];

    return { filteredCollections, filteredEnvironments };
  }, [collections, environments, searchQuery]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCustomization = async (name: string, color: string, icon: string) => {
    if (!customizationModal.collectionId) return;
    
    setCustomizationModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      await updateDoc(doc(db, "collections", customizationModal.collectionId), {
        name,
        color,
        icon
      });
    } catch (e) {
      console.error("Failed to update collection customization:", e);
    }
  };

  const handleCreate = async (name: string) => {
    if (!currentWorkspace) return;
    
    // Close modal immediately for snappy UI
    setModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      if (modal.type === 'collection') {
        const newCollection: ApiCollection = {
          id: uuidv4(),
          workspaceId: currentWorkspace.id,
          name,
          folders: [],
          requests: []
        };
        await setDoc(doc(db, "collections", newCollection.id), newCollection);
      } else if (modal.type === 'environment') {
        const newEnv = {
          id: uuidv4(),
          workspaceId: currentWorkspace.id,
          name,
          variables: []
        };
        await setDoc(doc(db, "environments", newEnv.id), newEnv);
      } else if (modal.type === 'folder' && modal.targetId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const newFolder = {
            id: uuidv4(),
            name,
            parentId: modal.targetFolderId || null
          };
          await updateDoc(doc(db, "collections", modal.targetId), {
            folders: [...(collectionDoc.folders || []), newFolder]
          });
        }
      } else if (modal.type === 'request' && modal.targetId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const newRequest: RequestItem = {
            id: uuidv4(),
            collectionId: modal.targetId,
            workspaceId: currentWorkspace.id,
            name,
            method: 'GET',
            url: '',
            headers: [],
            params: [],
            folderId: modal.targetFolderId || null,
            body: { type: 'none', content: '' }
          };
          await updateDoc(doc(db, "collections", modal.targetId), {
            requests: [...(collectionDoc.requests || []), newRequest]
          });
          setActiveRequest(newRequest);
          setActiveView('request');
        }
      } else if (modal.type === 'rename_collection' && modal.targetId) {
        await updateDoc(doc(db, "collections", modal.targetId), { name });
      } else if (modal.type === 'rename_folder' && modal.targetId && modal.targetFolderId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const updatedFolders = (collectionDoc.folders || []).map(f => f.id === modal.targetFolderId ? { ...f, name } : f);
          await updateDoc(doc(db, "collections", modal.targetId), { folders: updatedFolders });
        }
      } else if (modal.type === 'rename_request' && modal.targetId && modal.targetRequestId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const updatedRequests = (collectionDoc.requests || []).map(r => r.id === modal.targetRequestId ? { ...r, name } : r);
          await updateDoc(doc(db, "collections", modal.targetId), { requests: updatedRequests });
          // If it's the active request, update it there too
          if (activeRequest?.id === modal.targetRequestId) {
            setActiveRequest({ ...activeRequest, name });
          }
        }
      } else if (modal.type === 'workspace') {
        const newWorkspace = {
          id: uuidv4(),
          name,
          ownerId: user?.uid || '',
          members: []
        };
        await setDoc(doc(db, "workspaces", newWorkspace.id), newWorkspace);
        setCurrentWorkspace(newWorkspace);
      } else if (modal.type === 'rename_workspace' && modal.targetId) {
        await updateDoc(doc(db, "workspaces", modal.targetId), { name });
        if (currentWorkspace && currentWorkspace.id === modal.targetId) {
          setCurrentWorkspace({ ...currentWorkspace, name });
        }
      } else if (modal.type === 'invite_member' && currentWorkspace) {
        const members = currentWorkspace.members || [];
        if (!members.includes(name)) {
          const updatedMembers = [...members, name];
          await updateDoc(doc(db, "workspaces", currentWorkspace.id), { members: updatedMembers });
          setCurrentWorkspace({ ...currentWorkspace, members: updatedMembers });
        }
      } else if (modal.type === 'deploy' && modal.targetId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const deployId = uuidv4();
          const newDeployment = {
            id: deployId,
            workspaceId: currentWorkspace.id,
            collectionId: collectionDoc.id,
            collectionName: collectionDoc.name,
            version: name || 'v1',
            createdAt: new Date().toISOString(),
            requests: collectionDoc.requests || []
          };
          await setDoc(doc(db, "deployments", deployId), newDeployment);
        }
      }
    } catch (e) {
      console.error("Failed to submit form:", e);
    }
  };

  const handleImportPostman = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentWorkspace) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        // Import our custom format
        if (parsedData.type === 'apitester_export' && parsedData.collections && parsedData.environments) {
          // Import collections
          for (const collection of parsedData.collections) {
            const newCollectionId = uuidv4();
            const idMap = new Map<string, string>(); // old folder id -> new folder id
            
            const newFolders = (collection.folders || []).map((f: any) => {
              const newFolderId = uuidv4();
              idMap.set(f.id, newFolderId);
              return { ...f, id: newFolderId };
            });
            
            // Map parentIds
            newFolders.forEach((f: any) => {
              if (f.parentId && idMap.has(f.parentId)) {
                f.parentId = idMap.get(f.parentId);
              }
            });
            
            const newRequests = (collection.requests || []).map((r: any) => ({
              ...r,
              id: uuidv4(),
              collectionId: newCollectionId,
              workspaceId: currentWorkspace.id,
              folderId: (r.folderId && idMap.has(r.folderId)) ? idMap.get(r.folderId) : r.folderId
            }));
            
            const newCollection = {
              ...collection,
              id: newCollectionId,
              workspaceId: currentWorkspace.id,
              folders: newFolders,
              requests: newRequests
            };
            
            await setDoc(doc(db, "collections", newCollectionId), newCollection);
          }
          
          // Import environments
          for (const env of parsedData.environments) {
            const newEnvId = uuidv4();
            const newEnv = { ...env, id: newEnvId, workspaceId: currentWorkspace.id };
            await setDoc(doc(db, "environments", newEnvId), newEnv);
          }
          
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        // Basic Postman v2.1 import logic
        if (parsedData.info && parsedData.item) {
          const newCollectionId = uuidv4();
          
          const requests: RequestItem[] = [];
          const folders: any[] = [];
          
          const processItems = (items: any[], parentId: string | null = null) => {
            items.forEach(item => {
              if (item.item) {
                // Folder
                const folderId = uuidv4();
                folders.push({
                  id: folderId,
                  name: item.name,
                  parentId
                });
                processItems(item.item, folderId);
              } else if (item.request) {
                // Request
                const req = item.request;
                requests.push({
                  id: uuidv4(),
                  collectionId: newCollectionId,
                  workspaceId: currentWorkspace.id,
                  name: item.name,
                  method: req.method || 'GET',
                  url: typeof req.url === 'string' ? req.url : req.url?.raw || '',
                  headers: (req.header || []).map((h: any) => ({ id: uuidv4(), key: h.key, value: h.value, enabled: true })),
                  params: (req.url?.query || []).map((q: any) => ({ id: uuidv4(), key: q.key, value: q.value, enabled: true })),
                  folderId: parentId,
                  body: {
                    type: req.body?.mode || 'none',
                    content: req.body?.raw || ''
                  }
                });
              }
            });
          };
          
          processItems(parsedData.item);

          const collectionDoc: ApiCollection = {
            id: newCollectionId,
            workspaceId: currentWorkspace.id,
            name: parsedData.info.name || 'Imported Collection',
            folders,
            requests,
          };

          // Save to Firebase
          await setDoc(doc(db, "collections", newCollectionId), collectionDoc);
          
        }
      } catch (error) {
        console.error("Error parsing Postman/JSON file", error);
        alert("Failed to import file. Please ensure it's a valid JSON format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportData = () => {
    if (!currentWorkspace) return;
    
    const exportData = {
      type: 'apitester_export',
      version: 1,
      workspaceId: currentWorkspace.id,
      collections,
      environments,
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `apitester_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'request', collectionId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id, type, collectionId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, targetType: 'collection' | 'folder', collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      
      const source = JSON.parse(dataStr);
      
      if (source.collectionId !== collectionId) return; // Disallow cross-collection drag for now
      if (source.type === 'folder' && source.id === targetId) return;

      const collectionDoc = collections.find(c => c.id === collectionId);
      if (!collectionDoc) return;

      if (source.type === 'request') {
        const reqIndex = collectionDoc.requests.findIndex(r => r.id === source.id);
        if (reqIndex === -1) return;
        
        const updatedRequests = [...collectionDoc.requests];
        updatedRequests[reqIndex] = {
           ...updatedRequests[reqIndex],
           folderId: targetType === 'collection' ? null : targetId
        };
        
        await updateDoc(doc(db, "collections", collectionId), { requests: updatedRequests });
      } else if (source.type === 'folder') {
        const folderIndex = collectionDoc.folders.findIndex(f => f.id === source.id);
        if (folderIndex === -1) return;
        
        if (targetType === 'folder') {
           let current = collectionDoc.folders.find(f => f.id === targetId);
           while (current) {
              if (current.id === source.id) return;
              current = collectionDoc.folders.find(f => f.id === current?.parentId);
           }
        }

        const updatedFolders = [...collectionDoc.folders];
        updatedFolders[folderIndex] = {
           ...updatedFolders[folderIndex],
           parentId: targetType === 'collection' ? null : targetId
        };
        
        await updateDoc(doc(db, "collections", collectionId), { folders: updatedFolders });
      }
    } catch (err) {
      console.error('Drag and drop error', err);
    }
  };

  const renderCollectionItems = (collectionId: string, requests: RequestItem[], folders: any[], parentId: string | null = null) => {
    const currentFolders = folders.filter(f => (f.parentId || null) === parentId);
    const currentRequests = requests.filter(r => (r.folderId || null) === parentId);

    return (
      <>
        {currentFolders.map(folder => {
          const isExpanded = searchQuery ? true : expandedItems.has(folder.id);
          return (
            <div key={folder.id} className="mt-1">
              <div 
                draggable
                onDragStart={(e) => handleDragStart(e, folder.id, 'folder', collectionId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, folder.id, 'folder', collectionId)}
                onClick={(e) => toggleExpand(folder.id, e)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                  </div>
                  <Folder className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span className="text-xs truncate">{folder.name}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'Rename Folder', type: 'rename_folder', targetId: collectionId, targetFolderId: folder.id, initialValue: folder.name }); }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded"
                    title="Rename Folder"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'New Folder', type: 'folder', targetId: collectionId, targetFolderId: folder.id }); }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded"
                    title="New Folder"
                  >
                    <Folder className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'New Request', type: 'request', targetId: collectionId, targetFolderId: folder.id }); }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded"
                    title="New Request"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const collectionDoc = collections.find(c => c.id === collectionId);
                        if (!collectionDoc) return;
                        
                        const idMap = new Map<string, string>();
                        const duplicateFolders = (pId: string, newParentId: string | null): any[] => {
                          const foldersToDuplicate = collectionDoc.folders?.filter(f => f.parentId === pId) || [];
                          const newFolders: any[] = [];
                          for (const f of foldersToDuplicate) {
                            const newId = uuidv4();
                            idMap.set(f.id, newId);
                            newFolders.push({ ...f, id: newId, parentId: newParentId });
                            newFolders.push(...duplicateFolders(f.id, newId));
                          }
                          return newFolders;
                        };
                        
                        const newRootId = uuidv4();
                        idMap.set(folder.id, newRootId);
                        const newRootFolder = { ...folder, id: newRootId, name: `Copy of ${folder.name}` };
                        
                        const childFolders = duplicateFolders(folder.id, newRootId);
                        const newFolders = [newRootFolder, ...childFolders];
                        
                        const newRequests = collectionDoc.requests?.filter(r => r.folderId && idMap.has(r.folderId)).map(r => ({
                          ...r,
                          id: uuidv4(),
                          folderId: idMap.get(r.folderId!) || null
                        })) || [];
                        
                        const updatedFolders = [...(collectionDoc.folders || []), ...newFolders];
                        const updatedRequests = [...(collectionDoc.requests || []), ...newRequests];
                        await updateDoc(doc(db, "collections", collectionDoc.id), { folders: updatedFolders, requests: updatedRequests });
                      } catch (error) {
                        console.error("Failed to duplicate folder:", error);
                      }
                    }}
                    className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Duplicate Folder"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmModal({
                        isOpen: true,
                        title: 'Delete Folder',
                        message: 'Are you sure you want to delete this folder and all its contents?',
                        onConfirm: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          try {
                            const collection = collections.find(c => c.id === collectionId);
                            if (collection) {
                              const folderIdsToRemove = new Set<string>([folder.id]);
                              const requestIdsToRemove = new Set<string>();
                              
                              const processChildren = (currentFolderId: string) => {
                                const subfolders = (collection.folders || []).filter(f => f.parentId === currentFolderId);
                                subfolders.forEach(sf => {
                                  folderIdsToRemove.add(sf.id);
                                  processChildren(sf.id);
                                });
                                
                                const childRequests = (collection.requests || []).filter(r => r.folderId === currentFolderId);
                                childRequests.forEach(cr => requestIdsToRemove.add(cr.id));
                              };
                              
                              processChildren(folder.id);
                              
                              const updatedFolders = (collection.folders || []).filter(f => !folderIdsToRemove.has(f.id));
                              const updatedRequests = (collection.requests || []).filter(r => !requestIdsToRemove.has(r.id));
                              
                              await updateDoc(doc(db, "collections", collection.id), { 
                                folders: updatedFolders,
                                requests: updatedRequests
                              });
                            }
                          } catch (error) {
                            console.error("Failed to delete folder:", error);
                          }
                        }
                      });
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-delete)] p-0.5 rounded"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="ml-3 pl-2 border-l border-[var(--border-subtle)]">
                  {renderCollectionItems(collectionId, requests, folders, folder.id)}
                </div>
              )}
            </div>
          );
        })}
        {currentRequests.map(req => (
          <div 
            key={req.id}
            draggable
            onDragStart={(e) => handleDragStart(e, req.id, 'request', collectionId)}
            onClick={() => { 
              setActiveRequest(req); 
              setActiveView('request');
              openTab({ id: req.id, type: 'request', name: req.name, method: req.method });
            }}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mt-1 group/req",
              activeRequest?.id === req.id ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            )}
          >
            <span className={cn(
              "text-[10px] font-bold w-10 shrink-0",
              req.method === 'GET' ? "text-[var(--text-get)]" :
              req.method === 'POST' ? "text-[var(--text-post)]" :
              req.method === 'PUT' ? "text-[var(--text-put)]" :
              req.method === 'DELETE' ? "text-[var(--text-delete)]" : "text-[var(--text-secondary)]"
            )}>{req.method}</span>
            <span className="text-xs truncate flex-1">{req.name}</span>
            <div className="flex items-center opacity-0 group-hover/req:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setModal({ isOpen: true, title: 'Rename Request', type: 'rename_request', targetId: collectionId, targetRequestId: req.id, initialValue: req.name });
                }}
                className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Rename Request"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const collection = collections.find(c => c.id === collectionId);
                    if (collection) {
                      const newRequest = {
                        ...req,
                        id: uuidv4(),
                        name: `Copy of ${req.name}`,
                      };
                      const updatedRequests = [...(collection.requests || []), newRequest];
                      await updateDoc(doc(db, "collections", collection.id), { requests: updatedRequests });
                    }
                  } catch (error) {
                    console.error("Failed to duplicate request:", error);
                  }
                }}
                className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Duplicate Request"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Request',
                    message: `Are you sure you want to delete the request "${req.name}"?`,
                    onConfirm: async () => {
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      try {
                        const collection = collections.find(c => c.id === collectionId);
                        if (collection) {
                          const updatedRequests = collection.requests.filter(r => r.id !== req.id);
                          await updateDoc(doc(db, "collections", collection.id), { requests: updatedRequests });
                        }
                      } catch (error) {
                        console.error("Failed to delete request:", error);
                      }
                    }
                  });
                }}
                className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-delete)] transition-colors"
                title="Delete Request"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div 
      className="bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col h-full shrink-0"
      style={{ width: sidebarWidth }}
    >
      <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-sm tracking-tight font-bold text-[var(--text-primary)] flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-[var(--primary)] rounded flex items-center justify-center font-bold text-xs text-white">O</div>
            <span>OpenPost</span>
          </h1>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleExportData}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
              title="Export Data (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
              title="Import Data (JSON/Postman)"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSidebarCollapsed(true)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Selector Button */}
        <div className="relative mt-1">
          <button 
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="w-full flex items-center justify-between bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-all outline-none"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <span className="truncate">{currentWorkspace?.name || 'Select Workspace'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 ml-1" />
          </button>

          {showWorkspaceDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded shadow-2xl z-50 py-1 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)] mb-1">
                Workspaces
              </div>
              
              {workspaces.map(ws => {
                const isSelected = ws.id === currentWorkspace?.id;
                const isOwner = ws.ownerId === user?.uid;
                return (
                  <div 
                    key={ws.id}
                    className={cn(
                      "group/ws flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer transition-colors",
                      isSelected ? "bg-[var(--bg-hover)] font-medium text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    )}
                    onClick={() => {
                      setCurrentWorkspace(ws);
                      setShowWorkspaceDropdown(false);
                    }}
                  >
                    <span className="truncate pr-2">{ws.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover/ws:opacity-100 transition-opacity">
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({
                              isOpen: true,
                              title: 'Rename Workspace',
                              type: 'rename_workspace',
                              targetId: ws.id,
                              initialValue: ws.name
                            });
                            setShowWorkspaceDropdown(false);
                          }}
                          className="p-1 hover:text-[var(--primary)] hover:bg-[var(--bg-base)] rounded transition-colors"
                          title="Rename Workspace"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {isOwner && workspaces.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                              isOpen: true,
                              title: 'Delete Workspace',
                              message: `Are you sure you want to delete "${ws.name}"? This action is permanent and cannot be undone.`,
                              onConfirm: async () => {
                                try {
                                  await deleteDoc(doc(db, "workspaces", ws.id));
                                  const remaining = workspaces.filter(w => w.id !== ws.id);
                                  if (remaining.length > 0) {
                                    setCurrentWorkspace(remaining[0]);
                                  }
                                } catch (error) {
                                  console.error("Failed to delete workspace:", error);
                                }
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                            setShowWorkspaceDropdown(false);
                          }}
                          className="p-1 hover:text-red-500 hover:bg-[var(--bg-base)] rounded transition-colors"
                          title="Delete Workspace"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                <button
                  onClick={() => {
                    setModal({
                      isOpen: true,
                      title: 'New Workspace',
                      type: 'workspace',
                      initialValue: ''
                    });
                    setShowWorkspaceDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--primary)] hover:bg-[var(--bg-hover)] font-medium transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json"
          onChange={handleImportPostman}
        />
      </div>

      <div className="flex border-b border-[var(--border-subtle)]">
        <button 
          onClick={() => setActiveTab('collections')}
          className={cn(
            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider truncate px-1",
            activeTab === 'collections' ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
          title="Collections"
        >
          Collections
        </button>
        <button 
          onClick={() => setActiveTab('environments')}
          className={cn(
            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider truncate px-1",
            activeTab === 'environments' ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
          title="Environments"
        >
          Environments
        </button>
        <button 
          onClick={() => setActiveTab('deployments')}
          className={cn(
            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider truncate px-1",
            activeTab === 'deployments' ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
          title="Mock Deployments"
        >
          Mocks
        </button>
      </div>

      <div className="p-2 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-8 pr-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'collections' ? (
          <div>
            <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Collections</span>
              <button 
                onClick={() => setModal({ isOpen: true, title: 'New Collection', type: 'collection' })}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {filteredCollections.map(collection => {
              const isExpanded = searchQuery ? true : expandedItems.has(collection.id);
              return (
                <div key={collection.id} className="mb-2">
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, collection.id, 'collection', collection.id)}
                    onClick={(e) => toggleExpand(collection.id, e)}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                      </div>
                      {(() => {
                        const CustomIcon = getCollectionIcon(collection.icon);
                        return (
                          <CustomIcon 
                            className="w-4 h-4 shrink-0 transition-all animate-fade-in" 
                            style={{ color: collection.color || 'var(--primary)' }} 
                          />
                        );
                      })()}
                      <span className="text-xs truncate">{collection.name}</span>
                    </div>
                    <div className="relative shrink-0 flex items-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === collection.id ? null : collection.id);
                        }}
                        className={cn(
                          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded transition-colors",
                          activeDropdown === collection.id ? "opacity-100 text-[var(--text-primary)] bg-[var(--bg-hover-strong)]" : "opacity-0 group-hover:opacity-100"
                        )}
                        title="Collection Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeDropdown === collection.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(null);
                            }}
                          />
                          <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-lg shadow-[var(--shadow-panel)] py-1.5 z-50 animate-fade-in font-sans">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                openTab({ id: collection.id, type: 'collection_doc', name: `${collection.name} Doc` });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <BookOpen className="w-4 h-4 text-[var(--primary)] shrink-0" />
                              <span className="font-semibold text-[var(--primary)]">View Documentation</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setCustomizationModal({
                                  isOpen: true,
                                  collectionId: collection.id,
                                  name: collection.name,
                                  color: collection.color || '',
                                  icon: collection.icon || 'Folder'
                                });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Palette className="w-4 h-4 shrink-0" style={{ color: collection.color || undefined }} />
                              <span>Customize Appearance</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setModal({ isOpen: true, title: 'Rename Collection', type: 'rename_collection', targetId: collection.id, initialValue: collection.name });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Edit2 className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                              <span>Rename Collection</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setModal({ isOpen: true, title: 'New Folder', type: 'folder', targetId: collection.id });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Folder className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                              <span>New Folder</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setModal({ isOpen: true, title: 'New Request', type: 'request', targetId: collection.id });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Plus className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                              <span>New Request</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                try {
                                  const newCollection = {
                                    ...collection,
                                    id: uuidv4(),
                                    name: `Copy of ${collection.name}`,
                                    workspaceId: currentWorkspace?.id || null,
                                  };
                                  const idMap = new Map<string, string>();
                                  
                                  newCollection.folders = newCollection.folders?.map(f => {
                                    const newId = uuidv4();
                                    idMap.set(f.id, newId);
                                    return { ...f, id: newId };
                                  }) || [];
                                  
                                  newCollection.folders = newCollection.folders.map(f => ({
                                    ...f,
                                    parentId: f.parentId ? (idMap.get(f.parentId) || null) : null
                                  }));
                                  
                                  newCollection.requests = newCollection.requests?.map(r => {
                                    const newId = uuidv4();
                                    return { ...r, id: newId, folderId: r.folderId ? (idMap.get(r.folderId) || null) : null };
                                  }) || [];
                                  
                                  await setDoc(doc(db, "collections", newCollection.id), newCollection);
                                } catch (error) {
                                  console.error("Failed to duplicate collection:", error);
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Copy className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                              <span>Duplicate Collection</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setModal({ isOpen: true, title: 'Deploy Collection (Enter Version e.g. v1)', type: 'deploy', targetId: collection.id, initialValue: 'v1' });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors text-left font-semibold"
                            >
                              <Rocket className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Deploy Mock Server</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete Collection',
                                  message: 'Are you sure you want to delete this collection and all its contents?',
                                  onConfirm: async () => {
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    try {
                                      await deleteDoc(doc(db, "collections", collection.id));
                                    } catch (error) {
                                      console.error("Failed to delete collection:", error);
                                    }
                                  }
                                });
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors text-left font-semibold"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                              <span>Delete Collection</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ml-2 pl-2 border-l border-[var(--border-subtle)]">
                      {renderCollectionItems(collection.id, collection.requests || [], collection.folders || [])}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCollections.length === 0 && (
              <div className="text-center p-4 text-sm text-[var(--text-secondary)]">
                {searchQuery ? "No results found." : "No collections. Click the Upload icon above to import data."}
              </div>
            )}
          </div>
        ) : activeTab === 'environments' ? (
          <div>
             <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Environments</span>
              <button 
                onClick={() => setModal({ isOpen: true, title: 'New Environment', type: 'environment' })}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {filteredEnvironments.map(env => (
              <div 
                key={env.id} 
                onClick={() => { 
                  setEditingEnvironment(env); 
                  setActiveView('environment'); 
                  openTab({ id: env.id, type: 'environment', name: env.name });
                }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group/env justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Settings2 className="w-4 h-4 shrink-0 text-[var(--text-secondary)]" />
                  <span className="text-xs truncate">{env.name}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover/env:opacity-100 transition-opacity">
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const newEnv = {
                          ...env,
                          id: uuidv4(),
                          name: `Copy of ${env.name}`,
                        };
                        await setDoc(doc(db, "environments", newEnv.id), newEnv);
                      } catch (error) {
                        console.error("Failed to duplicate environment:", error);
                      }
                    }}
                    className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Duplicate Environment"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredEnvironments.length === 0 && (
              <div className="text-center p-4 text-sm text-[var(--text-secondary)]">
                {searchQuery ? "No results found." : "No environments found."}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Mock API Servers</span>
            </div>
            {deployments.map(deploy => {
              const mockUrl = `${window.location.origin}/mock/${deploy.id}`;
              return (
                <div 
                  key={deploy.id}
                  onClick={() => {
                    setActiveView('deployments');
                    openTab({ id: deploy.id, type: 'deployments' as any, name: `${deploy.collectionName} (${deploy.version})` });
                  }}
                  className="flex flex-col gap-1 p-2.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group/dep border border-transparent hover:border-[var(--border-subtle)] mb-2 transition-all animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Rocket className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold truncate text-[var(--text-primary)]">{deploy.collectionName}</span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setConfirmModal({
                          isOpen: true,
                          title: 'Undeploy Mock Server',
                          message: `Are you sure you want to delete/undeploy the mock server "${deploy.collectionName}" (${deploy.version})?`,
                          onConfirm: async () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            try {
                              await deleteDoc(doc(db, "deployments", deploy.id));
                            } catch (error) {
                              console.error("Failed to delete deployment:", error);
                            }
                          }
                        });
                      }}
                      className="opacity-0 group-hover/dep:opacity-100 p-0.5 rounded text-[var(--text-secondary)] hover:text-red-500 transition-all animate-fade-in"
                      title="Undeploy Mock Server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-0.5">
                    <span className="bg-[var(--border-strong)] px-1.5 py-0.2 rounded font-mono text-emerald-400">{deploy.version}</span>
                    <span>{new Date(deploy.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover-strong)] border border-[var(--border-subtle)] rounded px-2 py-1 mt-1 text-[10px] text-indigo-400 font-mono transition-all group-hover/dep:border-[var(--border-strong)]">
                    <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate flex-1">{mockUrl}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(mockUrl);
                      }}
                      className="p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      title="Copy URL"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {deployments.length === 0 && (
              <div className="text-center p-4 text-xs text-[var(--text-secondary)]">
                No mock servers deployed. Deploy a collection to start!
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-1 bg-[var(--bg-hover)]/30">
        <button 
          onClick={() => {
            setModal({
              isOpen: true,
              title: 'Invite Team Member (by Email/UID)',
              type: 'invite_member',
              initialValue: ''
            });
          }}
          className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-full py-1.5 px-2 rounded hover:bg-[var(--bg-hover)] transition-colors outline-none"
        >
          <span className="flex items-center gap-2 font-medium">
            <Users className="w-4 h-4 text-[var(--primary)] shrink-0" />
            Workspace Members
          </span>
          <span className="text-[10px] bg-[var(--border-strong)] px-1.5 py-0.5 rounded-full font-bold">
            {1 + (currentWorkspace?.members?.length || 0)}
          </span>
        </button>
        {currentWorkspace?.members && currentWorkspace.members.length > 0 && (
          <div className="px-2 py-1 max-h-24 overflow-y-auto flex flex-col gap-1 border-t border-[var(--border-subtle)] mt-1 pt-1.5">
            {currentWorkspace.members.map((m, idx) => (
              <div key={idx} className="text-[10px] text-[var(--text-secondary)] truncate flex items-center justify-between group/m">
                <span className="truncate">• {m}</span>
                {currentWorkspace.ownerId === user?.uid && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const updated = (currentWorkspace.members || []).filter(x => x !== m);
                      await updateDoc(doc(db, "workspaces", currentWorkspace.id), { members: updated });
                      setCurrentWorkspace({ ...currentWorkspace, members: updated });
                    }}
                    className="text-red-500 hover:text-red-600 opacity-0 group-hover/m:opacity-100 transition-opacity ml-1"
                    title="Remove Member"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <PromptModal 
        isOpen={modal.isOpen} 
        title={modal.title} 
        initialValue={modal.initialValue}
        submitText={modal.type.startsWith('rename_') ? 'Save' : 'Create'}
        onSubmit={handleCreate} 
        onCancel={() => setModal({ ...modal, isOpen: false })} 
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <CustomizeCollectionModal
        isOpen={customizationModal.isOpen}
        title="Customize Collection Aesthetics"
        initialName={customizationModal.name}
        initialColor={customizationModal.color}
        initialIcon={customizationModal.icon}
        onSubmit={handleSaveCustomization}
        onCancel={() => setCustomizationModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
