import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Folder, Play, Plus, Settings2, Users, Upload, Download, MoreVertical, Trash2, ChevronRight, ChevronDown, Edit2 } from 'lucide-react';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ApiCollection, RequestItem } from '../types';
import { PromptModal } from './PromptModal';
import { ConfirmModal } from './ConfirmModal';

export function Sidebar() {
  const { collections, environments, activeRequest, setActiveRequest, setActiveView, setEditingEnvironment, currentWorkspace, openTab } = useStore();
  const [activeTab, setActiveTab] = useState<'collections' | 'environments'>('collections');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [modal, setModal] = useState<{isOpen: boolean, title: string, type: 'collection'|'request'|'environment'|'folder'|'rename_collection'|'rename_folder'|'rename_request', targetId?: string, targetFolderId?: string, targetRequestId?: string, initialValue?: string}>({isOpen: false, title: '', type: 'collection'});
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
                  folderId,
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

  const renderCollectionItems = (collectionId: string, requests: RequestItem[], folders: any[], parentId: string | null = null) => {
    const currentFolders = folders.filter(f => (f.parentId || null) === parentId);
    const currentRequests = requests.filter(r => (r.folderId || null) === parentId);

    return (
      <>
        {currentFolders.map(folder => {
          const isExpanded = expandedItems.has(folder.id);
          return (
            <div key={folder.id} className="mt-1">
              <div 
                onClick={(e) => toggleExpand(folder.id, e)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#252525] rounded cursor-pointer text-gray-300 group justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  <Folder className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs truncate">{folder.name}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'Rename Folder', type: 'rename_folder', targetId: collectionId, targetFolderId: folder.id, initialValue: folder.name }); }}
                    className="text-gray-500 hover:text-white p-0.5 rounded"
                    title="Rename Folder"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'New Folder', type: 'folder', targetId: collectionId, targetFolderId: folder.id }); }}
                    className="text-gray-500 hover:text-white p-0.5 rounded"
                    title="New Folder"
                  >
                    <Folder className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'New Request', type: 'request', targetId: collectionId, targetFolderId: folder.id }); }}
                    className="text-gray-500 hover:text-white p-0.5 rounded"
                    title="New Request"
                  >
                    <Plus className="w-3.5 h-3.5" />
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
                    className="text-gray-500 hover:text-red-400 p-0.5 rounded"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="ml-3 pl-2 border-l border-[#2B2B2B]">
                  {renderCollectionItems(collectionId, requests, folders, folder.id)}
                </div>
              )}
            </div>
          );
        })}
        {currentRequests.map(req => (
          <div 
            key={req.id}
            onClick={() => { 
              setActiveRequest(req); 
              setActiveView('request');
              openTab({ id: req.id, type: 'request', name: req.name, method: req.method });
            }}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mt-1 group/req",
              activeRequest?.id === req.id ? "bg-[#252525] text-white" : "hover:bg-[#252525] text-gray-400"
            )}
          >
            <span className={cn(
              "text-[10px] font-bold w-10 shrink-0",
              req.method === 'GET' ? "text-green-400" :
              req.method === 'POST' ? "text-yellow-400" :
              req.method === 'PUT' ? "text-blue-400" :
              req.method === 'DELETE' ? "text-red-400" : "text-gray-500"
            )}>{req.method}</span>
            <span className="text-xs truncate flex-1">{req.name}</span>
            <div className="flex items-center opacity-0 group-hover/req:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setModal({ isOpen: true, title: 'Rename Request', type: 'rename_request', targetId: collectionId, targetRequestId: req.id, initialValue: req.name });
                }}
                className="p-0.5 rounded text-gray-500 hover:text-white transition-colors"
                title="Rename Request"
              >
                <Edit2 className="w-3 h-3" />
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
                className="p-0.5 rounded text-gray-500 hover:text-red-400 transition-colors"
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
    <div className="w-64 bg-[#161616] border-r border-[#2B2B2B] flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-[#2B2B2B] flex items-center justify-between">
        <h1 className="text-sm tracking-tight font-semibold text-white flex items-center gap-2">
          <div className="w-6 h-6 bg-[#FF6C37] rounded flex items-center justify-center font-bold text-xs text-white">P</div>
          Team Workspace
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleExportData}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#252525] transition-colors"
            title="Export Data (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#252525] transition-colors"
            title="Import Data (JSON/Postman)"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json"
          onChange={handleImportPostman}
        />
      </div>

      <div className="flex border-b border-[#2B2B2B]">
        <button 
          onClick={() => setActiveTab('collections')}
          className={cn(
            "flex-1 py-2 text-xs font-medium uppercase tracking-wider",
            activeTab === 'collections' ? "text-[#FF6C37] border-b-2 border-[#FF6C37]" : "text-gray-500 hover:text-gray-300"
          )}
        >
          Collections
        </button>
        <button 
          onClick={() => setActiveTab('environments')}
          className={cn(
            "flex-1 py-2 text-xs font-medium uppercase tracking-wider",
            activeTab === 'environments' ? "text-[#FF6C37] border-b-2 border-[#FF6C37]" : "text-gray-500 hover:text-gray-300"
          )}
        >
          Environments
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'collections' ? (
          <div>
            <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Collections</span>
              <button 
                onClick={() => setModal({ isOpen: true, title: 'New Collection', type: 'collection' })}
                className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {collections.map(collection => {
              const isExpanded = expandedItems.has(collection.id);
              return (
                <div key={collection.id} className="mb-2">
                  <div 
                    onClick={(e) => toggleExpand(collection.id, e)}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#252525] rounded cursor-pointer text-gray-300 group justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                      <Folder className="w-4 h-4 text-[#FF6C37]" />
                      <span className="text-xs truncate">{collection.name}</span>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'Rename Collection', type: 'rename_collection', targetId: collection.id, initialValue: collection.name }); }}
                        className="text-gray-500 hover:text-white p-0.5 rounded"
                        title="Rename Collection"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'New Folder', type: 'folder', targetId: collection.id }); }}
                        className="text-gray-500 hover:text-white p-0.5 rounded"
                        title="New Folder"
                      >
                        <Folder className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, title: 'New Request', type: 'request', targetId: collection.id }); }}
                        className="text-gray-500 hover:text-white p-0.5 rounded transition-opacity"
                        title="New Request"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
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
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-opacity"
                        title="Delete Collection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ml-2 pl-2 border-l border-[#2B2B2B]">
                      {renderCollectionItems(collection.id, collection.requests || [], collection.folders || [])}
                    </div>
                  )}
                </div>
              );
            })}
            {collections.length === 0 && (
              <div className="text-center p-4 text-sm text-gray-500">
                No collections. Click the Upload icon above to import data.
              </div>
            )}
          </div>
        ) : (
          <div>
             <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Environments</span>
              <button 
                onClick={() => setModal({ isOpen: true, title: 'New Environment', type: 'environment' })}
                className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {environments.map(env => (
              <div 
                key={env.id} 
                onClick={() => { 
                  setEditingEnvironment(env); 
                  setActiveView('environment'); 
                  openTab({ id: env.id, type: 'environment', name: env.name });
                }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#252525] rounded cursor-pointer text-gray-300"
              >
                <Settings2 className="w-4 h-4 text-gray-400" />
                <span className="text-xs truncate">{env.name}</span>
              </div>
            ))}
            {environments.length === 0 && (
              <div className="text-center p-4 text-sm text-gray-500">
                No environments found.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#2B2B2B]">
         <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-white w-full py-2 px-2 rounded hover:bg-[#252525] transition-colors">
            <Users className="w-4 h-4" />
            Team Settings & Invites
         </button>
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
    </div>
  );
}
