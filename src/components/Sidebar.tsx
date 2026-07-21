import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Folder, Play, Plus, Settings2, Users, Upload, Download, MoreVertical, Trash2, ChevronRight, ChevronDown, Edit2, Search, Copy, ChevronLeft, Palette, Rocket, Globe, ExternalLink, BookOpen, FileDown, History, Server, Share2, CheckSquare, Square, X, Check } from 'lucide-react';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../lib/api';
import { ApiCollection, RequestItem, Environment } from '../types';
import { PromptModal } from './PromptModal';
import { ConfirmModal } from './ConfirmModal';
import { CustomizeCollectionModal, getCollectionIcon } from './CustomizeCollectionModal';
import { exportToGateway, GatewayType } from '../utils/gatewayExports';
import { exportToOpenAPI } from '../utils/openapiExport';
import { exportToPostman } from '../utils/postmanExport';
import { TestRunnerSidebar } from './TestRunnerSidebar';
import { WorkspaceMembersModal } from './WorkspaceMembersModal';

export function Sidebar() {
  const { 
    collections, 
    setCollections,
    environments, 
    setEnvironments,
    deployments,
    setDeployments,
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
    setWorkspaces,
    setCurrentWorkspace,
    addToast,
    history,
    clearHistory,
    removeHistoryItem,
    isBulkEditMode,
    setIsBulkEditMode,
    selectedRequestIds,
    setSelectedRequestIds,
    toggleRequestSelection,
    isWorkspaceLoading
  } = useStore();
  const [activeTab, setActiveTab] = useState<'collections' | 'environments' | 'deployments' | 'history' | 'tests'>('collections');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  
  const [modal, setModal] = useState<{isOpen: boolean, title: string, type: 'collection'|'request'|'environment'|'folder'|'rename_collection'|'rename_folder'|'rename_request'|'workspace'|'rename_workspace'|'deploy'|'bulk_move', targetId?: string, targetFolderId?: string, targetRequestId?: string, initialValue?: string}>({isOpen: false, title: '', type: 'collection'});
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);
  const [draggedOverType, setDraggedOverType] = useState<'collection' | 'folder' | 'request' | null>(null);

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

  const renderCollectionsSkeleton = () => (
    <div className="space-y-4 p-2 animate-pulse select-none">
      <div className="space-y-3">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-hover)]/30">
              <div className="w-3.5 h-3.5 bg-[var(--border-strong)] rounded shrink-0 opacity-40" />
              <div className="w-4 h-4 bg-[var(--border-strong)] rounded-full shrink-0 opacity-40" />
              <div className={`h-3 bg-[var(--border-strong)] rounded opacity-50 ${idx === 1 ? 'w-24' : idx === 2 ? 'w-32' : 'w-20'}`} />
            </div>
            {idx < 3 && (
              <div className="ml-4 pl-3 border-l border-[var(--border-subtle)] space-y-2">
                {[1, 2].map((subIdx) => (
                  <div key={subIdx} className="flex items-center gap-2 px-2 py-1 bg-[var(--bg-hover)]/10 rounded">
                    <div className="w-6 h-3.5 bg-[var(--border-strong)]/40 rounded text-[9px] shrink-0 opacity-40" />
                    <div className={`h-2.5 bg-[var(--border-strong)]/50 rounded opacity-50 ${subIdx === 1 ? 'w-16' : 'w-24'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderEnvironmentsSkeleton = () => (
    <div className="space-y-3 p-2 animate-pulse select-none">
      <div className="space-y-2">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="flex items-center gap-2 px-2 py-2 rounded bg-[var(--bg-hover)]/20">
            <div className="w-4 h-4 bg-[var(--border-strong)] rounded-full shrink-0 opacity-40" />
            <div className={`h-3 bg-[var(--border-strong)] rounded opacity-50 ${idx === 1 ? 'w-28' : idx === 2 ? 'w-20' : 'w-36'}`} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderDeploymentsSkeleton = () => (
    <div className="space-y-3 p-2 animate-pulse select-none">
      <div className="space-y-3">
        {[1, 2].map((idx) => (
          <div key={idx} className="p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-hover)]/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-[var(--border-strong)] rounded shrink-0 opacity-40" />
                <div className={`h-3 bg-[var(--border-strong)] rounded opacity-50 ${idx === 1 ? 'w-28' : idx === 2 ? 'w-20' : 'w-24'}`} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 w-8 bg-[var(--border-strong)]/40 rounded opacity-50" />
              <div className="h-2 w-16 bg-[var(--border-strong)]/30 rounded opacity-50" />
            </div>
            <div className="h-6 w-full bg-[var(--bg-hover)]/30 rounded opacity-40 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistorySkeleton = () => (
    <div className="space-y-3 p-2 animate-pulse select-none">
      <div className="space-y-2">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="p-2 border border-[var(--border-subtle)] rounded bg-[var(--bg-hover)]/10 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-8 bg-[var(--border-strong)]/40 rounded opacity-50" />
              <div className="h-4 w-8 bg-[var(--border-strong)]/30 rounded opacity-50" />
              <div className={`h-3 bg-[var(--border-strong)] rounded opacity-50 ${idx % 2 === 0 ? 'w-24' : 'w-16'}`} />
            </div>
            <div className="h-2.5 w-full bg-[var(--border-strong)]/20 rounded opacity-40" />
          </div>
        ))}
      </div>
    </div>
  );

  const { filteredCollections, filteredEnvironments } = useMemo(() => {
    let sortedCollections = [...collections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let sortedEnvironments = [...environments].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (!searchQuery.trim()) return { filteredCollections: sortedCollections, filteredEnvironments: sortedEnvironments };
    const lowerQuery = searchQuery.toLowerCase();

    const filteredEnvironmentsList = sortedEnvironments.filter(env => env.name.toLowerCase().includes(lowerQuery));

    const filteredCollectionsList = sortedCollections.map(collection => {
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
          folders: (collection.folders || [])
            .filter(f => collectionMatches || matchingFolders.has(f.id))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
          requests: collection.requests?.filter(r => collectionMatches || matchingFolders.has(r.folderId!) || matchingRequests.has(r.id)) || []
        };
      }
      return null;
    }).filter(Boolean) as ApiCollection[];

    return { filteredCollections: filteredCollectionsList, filteredEnvironments: filteredEnvironmentsList };
  }, [collections, environments, searchQuery]);

  const filteredHistory = useMemo(() => {
    const wsHistory = history.filter(h => h.workspaceId === (currentWorkspace?.id || 'default'));
    if (!searchQuery.trim()) return wsHistory;
    const lowerQuery = searchQuery.toLowerCase();
    return wsHistory.filter(h => 
      h.name.toLowerCase().includes(lowerQuery) || 
      h.url.toLowerCase().includes(lowerQuery) || 
      h.method.toLowerCase().includes(lowerQuery)
    );
  }, [history, currentWorkspace, searchQuery]);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleHistoryItemClick = (item: any, autoRun = false) => {
    const virtualRequest: RequestItem = {
      id: `history_${item.id}${autoRun ? '_rerun' : ''}`,
      collectionId: 'history',
      workspaceId: item.workspaceId,
      name: item.name,
      method: item.method,
      url: item.url,
      headers: item.headers || [],
      params: item.params || [],
      body: item.body || { type: 'none', content: '' },
      auth: item.auth || { type: 'none' },
      mockResponse: {
        status: item.responseStatus || 200,
        headers: [{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }],
        body: ''
      }
    };
    setActiveRequest(virtualRequest);
    setActiveView('request');
    openTab({
      id: `history_${item.id}`,
      type: 'request',
      name: item.name,
      method: item.method
    });
  };

  const handleSaveCustomization = async (name: string, color: string, icon: string) => {
    if (!customizationModal.collectionId) return;
    
    setCustomizationModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      await apiService.updateCollection(customizationModal.collectionId, {
        name,
        color,
        icon
      });
      setCollections(collections.map(c => c.id === customizationModal.collectionId ? { ...c, name, color, icon } : c));
      addToast('Collection customized', 'success', 2000);
    } catch (e) {
      console.error("Failed to update collection customization:", e);
      addToast('Failed to customize collection', 'error');
    }
  };

  const handleCreate = async (name: string) => {
    if (!currentWorkspace) return;
    
    // Close modal immediately for snappy UI
    setModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      if (modal.type === 'collection') {
        const newCollection = await apiService.createCollection({
          id: uuidv4(),
          workspaceId: currentWorkspace.id,
          name,
          folders: [],
          requests: [],
          position: collections.length
        });
        setCollections([...collections, newCollection]);
        addToast(`Collection "${name}" created`, 'success', 2000);
      } else if (modal.type === 'environment') {
        const newEnv = await apiService.createEnvironment({
          id: uuidv4(),
          workspaceId: currentWorkspace.id,
          name,
          variables: [],
          position: environments.length
        });
        setEnvironments([...environments, newEnv]);
        addToast(`Environment "${name}" created`, 'success', 2000);
      } else if (modal.type === 'folder' && modal.targetId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const foldersInCurrentLevel = (collectionDoc.folders || []).filter(f => f.parentId === (modal.targetFolderId || null));
          const newFolder = {
            id: uuidv4(),
            name,
            parentId: modal.targetFolderId || null,
            position: foldersInCurrentLevel.length
          };
          const updatedFolders = [...(collectionDoc.folders || []), newFolder];
          await apiService.updateCollection(modal.targetId, {
            folders: updatedFolders
          });
          setCollections(collections.map(c => c.id === modal.targetId ? { ...c, folders: updatedFolders } : c));
          addToast(`Folder "${name}" created`, 'success', 2000);
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
          const updatedRequests = [...(collectionDoc.requests || []), newRequest];
          await apiService.updateCollection(modal.targetId, {
            requests: updatedRequests
          });
          setCollections(collections.map(c => c.id === modal.targetId ? { ...c, requests: updatedRequests } : c));
          setActiveRequest(newRequest);
          setActiveView('request');
          addToast(`Request "${name}" created`, 'success', 2000);
        }
      } else if (modal.type === 'rename_collection' && modal.targetId) {
        await apiService.updateCollection(modal.targetId, { name });
        setCollections(collections.map(c => c.id === modal.targetId ? { ...c, name } : c));
        addToast('Collection renamed', 'success', 2000);
      } else if (modal.type === 'rename_folder' && modal.targetId && modal.targetFolderId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const updatedFolders = (collectionDoc.folders || []).map(f => f.id === modal.targetFolderId ? { ...f, name } : f);
          await apiService.updateCollection(modal.targetId, { folders: updatedFolders });
          setCollections(collections.map(c => c.id === modal.targetId ? { ...c, folders: updatedFolders } : c));
          addToast('Folder renamed', 'success', 2000);
        }
      } else if (modal.type === 'rename_request' && modal.targetId && modal.targetRequestId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const updatedRequests = (collectionDoc.requests || []).map(r => r.id === modal.targetRequestId ? { ...r, name } : r);
          await apiService.updateCollection(modal.targetId, { requests: updatedRequests });
          setCollections(collections.map(c => c.id === modal.targetId ? { ...c, requests: updatedRequests } : c));
          if (activeRequest?.id === modal.targetRequestId) {
            setActiveRequest({ ...activeRequest, name });
          }
          addToast('Request renamed', 'success', 2000);
        }
      } else if (modal.type === 'workspace') {
        const newWorkspace = await apiService.createWorkspace(name, user?.uid || '');
        setWorkspaces([...workspaces, newWorkspace]);
        setCurrentWorkspace(newWorkspace);
        addToast(`Workspace "${name}" created`, 'success', 2000);
      } else if (modal.type === 'rename_workspace' && modal.targetId) {
        await apiService.updateWorkspace(modal.targetId, name);
        const updatedWSList = workspaces.map(w => w.id === modal.targetId ? { ...w, name } : w);
        setWorkspaces(updatedWSList);
        if (currentWorkspace && currentWorkspace.id === modal.targetId) {
          setCurrentWorkspace({ ...currentWorkspace, name });
        }
        addToast('Workspace renamed', 'success', 2000);
      } else if (modal.type === 'deploy' && modal.targetId) {
        const collectionDoc = collections.find(c => c.id === modal.targetId);
        if (collectionDoc) {
          const newDeployment = await apiService.createDeployment({
            id: uuidv4(),
            workspaceId: currentWorkspace.id,
            collectionId: collectionDoc.id,
            collectionName: collectionDoc.name,
            version: name || 'v1',
            requests: collectionDoc.requests || []
          });
          setDeployments([newDeployment, ...deployments]);
          addToast(`Deployed version "${name || 'v1'}" successfully`, 'success', 2000);
        }
      }
    } catch (e) {
      console.error("Failed to submit form:", e);
      addToast('Operation failed', 'error');
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
            
            const created = await apiService.createCollection(newCollection);
            const state = useStore.getState();
            state.setCollections([...state.collections, created]);
          }
          
          // Import environments
          const importedEnvs = [];
          for (const env of parsedData.environments) {
            const newEnvId = uuidv4();
            const newEnv = { ...env, id: newEnvId, workspaceId: currentWorkspace.id };
            const createdEnv = await apiService.createEnvironment(newEnv);
            importedEnvs.push(createdEnv);
          }
          const state = useStore.getState();
          state.setEnvironments([...state.environments, ...importedEnvs]);
          
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Single Environment Import (Native or Postman)
        if ((parsedData.variables || parsedData.values) && parsedData.name && !parsedData.collections && !parsedData.item) {
          const newEnvId = uuidv4();
          
          // Map Postman "values" to our "variables" if needed
          const variables = parsedData.variables || (parsedData.values || []).map((v: any) => ({
            key: v.key || '',
            value: v.value || '',
            enabled: v.enabled !== undefined ? v.enabled : true
          }));

          const newEnv = { 
            ...parsedData, 
            id: newEnvId, 
            workspaceId: currentWorkspace.id,
            variables,
            createdAt: parsedData.createdAt || Date.now()
          };
          
          // Cleanup Postman specific fields if they exist
          delete (newEnv as any).values;
          delete (newEnv as any)._postman_variable_scope;
          delete (newEnv as any)._postman_exported_at;
          delete (newEnv as any)._postman_exported_using;

          const createdEnv = await apiService.createEnvironment(newEnv);
          const state = useStore.getState();
          state.setEnvironments([...state.environments, createdEnv]);
          addToast(`Environment "${newEnv.name}" imported`, 'success', 2000);
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

          // Save to Postgres
          const created = await apiService.createCollection(collectionDoc);
          const state = useStore.getState();
          state.setCollections([...state.collections, created]);
          
        }
      } catch (error) {
        console.error("Error parsing Postman/JSON file", error);
        alert("Failed to import file. Please ensure it's a valid JSON format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    downloadFile(dataStr, `openpost_export_${new Date().toISOString().split('T')[0]}.json`);
    setShowExportMenu(false);
  };

  const handleExportPostman = () => {
    if (!currentWorkspace) return;
    
    const exportData = exportToPostman(collections);
    const dataStr = JSON.stringify(exportData, null, 2);
    downloadFile(dataStr, `openpost_postman_collection_${new Date().toISOString().split('T')[0]}.json`);
    setShowExportMenu(false);
  };

  const handleGatewayExport = (collection: ApiCollection, type: GatewayType) => {
    const config = exportToGateway(collection, type);
    const extension = type === 'spring_cloud_gateway' ? 'yaml' : 'json';
    const blob = new Blob([config], { type: extension === 'json' ? 'application/json' : 'text/yaml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '_').toLowerCase()}_${type}.${extension}`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`${type.replace(/_/g, ' ')} config exported`, 'success', 2000);
  };

  const handleOpenAPIExport = (collection: ApiCollection) => {
    const config = exportToOpenAPI(collection);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '_').toLowerCase()}_openapi.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('OpenAPI JSON exported', 'success', 2000);
  };

  const handleExportEnvironment = (env: Environment) => {
    const dataStr = JSON.stringify(env, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${env.name.replace(/\s+/g, '_').toLowerCase()}_env.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Environment exported', 'success', 2000);
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'request' | 'collection' | 'environment', collectionId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id, type, collectionId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, id: string, type: 'collection' | 'folder' | 'request') => {
    e.preventDefault();
    setDraggedOverId(id);
    setDraggedOverType(type);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedOverId(null);
    setDraggedOverType(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, targetType: 'collection' | 'folder' | 'request', collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDraggedOverId(null);
    setDraggedOverType(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      
      const source = JSON.parse(dataStr);
      
      // REORDERING LOGIC: same type
      if (source.type === targetType && source.id !== targetId) {
        if (source.type === 'collection') {
          // Reorder collections
          const sourceIndex = collections.findIndex(c => c.id === source.id);
          const targetIndex = collections.findIndex(c => c.id === targetId);
          if (sourceIndex !== -1 && targetIndex !== -1) {
            const sorted = [...collections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            const sIdx = sorted.findIndex(c => c.id === source.id);
            const tIdx = sorted.findIndex(c => c.id === targetId);
            
            const newCollections = [...sorted];
            const [moved] = newCollections.splice(sIdx, 1);
            newCollections.splice(tIdx, 0, moved);
            
            // Update all positions in database and local store
            const positioned = newCollections.map((c, index) => ({ ...c, position: index }));
            setCollections(positioned);
            
            for (let i = 0; i < positioned.length; i++) {
              if (sorted[i]?.position !== i) {
                await apiService.updateCollection(positioned[i].id, { position: i });
              }
            }
            return;
          }
        } else if (source.type === 'folder' && source.collectionId === collectionId) {
          // Reorder folders within same collection and same parent level
          const collectionDoc = collections.find(c => c.id === collectionId);
          if (collectionDoc) {
            const sourceFolder = collectionDoc.folders?.find(f => f.id === source.id);
            const targetFolder = collectionDoc.folders?.find(f => f.id === targetId);
            
            if (sourceFolder && targetFolder && sourceFolder.parentId === targetFolder.parentId) {
              const sameLevelFolders = (collectionDoc.folders || [])
                .filter(f => f.parentId === sourceFolder.parentId)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
              
              const sIdx = sameLevelFolders.findIndex(f => f.id === source.id);
              const tIdx = sameLevelFolders.findIndex(f => f.id === targetId);
              
              if (sIdx !== -1 && tIdx !== -1) {
                const newLevel = [...sameLevelFolders];
                const [moved] = newLevel.splice(sIdx, 1);
                newLevel.splice(tIdx, 0, moved);
                
                const updatedFolders = (collectionDoc.folders || []).map(f => {
                  const idx = newLevel.findIndex(nl => nl.id === f.id);
                  if (idx !== -1) return { ...f, position: idx };
                  return f;
                });
                
                setCollections(collections.map(c => c.id === collectionId ? { ...c, folders: updatedFolders } : c));
                await apiService.updateCollection(collectionId, { folders: updatedFolders });
                return;
              }
            }
          }
        } else if (source.type === 'request') {
          // Reorder requests by placing the dragged request right before the target request
          const sourceCollection = collections.find(c => c.id === source.collectionId);
          const targetCollection = collections.find(c => c.id === collectionId);
          const sourceRequest = sourceCollection?.requests?.find(r => r.id === source.id);
          const targetRequest = targetCollection?.requests?.find(r => r.id === targetId);

          if (sourceCollection && targetCollection && sourceRequest && targetRequest) {
            if (source.collectionId === collectionId) {
              // Same collection reordering
              const updatedRequests = sourceCollection.requests.filter(r => r.id !== source.id);
              const targetIndex = updatedRequests.findIndex(r => r.id === targetId);
              if (targetIndex !== -1) {
                const movedRequest = { ...sourceRequest, folderId: targetRequest.folderId };
                updatedRequests.splice(targetIndex, 0, movedRequest);
                
                setCollections(collections.map(c => c.id === collectionId ? { ...c, requests: updatedRequests } : c));
                await apiService.updateCollection(collectionId, { requests: updatedRequests });
              }
            } else {
              // Cross collection request reordering
              const sourceRequestsUpdated = sourceCollection.requests.filter(r => r.id !== source.id);
              const targetRequestsUpdated = [...targetCollection.requests];
              const targetIndex = targetRequestsUpdated.findIndex(r => r.id === targetId);
              if (targetIndex !== -1) {
                const movedRequest = { ...sourceRequest, collectionId: collectionId, folderId: targetRequest.folderId };
                targetRequestsUpdated.splice(targetIndex, 0, movedRequest);
                
                setCollections(collections.map(c => {
                  if (c.id === source.collectionId) return { ...c, requests: sourceRequestsUpdated };
                  if (c.id === collectionId) return { ...c, requests: targetRequestsUpdated };
                  return c;
                }));
                await apiService.updateCollection(source.collectionId, { requests: sourceRequestsUpdated });
                await apiService.updateCollection(collectionId, { requests: targetRequestsUpdated });
              }
            }
            return;
          }
        } else if (source.type === 'environment' && activeTab === 'environments') {
          // Reorder environments
          const sourceIndex = environments.findIndex(e => e.id === source.id);
          const targetIndex = environments.findIndex(e => e.id === targetId);
          if (sourceIndex !== -1 && targetIndex !== -1) {
            const sorted = [...environments].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            const sIdx = sorted.findIndex(e => e.id === source.id);
            const tIdx = sorted.findIndex(e => e.id === targetId);
            
            const newEnvs = [...sorted];
            const [moved] = newEnvs.splice(sIdx, 1);
            newEnvs.splice(tIdx, 0, moved);
            
            const positioned = newEnvs.map((env, index) => ({ ...env, position: index }));
            setEnvironments(positioned);
            
            for (let i = 0; i < positioned.length; i++) {
              if (sorted[i]?.position !== i) {
                await apiService.updateEnvironment(positioned[i].id, { position: i });
              }
            }
            return;
          }
        }
      }

      // 2. Dragging a Request to a Collection Header or a Folder
      if (source.type === 'request' && (targetType === 'collection' || targetType === 'folder')) {
        const sourceCollection = collections.find(c => c.id === source.collectionId);
        const targetCollection = collections.find(c => c.id === collectionId);
        const sourceRequest = sourceCollection?.requests?.find(r => r.id === source.id);

        if (sourceCollection && targetCollection && sourceRequest) {
          const targetFolderId = targetType === 'collection' ? null : targetId;
          
          if (source.collectionId === collectionId) {
            // Same collection movement
            const updatedRequests = [...sourceCollection.requests];
            const reqIndex = updatedRequests.findIndex(r => r.id === source.id);
            if (reqIndex !== -1) {
              updatedRequests[reqIndex] = {
                ...updatedRequests[reqIndex],
                folderId: targetFolderId
              };
              setCollections(collections.map(c => c.id === collectionId ? { ...c, requests: updatedRequests } : c));
              await apiService.updateCollection(collectionId, { requests: updatedRequests });
            }
          } else {
            // Cross collection movement
            const sourceRequestsUpdated = sourceCollection.requests.filter(r => r.id !== source.id);
            const movedRequest = { ...sourceRequest, collectionId: collectionId, folderId: targetFolderId };
            const targetRequestsUpdated = [...targetCollection.requests, movedRequest];

            setCollections(collections.map(c => {
              if (c.id === source.collectionId) return { ...c, requests: sourceRequestsUpdated };
              if (c.id === collectionId) return { ...c, requests: targetRequestsUpdated };
              return c;
            }));
            await apiService.updateCollection(source.collectionId, { requests: sourceRequestsUpdated });
            await apiService.updateCollection(collectionId, { requests: targetRequestsUpdated });
          }
          return;
        }
      }

      // 3. Nesting folders
      if (source.type === 'folder' && (targetType === 'collection' || targetType === 'folder')) {
        const collectionDoc = collections.find(c => c.id === collectionId);
        if (!collectionDoc) return;

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
        
        setCollections(collections.map(c => c.id === collectionId ? { ...c, folders: updatedFolders } : c));
        await apiService.updateCollection(collectionId, { folders: updatedFolders });
      }
    } catch (err) {
      console.error('Drag and drop error', err);
    }
  };

  const handleBulkDelete = () => {
    if (selectedRequestIds.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Requests',
      message: `Are you sure you want to delete ${selectedRequestIds.length} selected requests?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          // Group by collection to minimize API calls
          const collectionRequestMap: Record<string, string[]> = {};
          selectedRequestIds.forEach(id => {
            const req = collections.flatMap(c => c.requests || []).find(r => r.id === id);
            if (req) {
              if (!collectionRequestMap[req.collectionId]) collectionRequestMap[req.collectionId] = [];
              collectionRequestMap[req.collectionId].push(id);
            }
          });

          const newCollections = [...collections];
          for (const [colId, reqIds] of Object.entries(collectionRequestMap)) {
            const colIndex = newCollections.findIndex(c => c.id === colId);
            if (colIndex !== -1) {
              const updatedRequests = (newCollections[colIndex].requests || []).filter(r => !reqIds.includes(r.id));
              await apiService.updateCollection(colId, { requests: updatedRequests });
              newCollections[colIndex] = { ...newCollections[colIndex], requests: updatedRequests };
            }
          }
          
          setCollections(newCollections);
          setIsBulkEditMode(false);
          addToast(`Deleted ${selectedRequestIds.length} requests`, 'success');
        } catch (error) {
          console.error("Bulk delete failed:", error);
          addToast('Bulk delete failed', 'error');
        }
      }
    });
  };

  const handleBulkDuplicate = async () => {
    if (selectedRequestIds.length === 0) return;
    
    try {
      const newCollections = [...collections];
      let duplicatedCount = 0;

      // Group by collection
      const collectionRequestMap: Record<string, RequestItem[]> = {};
      selectedRequestIds.forEach(id => {
        const req = collections.flatMap(c => c.requests || []).find(r => r.id === id);
        if (req) {
          if (!collectionRequestMap[req.collectionId]) collectionRequestMap[req.collectionId] = [];
          collectionRequestMap[req.collectionId].push(req);
        }
      });

      for (const [colId, reqs] of Object.entries(collectionRequestMap)) {
        const colIndex = newCollections.findIndex(c => c.id === colId);
        if (colIndex !== -1) {
          const newReqs = reqs.map(r => ({
            ...r,
            id: uuidv4(),
            name: `${r.name} (Copy)`
          }));
          const updatedRequests = [...(newCollections[colIndex].requests || []), ...newReqs];
          await apiService.updateCollection(colId, { requests: updatedRequests });
          newCollections[colIndex] = { ...newCollections[colIndex], requests: updatedRequests };
          duplicatedCount += newReqs.length;
        }
      }

      setCollections(newCollections);
      setIsBulkEditMode(false);
      addToast(`Duplicated ${duplicatedCount} requests`, 'success');
    } catch (error) {
      console.error("Bulk duplicate failed:", error);
      addToast('Bulk duplicate failed', 'error');
    }
  };

  const handleBulkMove = (targetCollectionId: string, targetFolderId: string | null = null) => {
    if (selectedRequestIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Bulk Move Requests',
      message: `Move ${selectedRequestIds.length} requests to the selected location?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const newCollections = [...collections];
          
          // 1. Get all requests to move
          const requestsToMove: RequestItem[] = [];
          const sourceCollectionIds = new Set<string>();

          selectedRequestIds.forEach(id => {
            const req = collections.flatMap(c => c.requests || []).find(r => r.id === id);
            if (req) {
              requestsToMove.push({ ...req, collectionId: targetCollectionId, folderId: targetFolderId });
              sourceCollectionIds.add(req.collectionId);
            }
          });

          // 2. Remove from sources
          for (const srcColId of sourceCollectionIds) {
            const colIdx = newCollections.findIndex(c => c.id === srcColId);
            if (colIdx !== -1) {
              const updated = (newCollections[colIdx].requests || []).filter(r => !selectedRequestIds.includes(r.id));
              await apiService.updateCollection(srcColId, { requests: updated });
              newCollections[colIdx] = { ...newCollections[colIdx], requests: updated };
            }
          }

          // 3. Add to target (it might be one of the sources, which is fine since we updated newCollections)
          const targetIdx = newCollections.findIndex(c => c.id === targetCollectionId);
          if (targetIdx !== -1) {
            const updated = [...(newCollections[targetIdx].requests || []), ...requestsToMove];
            await apiService.updateCollection(targetCollectionId, { requests: updated });
            newCollections[targetIdx] = { ...newCollections[targetIdx], requests: updated };
          }

          setCollections(newCollections);
          setIsBulkEditMode(false);
          setModal({ ...modal, isOpen: false });
          addToast(`Moved ${requestsToMove.length} requests`, 'success');
        } catch (error) {
          console.error("Bulk move failed:", error);
          addToast('Bulk move failed', 'error');
        }
      }
    });
  };

  const renderCollectionItems = (collectionId: string, requests: RequestItem[], folders: any[], parentId: string | null = null) => {
    const currentFolders = (folders || [])
      .filter(f => (f.parentId || null) === parentId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
                onDragEnter={(e) => handleDragEnter(e, folder.id, 'folder')}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, folder.id, 'folder', collectionId)}
                onClick={(e) => toggleExpand(folder.id, e)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group justify-between transition-all duration-150",
                  draggedOverId === folder.id && draggedOverType === 'folder' && "bg-[var(--bg-hover)] border-l-2 border-[var(--primary)] pl-1.5"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                  </div>
                  <Folder className="w-3.5 h-3.5 text-[var(--icon-color)]" />
                  <span className="text-xs truncate">{folder.name}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const shareUrl = `${window.location.origin}?share_type=folder&share_id=${folder.id}&collection_id=${collectionId}`;
                      navigator.clipboard.writeText(shareUrl);
                      addToast('Folder share link copied to clipboard!', 'success', 2500);
                    }}
                    className="text-[var(--text-secondary)] hover:text-emerald-500 p-0.5 rounded transition-colors"
                    title="Share Folder Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
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
                    <Folder className="w-3.5 h-3.5 text-[var(--icon-color)]" />
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
                        await apiService.updateCollection(collectionDoc.id, { folders: updatedFolders, requests: updatedRequests });
                        setCollections(collections.map(c => c.id === collectionDoc.id ? { ...c, folders: updatedFolders, requests: updatedRequests } : c));
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
                              
                              await apiService.updateCollection(collection.id, { 
                                folders: updatedFolders,
                                requests: updatedRequests
                              });
                              setCollections(collections.map(c => c.id === collection.id ? { ...c, folders: updatedFolders, requests: updatedRequests } : c));
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
            draggable={!isBulkEditMode}
            onDragStart={(e) => !isBulkEditMode && handleDragStart(e, req.id, 'request', collectionId)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => !isBulkEditMode && handleDragEnter(e, req.id, 'request')}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={(e) => !isBulkEditMode && handleDrop(e, req.id, 'request', collectionId)}
            onClick={() => { 
              if (isBulkEditMode) {
                toggleRequestSelection(req.id);
              } else {
                setActiveRequest(req); 
                setActiveView('request');
                openTab({ id: req.id, type: 'request', name: req.name, method: req.method });
              }
            }}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer mt-1 group/req transition-all duration-150",
              activeRequest?.id === req.id && !isBulkEditMode ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]",
              selectedRequestIds.includes(req.id) && isBulkEditMode ? "bg-indigo-500/10 ring-1 ring-indigo-500/30" : "",
              draggedOverId === req.id && draggedOverType === 'request' && "bg-[var(--bg-hover)] border-l-2 border-[var(--primary)] pl-1.5"
            )}
          >
            {isBulkEditMode ? (
              <div className="shrink-0 flex items-center justify-center w-4 h-4">
                {selectedRequestIds.includes(req.id) ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                )}
              </div>
            ) : null}
            <span className={cn(
              "text-[10px] font-bold w-10 shrink-0",
              req.method === 'GET' ? "text-[var(--text-get)]" :
              req.method === 'POST' ? "text-[var(--text-post)]" :
              req.method === 'PUT' ? "text-[var(--text-put)]" :
              req.method === 'DELETE' ? "text-[var(--text-delete)]" : "text-[var(--text-secondary)]"
            )}>{req.method}</span>
            <span className="text-xs truncate flex-1">{req.name}</span>
            <div className="flex items-center opacity-0 group-hover/req:opacity-100 transition-opacity gap-0.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}?share_type=request&share_id=${req.id}&collection_id=${collectionId}`;
                  navigator.clipboard.writeText(shareUrl);
                  addToast('Request share link copied to clipboard!', 'success', 2500);
                }}
                className="p-0.5 rounded text-[var(--text-secondary)] hover:text-emerald-500 transition-colors"
                title="Share Request Link"
              >
                <Share2 className="w-3 h-3" />
              </button>
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
                      await apiService.updateCollection(collection.id, { requests: updatedRequests });
                      setCollections(collections.map(c => c.id === collection.id ? { ...c, requests: updatedRequests } : c));
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
                          await apiService.updateCollection(collection.id, { requests: updatedRequests });
                          setCollections(collections.map(c => c.id === collection.id ? { ...c, requests: updatedRequests } : c));
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
            <div className="w-6 h-6 bg-[var(--primary)] rounded flex items-center justify-center font-bold text-xs text-white">
              <Server className="w-3.5 h-3.5" />
            </div>
            <span>OpenPost</span>
          </h1>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                title="Export Data"
              >
                <Download className="w-4 h-4" />
              </button>
              
              {showExportMenu && (
                <div className="absolute top-full mt-1 right-0 w-48 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-lg shadow-xl py-1 z-50">
                  <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Export Format
                  </div>
                  <button 
                    onClick={handleExportData}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                  >
                    <Server className="w-3.5 h-3.5" />
                    OpenPost Format
                  </button>
                  <button 
                    onClick={handleExportPostman}
                    className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Postman Collection (v2.1)
                  </button>
                </div>
              )}
            </div>
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
                                  await apiService.deleteWorkspace(ws.id);
                                  const remaining = workspaces.filter(w => w.id !== ws.id);
                                  setWorkspaces(remaining);
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

      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]/50">
        <div className="relative">
          <button
            onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded hover:border-[var(--border-strong)] transition-all outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="w-1 h-3 bg-[var(--primary)] rounded-full"></span>
              <span>{activeTab === 'collections' ? 'Collections' : 
                     activeTab === 'environments' ? 'Environments' : 
                     activeTab === 'deployments' ? 'Mock API Servers' : 
                     activeTab === 'history' ? 'History' : 
                     activeTab === 'tests' ? 'Tests & Runners' : activeTab}</span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200", isNavDropdownOpen && "rotate-180")} />
          </button>

          {isNavDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNavDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {[
                  { id: 'collections', label: 'Collections', icon: Folder },
                  { id: 'environments', label: 'Environments', icon: Globe },
                  { id: 'deployments', label: 'Mocks', icon: Rocket },
                  { id: 'history', label: 'History', icon: History },
                  { id: 'tests', label: 'Tests', icon: Play }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsNavDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-left transition-colors",
                      activeTab === item.id 
                        ? "bg-[var(--primary)] text-white" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    )}
                  >
                    <item.icon className={cn("w-3.5 h-3.5", activeTab === item.id ? "text-white" : "text-[var(--text-secondary)]")} />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-2 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-[var(--icon-color)]" />
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
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setIsBulkEditMode(!isBulkEditMode)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    isBulkEditMode ? "text-indigo-500 bg-indigo-500/10" : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                  )}
                  title="Bulk Edit Mode"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setModal({ isOpen: true, title: 'New Collection', type: 'collection' })}
                  className="p-1 rounded text-[var(--icon-color)] hover:text-[var(--text-primary)] transition-colors"
                  title="New Collection"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {isWorkspaceLoading ? (
              renderCollectionsSkeleton()
            ) : (
              <>
                {filteredCollections.map(collection => {
              const isExpanded = searchQuery ? true : expandedItems.has(collection.id);
              return (
                <div key={collection.id} className="mb-2">
                  <div 
                    draggable
                    onDragStart={(e) => handleDragStart(e, collection.id, 'collection', collection.id)}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, collection.id, 'collection')}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, collection.id, 'collection', collection.id)}
                    onClick={(e) => toggleExpand(collection.id, e)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group justify-between transition-all duration-150",
                      draggedOverId === collection.id && draggedOverType === 'collection' && "bg-[var(--bg-hover)] border-l-2 border-[var(--primary)] pl-1.5"
                    )}
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
                                const shareUrl = `${window.location.origin}?share_type=collection&share_id=${collection.id}`;
                                navigator.clipboard.writeText(shareUrl);
                                addToast('Collection share link copied to clipboard!', 'success', 2500);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Share2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="font-semibold text-emerald-500">Share Collection Link</span>
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
                              <Folder className="w-4 h-4 text-[var(--icon-color)] shrink-0" />
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
                                  
                                  const created = await apiService.createCollection(newCollection);
                                  const state = useStore.getState();
                                  state.setCollections([...state.collections, created]);
                                } catch (error) {
                                  console.error("Failed to duplicate collection:", error);
                                }
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <Copy className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                              <span>Duplicate Collection</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Export Data & Docs</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAPIExport(collection);
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <FileDown className="w-4 h-4 text-purple-500 shrink-0" />
                              <span>Swagger / OpenAPI (JSON)</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Export Gateway Config</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGatewayExport(collection, 'krakend');
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <FileDown className="w-4 h-4 text-orange-500 shrink-0" />
                              <span>KrakenD Config</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGatewayExport(collection, 'kong');
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <FileDown className="w-4 h-4 text-blue-500 shrink-0" />
                              <span>Kong Declarative</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGatewayExport(collection, 'spring_cloud_gateway');
                                setActiveDropdown(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                            >
                              <FileDown className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Spring Cloud Gateway</span>
                            </button>
                            <div className="h-px bg-[var(--border-subtle)] my-1" />
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
                                      await apiService.deleteCollection(collection.id);
                                      setCollections(collections.filter(c => c.id !== collection.id));
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
              </>
            )}
          </div>
        ) : activeTab === 'environments' ? (
          <div>
             <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Environments</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Import Environment"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setModal({ isOpen: true, title: 'New Environment', type: 'environment' })}
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  title="New Environment"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {isWorkspaceLoading ? (
              renderEnvironmentsSkeleton()
            ) : (
              <>
                {filteredEnvironments.map(env => (
              <div 
                key={env.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, env.id, 'environment', 'env_root')}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, env.id, 'environment' as any, 'env_root')}
                onClick={() => { 
                  setEditingEnvironment(env); 
                  setActiveView('environment'); 
                  openTab({ id: env.id, type: 'environment', name: env.name });
                }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer text-[var(--text-primary)] group/env justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Settings2 className="w-4 h-4 shrink-0 text-[var(--icon-color)]" />
                  <span className="text-xs truncate">{env.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/env:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportEnvironment(env);
                    }}
                    className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Export Environment"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const newEnv = await apiService.createEnvironment({
                          id: uuidv4(),
                          workspaceId: currentWorkspace.id,
                          name: `Copy of ${env.name}`,
                          variables: env.variables || [],
                          position: environments.length
                        });
                        setEnvironments([...environments, newEnv]);
                      } catch (error) {
                        console.error("Failed to duplicate environment:", error);
                      }
                    }}
                    className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Duplicate Environment"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmModal({
                        isOpen: true,
                        title: 'Delete Environment',
                        message: `Are you sure you want to delete the environment "${env.name}"?`,
                        onConfirm: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          try {
                            await apiService.deleteEnvironment(env.id);
                            setEnvironments(environments.filter(e => e.id !== env.id));
                            addToast('Environment deleted', 'success', 2000);
                          } catch (error) {
                            console.error("Failed to delete environment:", error);
                          }
                        }
                      });
                    }}
                    className="p-1 rounded text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                    title="Delete Environment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredEnvironments.length === 0 && (
              <div className="text-center p-4 text-sm text-[var(--text-secondary)]">
                {searchQuery ? "No results found." : "No environments found."}
              </div>
            )}
              </>
            )}
          </div>
        ) : activeTab === 'deployments' ? (
          <div>
            <div className="flex items-center justify-between px-2 py-2 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Mock API Servers</span>
            </div>
            {isWorkspaceLoading ? (
              renderDeploymentsSkeleton()
            ) : (
              <>
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
                              await apiService.deleteDeployment(deploy.id);
                              setDeployments(deployments.filter(d => d.id !== deploy.id));
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
              </>
            )}
          </div>
        ) : activeTab === 'history' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 py-1.5 group">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Request History</span>
              {filteredHistory.length > 0 && (
                <button 
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Clear History',
                      message: 'Are you sure you want to clear your entire request history for this workspace?',
                      onConfirm: () => {
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        clearHistory(currentWorkspace?.id || 'default');
                        addToast('History cleared', 'success');
                      }
                    });
                  }}
                  className="text-[10px] text-red-500 hover:text-red-400 font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                  title="Clear Workspace History"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {isWorkspaceLoading ? (
              renderHistorySkeleton()
            ) : (
              <div className="flex flex-col gap-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                {filteredHistory.map((item) => {
                const isSuccess = item.responseStatus && item.responseStatus < 400;
                const statusColor = item.responseStatus === 0 
                  ? 'text-gray-400 border-gray-500/30 bg-gray-500/10'
                  : isSuccess 
                    ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' 
                    : 'text-red-500 border-red-500/30 bg-red-500/10';
                    
                const methodColor = item.method === 'GET' ? 'text-blue-400'
                  : item.method === 'POST' ? 'text-emerald-400'
                  : item.method === 'PUT' ? 'text-amber-400'
                  : item.method === 'DELETE' ? 'text-red-400'
                  : 'text-purple-400';

                return (
                  <div
                    key={item.id}
                    onClick={() => handleHistoryItemClick(item)}
                    className="flex flex-col gap-1.5 p-2 rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer group/hist relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={cn("text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0", statusColor)}>
                          {item.responseStatus || 'ERR'}
                        </span>
                        <span className={cn("text-[10px] font-mono font-bold shrink-0", methodColor)}>
                          {item.method}
                        </span>
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover/hist:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHistoryItemClick(item, true);
                          }}
                          className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                          title="Re-run Request"
                        >
                          <Play className="w-3 h-3 fill-emerald-500/20" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(item.id);
                            addToast('History item removed', 'success', 2000);
                          }}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Remove from history"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-[var(--text-secondary)] font-mono truncate px-1">
                      {item.url}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[var(--text-secondary)] px-1 pt-1 border-t border-[var(--border-subtle)]/50">
                      <span>{item.timestamp}</span>
                      {item.timeMs !== undefined && item.timeMs > 0 && (
                        <span>{item.timeMs} ms</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredHistory.length === 0 && (
                <div className="text-center p-8 text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                  <History className="w-8 h-8 text-[var(--border-strong)]" />
                  <span>
                    {searchQuery ? "No history matches your search." : "No past requests. Execute a request to see it here!"}
                  </span>
                </div>
              )}
              </div>
            )}
          </div>
        ) : activeTab === 'tests' ? (
          <TestRunnerSidebar searchQuery={searchQuery} />
        ) : null}
      </div>

      <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-1 bg-[var(--bg-hover)]/30">
        <button 
          onClick={() => setIsMembersModalOpen(true)}
          disabled={!currentWorkspace}
          className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-full py-1.5 px-2 rounded hover:bg-[var(--bg-hover)] transition-colors outline-none disabled:opacity-50"
        >
          <span className="flex items-center gap-2 font-medium">
            <Users className="w-4 h-4 text-[var(--primary)] shrink-0" />
            Manage Team Access
          </span>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        </button>
      </div>

      {/* Bulk Edit Toolbar */}
      {isBulkEditMode && selectedRequestIds.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-indigo-600 text-white rounded-lg shadow-2xl p-3 z-[60] flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">
              {selectedRequestIds.length}
            </div>
            <span className="text-xs font-semibold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDuplicate}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Duplicate Selected"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setModal({ 
                  isOpen: true, 
                  title: 'Move Selected Requests', 
                  type: 'bulk_move' 
                });
              }}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Move Selected"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={handleBulkDelete}
              className="p-1.5 hover:bg-red-400 rounded transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={() => setIsBulkEditMode(false)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Exit Bulk Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <WorkspaceMembersModal 
        isOpen={isMembersModalOpen} 
        onClose={() => setIsMembersModalOpen(false)} 
        workspaceId={currentWorkspace?.id || ''} 
      />
      
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

      {/* Bulk Move Modal */}
      {modal.isOpen && modal.type === 'bulk_move' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Select Destination</h3>
              <button onClick={() => setModal({ ...modal, isOpen: false })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {collections.map(col => (
                  <div key={col.id} className="space-y-1">
                    <button
                      onClick={() => handleBulkMove(col.id, null)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-2 text-[var(--text-primary)] font-medium"
                    >
                      {(() => {
                        const Icon = getCollectionIcon(col.icon);
                        return <Icon className="w-3.5 h-3.5" style={{ color: col.color || 'var(--primary)' }} />;
                      })()}
                      {col.name}
                    </button>
                    {(col.folders || []).map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => handleBulkMove(col.id, folder.id)}
                        className="w-full text-left ml-4 px-3 py-1.5 text-[11px] hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-2 text-[var(--text-secondary)]"
                      >
                        <Folder className="w-3 h-3 opacity-50" />
                        {folder.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-hover)]/50 border-t border-[var(--border-subtle)] flex justify-end">
              <button
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
