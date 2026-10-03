/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { api } from './lib/api';
import { apiService } from './lib/api';
import { useStore } from './store/useStore';
import { useAgentPing } from './hooks/useAgentPing';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { DeploymentPanel } from './components/DeploymentPanel';
import { CollectionDocPanel } from './components/CollectionDocPanel';
import { SettingsView } from './components/SettingsView';
import { CookieManager } from './components/CookieManager';
import { TestRunnerPanel } from './components/TestRunnerPanel';
import { MonitorsPanel } from './components/MonitorsPanel';
import { PublicDocView } from './components/PublicDocView';
import { TabBar } from './components/TabBar';
import { BottomDrawer } from './components/BottomDrawer';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { Toaster } from './components/Toaster';
import { ShareImportModal } from './components/ShareImportModal';
import { CurlImportModal } from './components/CurlImportModal';
import { AgentDownloadModal } from './components/AgentDownloadModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { QuickEnvironmentModal } from './components/QuickEnvironmentModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { SaveToCollectionModal } from './components/SaveToCollectionModal';
import { ConflictResolutionModal } from './components/ConflictResolutionModal';
import { SyncLogModal } from './components/SyncLogModal';
import { DeveloperDocsPage } from './components/DeveloperDocsPage';
import { isDesktopEnvironment } from './utils/platform';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { LogOut, Eye, Keyboard, Cloud, CloudOff, RefreshCcw, MonitorSmartphone, Download, HelpCircle, BookOpen, Sun, Moon, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Columns2, Rows2, LayoutGrid, Maximize2, Minimize2, Move, GripHorizontal, User, Server, PanelRight, TerminalSquare, RefreshCw, Search } from 'lucide-react';
import { Workspace, Theme, ApiCollection, RequestItem } from './types';
import { cn } from './utils';
import { v4 as uuidv4 } from 'uuid';
import { syncEngine } from './lib/syncEngine';

export default function App() {
  useAgentPing();
  useGlobalShortcuts();
  const { 
    user, 
    setUser, 
    setWorkspaces, 
    currentWorkspace, 
    setCurrentWorkspace, 
    setCollections, 
    environments, 
    setEnvironments, 
    setDeployments,
    currentEnvironment, 
    setCurrentEnvironment, 
    activeView, 
    setActiveView,
    theme,
    setTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    requestPanelWidth,
    setRequestPanelWidth,
    responseCollapsed,
    setResponseCollapsed,
    layoutMode,
    setLayoutMode,
    agentMode,
    setAgentMode,
    addToast,
    isWorkspaceLoading,
    setIsWorkspaceLoading,
    setActiveRequest,
    openTab,
    isAgentModalOpen,
    setIsAgentModalOpen,
    setIsQuickSearchOpen,
    setIsHelpModalOpen,
    setIsDocsModalOpen,
    isDocsPageOpen,
    setIsDocsPageOpen,
    setIsQuickEnvModalOpen,
    setIsKeyboardShortcutsModalOpen,
    setIsSyncLogModalOpen
  } = useStore();
  const isDesktop = isDesktopEnvironment();
  const [loading, setLoading] = useState(true);
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastSuccessTime, setLastSuccessTime] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    syncEngine.init();

    const handleSyncUpdate = (e: any) => setSyncQueueCount(e.detail);
    const handleSyncStarted = () => {
      setIsSyncing(true);
      addToast('Pushing offline changes to cloud', 'info', 3000, { title: 'Syncing...' });
    };
    const handleSyncFinished = (e: any) => {
      setIsSyncing(false);
      if (e.detail.remaining === 0) {
        addToast('All offline changes synced successfully', 'success', 3000, { title: 'Sync Complete' });
      }
    };
    const handleLogUpdate = (e: any) => {
      const logs = e.detail;
      setSyncedCount(logs.filter((l: any) => l.status === 'synced').length);
      if (logs.length > 0) {
        setLastSyncTime(logs[0].timestamp);
      }
      const lastSuccess = logs.find((l: any) => l.status === 'synced');
      if (lastSuccess) {
        setLastSuccessTime(lastSuccess.timestamp);
      }
    };
    const handleOnline = () => {
      setIsOffline(false);
      addToast('Connection restored.', 'success', 3000, { title: 'Back Online' });
    };
    const handleOffline = () => {
      setIsOffline(true);
      addToast('Changes will be saved locally and synced later.', 'warning', 3000, { title: 'You are offline' });
    };

    window.addEventListener('sync-queue-updated', handleSyncUpdate);
    window.addEventListener('sync-started', handleSyncStarted);
    window.addEventListener('sync-finished', handleSyncFinished);
    window.addEventListener('sync-log-updated', handleLogUpdate);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    syncEngine.getQueue().then(queue => {
      setSyncQueueCount(queue.length);
    });
    syncEngine.getLogs().then(logs => {
      setSyncedCount(logs.filter(l => l.status === 'synced').length);
      if (logs.length > 0) {
        setLastSyncTime(logs[0].timestamp);
      }
      const lastSuccess = logs.find((l: any) => l.status === 'synced');
      if (lastSuccess) {
        setLastSuccessTime(lastSuccess.timestamp);
      }
    });

    return () => {
      window.removeEventListener('sync-queue-updated', handleSyncUpdate);
      window.removeEventListener('sync-started', handleSyncStarted);
      window.removeEventListener('sync-finished', handleSyncFinished);
      window.removeEventListener('sync-log-updated', handleLogUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCurlImport = (curlData: { method: string; url: string; headers: Array<{ key: string; value: string }>; body: string }) => {
    const newReqId = `curl_${uuidv4().slice(0, 8)}`;
    const headersList = curlData.headers.map(h => ({ id: uuidv4(), key: h.key, value: h.value, enabled: true }));
    if (headersList.length === 0 || headersList[headersList.length - 1].key !== '') {
      headersList.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    let reqName = 'Imported cURL';
    if (curlData.url) {
      try {
        const parsedUrl = new URL(curlData.url.startsWith('http') ? curlData.url : `https://${curlData.url}`);
        reqName = parsedUrl.pathname.split('/').filter(Boolean).pop() || parsedUrl.hostname;
      } catch {
        reqName = curlData.url.slice(0, 20);
      }
    }

    const newRequest: RequestItem = {
      id: newReqId,
      collectionId: '',
      workspaceId: currentWorkspace?.id || 'default',
      name: `${curlData.method} ${reqName}`,
      method: curlData.method || 'GET',
      url: curlData.url || '',
      headers: headersList,
      params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
      body: {
        type: curlData.body ? 'raw' : 'none',
        content: curlData.body || ''
      },
      auth: { type: 'none' }
    };

    setActiveRequest(newRequest);
    openTab({
      id: newReqId,
      type: 'request',
      name: newRequest.name,
      method: newRequest.method
    });
    setActiveView('request');
    setIsCurlModalOpen(false);
    addToast(`Imported ${curlData.method} request from cURL!`, 'success');
  };
  const handleSyncWorkspace = async () => {
    if (!currentWorkspace) return;
    setIsWorkspaceLoading(true);
    try {
      const [collectionsData, environmentsData, deploymentsData] = await Promise.all([
        apiService.getCollections(currentWorkspace.id),
        apiService.getEnvironments(currentWorkspace.id),
        apiService.getDeployments(currentWorkspace.id),
      ]);
      setCollections(collectionsData);
      setEnvironments(environmentsData);
      setDeployments(deploymentsData);
      addToast('Workspace synced successfully', 'success');
    } catch (err) {
      console.error("Failed to sync workspace data:", err);
      addToast('Failed to sync workspace data', 'error');
    } finally {
      setIsWorkspaceLoading(false);
    }
  };

  const [publicDocId, setPublicDocId] = useState<string | null>(null);
  const [publicDocCollection, setPublicDocCollection] = useState<ApiCollection | null>(null);
  const [publicDocError, setPublicDocError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const processingInvitationsRef = useRef<Set<string>>(new Set());

  const [requestPanelHeight, setRequestPanelHeight] = useState(() => {
    return Number(localStorage.getItem('requestPanelHeight') || 50);
  });
  const [isResizingPanelsVertical, setIsResizingPanelsVertical] = useState(false);

  const [requestWindow, setRequestWindow] = useState(() => {
    try {
      const saved = localStorage.getItem('requestWindow');
      return saved ? JSON.parse(saved) : { x: 30, y: 30, width: 560, height: 580, isMaximized: false };
    } catch {
      return { x: 30, y: 30, width: 560, height: 580, isMaximized: false };
    }
  });

  const [responseWindow, setResponseWindow] = useState(() => {
    try {
      const saved = localStorage.getItem('responseWindow');
      return saved ? JSON.parse(saved) : { x: 620, y: 30, width: 560, height: 580, isMaximized: false };
    } catch {
      return { x: 620, y: 30, width: 560, height: 580, isMaximized: false };
    }
  });

  const [activeWindow, setActiveWindow] = useState<'request' | 'response'>('request');

  const [dragState, setDragState] = useState<{
    target: 'request' | 'response';
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    target: 'request' | 'response';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPanels(true);
  };

  const handleVerticalPanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPanelsVertical(true);
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, setSidebarWidth]);

  useEffect(() => {
    if (!isResizingPanels) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      const constrained = Math.max(20, Math.min(80, percentage));
      setRequestPanelWidth(constrained);
    };

    const handleMouseUp = () => {
      setIsResizingPanels(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPanels, setRequestPanelWidth]);

  useEffect(() => {
    if (!isResizingPanelsVertical) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentage = (relativeY / rect.height) * 100;
      const constrained = Math.max(15, Math.min(85, percentage));
      setRequestPanelHeight(constrained);
      localStorage.setItem('requestPanelHeight', String(constrained));
    };

    const handleMouseUp = () => {
      setIsResizingPanelsVertical(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPanelsVertical]);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const newX = Math.max(0, dragState.startLeft + dx);
      const newY = Math.max(0, dragState.startTop + dy);

      if (dragState.target === 'request') {
        setRequestWindow(prev => {
          const updated = { ...prev, x: newX, y: newY };
          localStorage.setItem('requestWindow', JSON.stringify(updated));
          return updated;
        });
      } else {
        setResponseWindow(prev => {
          const updated = { ...prev, x: newX, y: newY };
          localStorage.setItem('responseWindow', JSON.stringify(updated));
          return updated;
        });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  // ERP theme is fixed Ubuntu Orange (#E95420) via CSS tokens.
  // Legacy custom primaryColor overrides are cleared once.
  useEffect(() => {
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--icon-color');
    root.style.removeProperty('--border-focus');
    localStorage.removeItem('primaryColor');
  }, []);

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      const newWidth = Math.max(280, resizeState.startWidth + dx);
      const newHeight = Math.max(200, resizeState.startHeight + dy);

      if (resizeState.target === 'request') {
        setRequestWindow(prev => {
          const updated = { ...prev, width: newWidth, height: newHeight };
          localStorage.setItem('requestWindow', JSON.stringify(updated));
          return updated;
        });
      } else {
        setResponseWindow(prev => {
          const updated = { ...prev, width: newWidth, height: newHeight };
          localStorage.setItem('responseWindow', JSON.stringify(updated));
          return updated;
        });
      }
    };

    const handleMouseUp = () => {
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState]);

  const startDrag = (e: React.MouseEvent, target: 'request' | 'response') => {
    e.preventDefault();
    setActiveWindow(target);
    const win = target === 'request' ? requestWindow : responseWindow;
    setDragState({
      target,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: win.x,
      startTop: win.y
    });
  };

  const startResize = (e: React.MouseEvent, target: 'request' | 'response') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveWindow(target);
    const win = target === 'request' ? requestWindow : responseWindow;
    setResizeState({
      target,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: win.width,
      startHeight: win.height
    });
  };

  const toggleMaximize = (target: 'request' | 'response') => {
    if (target === 'request') {
      setRequestWindow(prev => {
        const updated = { ...prev, isMaximized: !prev.isMaximized };
        localStorage.setItem('requestWindow', JSON.stringify(updated));
        return updated;
      });
    } else {
      setResponseWindow(prev => {
        const updated = { ...prev, isMaximized: !prev.isMaximized };
        localStorage.setItem('responseWindow', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // proceed with local logout even if the server call fails
    }
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('public_doc');
    if (docId) {
      setPublicDocId(docId);
      setLoading(true);
      apiService.getSharedCollection(docId, 'doc')
        .then(col => {
          setPublicDocCollection(col);
          setLoading(false);
        })
        .catch(err => {
          setPublicDocError('This documentation is private or does not exist.');
          setLoading(false);
        });
      return;
    }
    const fetchUser = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        console.error("Failed to authenticate user", err);
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [setUser]);

  // Invitation handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitationToken = params.get('invitation');
    if (invitationToken && user) {
      if (processingInvitationsRef.current.has(invitationToken)) {
        return;
      }
      processingInvitationsRef.current.add(invitationToken);

      const acceptInvitation = async () => {
        try {
          await apiService.acceptInvitation(invitationToken, user.uid);
          // Remove param from URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          // Reload workspaces to show the new one
          const list = await apiService.getWorkspaces();
          setWorkspaces(list);
          addToast('Invitation accepted! You joined the workspace.', 'success');
        } catch (e: any) {
          console.error("Failed to accept invitation:", e);
          addToast(e.response?.data?.error || 'Failed to accept invitation', 'error');
        }
      };
      acceptInvitation();
    }
  }, [user, setWorkspaces, addToast]);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    
    const loadWorkspaces = async () => {
      try {
        let list = await apiService.getWorkspaces();
        if (!isMounted) return;

        if (list.length === 0) {
          // Create default workspace if none exist
          const newWS = await apiService.createWorkspace("My Workspace");
          list = [newWS];
        }

        setWorkspaces(list);
        setDataLoaded(true);

        const storedId = localStorage.getItem('lastWorkspaceId');
        if (list.length > 0) {
          const found = list.find(w => w.id === storedId);
          if (found) {
            if (!currentWorkspace || currentWorkspace.id !== found.id) {
              setCurrentWorkspace(found);
            }
          } else if (!currentWorkspace || !list.some(w => w.id === currentWorkspace.id)) {
            setCurrentWorkspace(list[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load workspaces:", err);
        if (isMounted) {
          setDataLoaded(true);
        }
      }
    };

    loadWorkspaces();
    return () => {
      isMounted = false;
    };
  }, [user, setWorkspaces, setCurrentWorkspace, currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) return;

    let isMounted = true;

    const loadWorkspaceData = async () => {
      setIsWorkspaceLoading(true);
      try {
        const [collectionsData, environmentsData, deploymentsData] = await Promise.all([
          apiService.getCollections(currentWorkspace.id),
          apiService.getEnvironments(currentWorkspace.id),
          apiService.getDeployments(currentWorkspace.id),
        ]);

        if (!isMounted) return;

        setCollections(collectionsData);
        setEnvironments(environmentsData);
        setDeployments(deploymentsData);
      } catch (err) {
        console.error("Failed to load workspace data:", err);
      } finally {
        if (isMounted) {
          setIsWorkspaceLoading(false);
        }
      }
    };

    loadWorkspaceData();
    return () => {
      isMounted = false;
    };
  }, [currentWorkspace, setCollections, setEnvironments, setDeployments, setIsWorkspaceLoading]);

  if (window.location.pathname.startsWith('/auth/callback')) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error') || params.get('error_description');

    if (window.opener) {
      if (error) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error }, window.location.origin);
      } else if (code) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code, state }, window.location.origin);
      }
    }

    setTimeout(() => {
      window.close();
    }, 2000);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-6">
        <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 rounded text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[var(--success)]/15 text-[var(--success)] flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-white mb-1">Authorization Successful!</h2>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">You have successfully authenticated with the provider.</p>
          <p className="text-[10px] text-[var(--text-tertiary)] animate-pulse">This window will close automatically in a moment...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen message="Authenticating session..." />;
  }

  if (user && !dataLoaded) {
    return <LoadingScreen message="Fetching workspaces..." />;
  }

  if (isDocsPageOpen && !isDesktop) {
    return <DeveloperDocsPage onBack={() => setIsDocsPageOpen(false)} />;
  }

  // Public docs (?public_doc=) render without login (PRD #53).
  if (publicDocId || publicDocError) {
    if (loading) {
      return <LoadingScreen message="Loading documentation..." />;
    }
    return <PublicDocView collection={publicDocCollection as any} error={publicDocError} />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className={cn(
      "flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden relative",
      theme === 'dark' ? 'theme-dark' : 'theme-light'
    )}>
      {/* Mobile Backdrop Overlay for Sidebar */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div
        className={cn(
          "h-full shrink-0 overflow-hidden relative z-40 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]",
          "lg:static fixed inset-y-0 left-0",
          sidebarCollapsed && "max-lg:-translate-x-full"
        )}
        style={{ width: sidebarCollapsed ? '0px' : sidebarWidth }}
      >
        <Sidebar />
      </div>
      <div
        className={cn(
          "w-1 hover:w-1.5 cursor-col-resize select-none shrink-0 z-30 relative hidden lg:block border-r border-[var(--border-subtle)]",
          isResizingSidebar ? "bg-[var(--primary)]" : "bg-transparent hover:bg-[var(--primary)]",
          sidebarCollapsed && "pointer-events-none opacity-0 w-0"
        )}
        style={{ width: sidebarCollapsed ? '0px' : '4px' }}
        onMouseDown={handleSidebarMouseDown}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-[var(--border-subtle)] flex items-center justify-between px-2.5 md:px-4 shrink-0 bg-[var(--bg-surface)] gap-2 overflow-x-auto">
          {/* Left Context Controls */}
          <div className="flex-1 flex items-center gap-2 min-w-0 pr-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer shrink-0"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={cn("w-4 h-4", !sidebarCollapsed && "rotate-180")} />
              <span className="text-xs font-semibold pr-1 hidden sm:inline">Sidebar</span>
            </button>

            {/* Workspace Identifier */}
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
              title="Current Active Workspace"
              onClick={() => setActiveView('settings')}
            >
              <Server className="w-3.5 h-3.5 text-[var(--icon-color)]" />
              <span className="truncate max-w-[120px] md:max-w-[180px]">
                {currentWorkspace?.name || 'Workspace'}
              </span>
            </div>

            {/* Environment Dropdown Custom Styling */}
            <div className="relative flex items-center">
              <span className={cn(
                "absolute left-2.5 w-2 h-2 rounded-full pointer-events-none z-10",
                currentEnvironment ? "bg-[var(--success)]" : "bg-[var(--text-tertiary)]"
              )} />
              <select
                className="bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] rounded pl-6 pr-7 py-1 outline-none appearance-none cursor-pointer "
                value={currentEnvironment?.id || ''}
                onChange={(e) => {
                  const env = environments.find(env => env.id === e.target.value);
                  setCurrentEnvironment(env || null);
                }}
              >
                <option value="">No Environment</option>
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute right-2 pointer-events-none" />
            </div>
            <button
              onClick={() => setIsQuickEnvModalOpen(true)}
              className="p-1.5 rounded bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
              title="Quick Manage Environment Variables"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Quick Search Workspace Trigger */}
            <button
              onClick={() => setIsQuickSearchOpen(true)}
              className="flex-1 max-w-sm min-w-[120px] flex items-center justify-between gap-2 bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded px-2.5 py-1.5 cursor-pointer group"
              title="Quick Search Workspace (Cmd+K / Ctrl+K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <span className="truncate font-medium">Search...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-tertiary)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded shrink-0">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Right Layout, Mode & Preferences Controls */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Quick Actions Group */}
            <div className="flex items-center bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-0.5 gap-0.5">
              <button
                onClick={() => setIsCurlModalOpen(true)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer flex items-center justify-center"
                title="Import request from cURL command string"
              >
                <TerminalSquare className="w-4 h-4 text-[var(--icon-color)]" />
              </button>

              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />

              <button
                onClick={handleSyncWorkspace}
                disabled={isWorkspaceLoading}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Synchronize Workspace Data"
              >
                <RefreshCw className={cn("w-4 h-4 text-[var(--icon-color)]", isWorkspaceLoading && "animate-spin")} />
              </button>
            </div>

            {/* Agent Connection Mode Group */}
            <div className="flex items-center bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-0.5 gap-0.5">
              {isOffline && (
                <div
                  className="px-2 py-1 text-xs font-medium rounded bg-[var(--bg-hover)] text-[var(--warning)] flex items-center gap-1.5"
                  title="Offline Mode. Changes are saved locally."
                >
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </div>
              )}
              {!isOffline && syncQueueCount > 0 && (
                <button
                  onClick={() => syncEngine.processQueue()}
                  disabled={isSyncing}
                  className="px-2 py-1 text-xs font-medium rounded bg-[var(--bg-hover)] text-[var(--info)] hover:bg-[var(--bg-panel)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Click to sync local changes to cloud"
                >
                  <RefreshCcw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                  <span>{syncQueueCount} pending</span>
                </button>
              )}
              <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-1" />
              <button
                onClick={() => {
                  setAgentMode(agentMode === 'cloud' ? 'desktop' : 'cloud');
                  addToast(agentMode === 'cloud' ? 'Switched to Desktop Agent for local requests' : 'Switched to Cloud Agent', 'success', 2000);
                }}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer flex items-center justify-center"
                title={agentMode === 'cloud' ? 'Current Mode: Cloud Agent (Click to switch to Desktop Agent)' : 'Current Mode: Desktop Agent (Click to switch to Cloud Agent)'}
              >
                {agentMode === 'cloud' ? (
                  <Cloud className="w-4 h-4 text-[var(--icon-color)]" />
                ) : (
                  <MonitorSmartphone className="w-4 h-4 text-[var(--icon-color)]" />
                )}
              </button>
              <button
                onClick={() => setIsAgentModalOpen(true)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
                title="Download Desktop Agent Bridge & Instructions"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />
              <button
                onClick={() => setIsKeyboardShortcutsModalOpen(true)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
                title="Keyboard Shortcuts & Hotkeys (Ctrl + /)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
                title="Open Documentation & Feature Guide (F1)"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            {/* Layout Split Mode Segment */}
            <div className="flex items-center bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-0.5 gap-0.5">
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={cn(
                  "p-1.5 rounded flex items-center justify-center cursor-pointer",
                  layoutMode === 'horizontal'
                    ? "bg-[var(--bg-surface)] text-[var(--primary)] border border-[var(--border-subtle)]"
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Horizontal Split View (Side by Side)"
              >
                <Columns2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('vertical')}
                className={cn(
                  "p-1.5 rounded flex items-center justify-center cursor-pointer",
                  layoutMode === 'vertical'
                    ? "bg-[var(--bg-surface)] text-[var(--primary)] border border-[var(--border-subtle)]"
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Vertical Split View (Stacked)"
              >
                <Rows2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('floating')}
                className={cn(
                  "p-1.5 rounded flex items-center justify-center cursor-pointer",
                  layoutMode === 'floating'
                    ? "bg-[var(--bg-surface)] text-[var(--primary)] border border-[var(--border-subtle)]"
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Docking Workspace (Floating Windows)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-0.5" />

              <button
                onClick={() => setResponseCollapsed(!responseCollapsed)}
                className={cn(
                  "p-1.5 rounded flex items-center justify-center cursor-pointer",
                  !responseCollapsed
                    ? "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                    : "bg-[var(--bg-hover)] text-[var(--warning)] border border-[var(--border-strong)]"
                )}
                title={responseCollapsed ? "Expand Response Panel" : "Collapse Response Panel"}
              >
                <PanelRight className="w-4 h-4" />
              </button>
            </div>

            {/* Developer Documentation Button (Web only) */}
            {!isDesktop && (
              <button
                onClick={() => setIsDocsPageOpen(true)}
                className="p-1.5 hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                title="Developer Documentation (API & Scripting)"
              >
                <BookOpen className="w-4 h-4 text-[var(--icon-color)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">
                  Docs
                </span>
              </button>
            )}

            {/* Theme Toggle Button: Ubuntu Light / Ubuntu Dark */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
              title={theme === 'light' ? 'Switch to Ubuntu Dark' : 'Switch to Ubuntu Light'}
            >
              {theme === 'light'
                ? <Sun className="w-4 h-4 text-[var(--icon-color)]" />
                : <Moon className="w-4 h-4 text-[var(--icon-color)]" />}
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline text-[var(--text-secondary)]">
                {theme === 'light' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* User Avatar & Settings */}
            <div className="flex items-center gap-1 border-l border-[var(--border-subtle)] pl-2">
              <button 
                onClick={() => setActiveView('settings')}
                className={cn(
                  "flex items-center gap-2 p-1 pr-2 rounded-full transition-colors border",
                  activeView === 'settings' 
                    ? "border-[var(--primary)]  bg-[var(--bg-hover)]" 
                    : "border-transparent hover:bg-[var(--bg-hover)] hover:border-[var(--border-subtle)]"
                )}
                title="Profile Settings"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-[var(--text-primary)] max-w-[90px] truncate hidden md:block">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </button>
              <button 
                onClick={logout} 
                className="p-1.5 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] rounded text-[var(--text-secondary)] transition-colors" 
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
        
        <TabBar />

        <main ref={mainRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {activeView === 'request' ? (
            <>
              {layoutMode !== 'floating' && (
                <div 
                  className={cn(
                    "flex-1 flex min-h-0 overflow-hidden w-full h-full",
                    layoutMode === 'vertical' ? "flex-col" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col min-h-0 z-10 relative",
                      layoutMode === 'horizontal' ? "border-r border-[var(--border-subtle)]" : "border-b border-[var(--border-subtle)]"
                    )}
                    style={{ 
                      width: layoutMode === 'horizontal' ? (responseCollapsed ? '100%' : `${requestPanelWidth}%`) : '100%', 
                      height: layoutMode === 'vertical' ? (responseCollapsed ? '100%' : `${requestPanelHeight}%`) : '100%',
                      minWidth: layoutMode === 'horizontal' && !responseCollapsed ? '20%' : '0px',
                      minHeight: layoutMode === 'vertical' && !responseCollapsed ? '15%' : '0px'
                    }}
                  >
                    <RequestPanel />
                  </div>
                  
                  <div 
                    className={cn(
                      "relative flex items-center justify-center select-none shrink-0 transition-colors z-30 group",
                      (layoutMode === 'horizontal' ? isResizingPanels : isResizingPanelsVertical) ? "bg-[var(--primary)]" : "bg-[var(--border-subtle)] hover:bg-[var(--primary)]",
                      !responseCollapsed && (layoutMode === 'horizontal' ? "cursor-col-resize" : "cursor-row-resize")
                    )}
                    style={{ 
                      width: layoutMode === 'horizontal' ? (responseCollapsed ? '0px' : '4px') : '100%',
                      height: layoutMode === 'vertical' ? (responseCollapsed ? '0px' : '4px') : '100%'
                    }}
                    onMouseDown={!responseCollapsed ? (layoutMode === 'horizontal' ? handlePanelMouseDown : handleVerticalPanelMouseDown) : undefined}
                    onDoubleClick={() => setResponseCollapsed(!responseCollapsed)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResponseCollapsed(!responseCollapsed);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={cn(
                        "absolute flex items-center justify-center cursor-pointer z-50 pointer-events-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        layoutMode === 'horizontal' ? "h-9 w-4" : "h-4 w-9",
                        responseCollapsed 
                          ? (layoutMode === 'horizontal' ? "right-1 top-1/2 -translate-y-1/2" : "bottom-1 left-1/2 -translate-x-1/2") 
                          : ""
                      )}
                      title={responseCollapsed ? "Expand Response Panel" : "Collapse Response Panel"}
                    >
                      {layoutMode === 'horizontal' ? (
                        responseCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        responseCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div
                    className={cn(
                      "flex flex-col min-h-0 z-10 relative overflow-hidden",
                      layoutMode === 'horizontal' ? "" : "border-t border-[var(--border-subtle)]"
                    )}
                    style={{ 
                      width: layoutMode === 'horizontal' ? (responseCollapsed ? '0%' : `${100 - requestPanelWidth}%`) : '100%', 
                      height: layoutMode === 'vertical' ? (responseCollapsed ? '0%' : `${100 - requestPanelHeight}%`) : '100%',
                      minWidth: layoutMode === 'horizontal' && !responseCollapsed ? '20%' : '0px',
                      minHeight: layoutMode === 'vertical' && !responseCollapsed ? '15%' : '0px'
                    }}
                  >
                    <ResponsePanel />
                  </div>
                </div>
              )}

              {layoutMode === 'floating' && (
                <div className="flex-1 relative overflow-hidden bg-[var(--bg-base)] w-full h-full" style={{ minHeight: '400px' }}>
                  {/* REQUEST WINDOW */}
                  <div
                    onClick={() => setActiveWindow('request')}
                    className={cn(
                      "absolute flex flex-col bg-[var(--bg-surface)] border rounded overflow-hidden",
                      activeWindow === 'request'
                        ? "border-[var(--primary)]"
                        : "border-[var(--border-strong)]"
                    )}
                    style={{
                      left: requestWindow.isMaximized ? 0 : `${requestWindow.x}px`,
                      top: requestWindow.isMaximized ? 0 : `${requestWindow.y}px`,
                      width: requestWindow.isMaximized ? '100%' : `${requestWindow.width}px`,
                      height: requestWindow.isMaximized ? '100%' : `${requestWindow.height}px`,
                      zIndex: requestWindow.isMaximized ? 45 : (activeWindow === 'request' ? 40 : 30),
                    }}
                  >
                    {/* Header */}
                    <div
                      onMouseDown={(e) => !requestWindow.isMaximized && startDrag(e, 'request')}
                      onDoubleClick={() => toggleMaximize('request')}
                      className="h-9 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] px-3 flex items-center justify-between cursor-move select-none shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <Move className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Request Editor</span>
                        {requestWindow.isMaximized && (
                          <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded font-bold">Maximized</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleMaximize('request')}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
                          title={requestWindow.isMaximized ? "Restore Window" : "Maximize Window"}
                        >
                          {requestWindow.isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setLayoutMode('horizontal')}
                          className="text-[10px] bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 border border-[var(--border-subtle)] rounded transition-colors font-semibold"
                          title="Dock back to Horizontal split"
                        >
                          Dock
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                      <RequestPanel />
                    </div>

                    {/* Resize handle */}
                    {!requestWindow.isMaximized && (
                      <div
                        onMouseDown={(e) => startResize(e, 'request')}
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 select-none z-50 text-[var(--text-secondary)] hover:text-[var(--primary)]"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" className="fill-current">
                          <line x1="6" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="6" y1="3" x2="3" y2="6" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* RESPONSE WINDOW */}
                  <div
                    onClick={() => setActiveWindow('response')}
                    className={cn(
                      "absolute flex flex-col bg-[var(--bg-surface)] border rounded overflow-hidden",
                      activeWindow === 'response'
                        ? "border-[var(--primary)]"
                        : "border-[var(--border-strong)]"
                    )}
                    style={{
                      left: responseWindow.isMaximized ? 0 : `${responseWindow.x}px`,
                      top: responseWindow.isMaximized ? 0 : `${responseWindow.y}px`,
                      width: responseWindow.isMaximized ? '100%' : `${responseWindow.width}px`,
                      height: responseWindow.isMaximized ? '100%' : `${responseWindow.height}px`,
                      zIndex: responseWindow.isMaximized ? 45 : (activeWindow === 'response' ? 40 : 30),
                    }}
                  >
                    {/* Header */}
                    <div
                      onMouseDown={(e) => !responseWindow.isMaximized && startDrag(e, 'response')}
                      onDoubleClick={() => toggleMaximize('response')}
                      className="h-9 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] px-3 flex items-center justify-between cursor-move select-none shrink-0"
                    >
                      <div className="flex items-center gap-2">
                        <Move className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Response Viewer</span>
                        {responseWindow.isMaximized && (
                          <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded font-bold">Maximized</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleMaximize('response')}
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
                          title={responseWindow.isMaximized ? "Restore Window" : "Maximize Window"}
                        >
                          {responseWindow.isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setLayoutMode('horizontal')}
                          className="text-[10px] bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 border border-[var(--border-subtle)] rounded transition-colors font-semibold"
                          title="Dock back to Horizontal split"
                        >
                          Dock
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                      <ResponsePanel />
                    </div>

                    {/* Resize handle */}
                    {!responseWindow.isMaximized && (
                      <div
                        onMouseDown={(e) => startResize(e, 'response')}
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 select-none z-50 text-[var(--text-secondary)] hover:text-[var(--primary)]"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" className="fill-current">
                          <line x1="6" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
                          <line x1="6" y1="3" x2="3" y2="6" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : activeView === 'environment' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <EnvironmentPanel />
            </div>
          ) : activeView === 'deployments' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <DeploymentPanel />
            </div>
          ) : activeView === 'collection_doc' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <CollectionDocPanel />
            </div>
          ) : activeView === 'settings' ? (
            <SettingsView />
          ) : activeView === 'cookies' ? (
            <CookieManager />
          ) : activeView === 'test_suite' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <TestRunnerPanel />
            </div>
          ) : activeView === 'monitors' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <MonitorsPanel />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm bg-[var(--bg-base)]">
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Server className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <p>Select a request or environment from the sidebar to start working.</p>
              </div>
            </div>
          )}
        </main>
        
        <BottomDrawer />
        
        {/* Bottom Status Bar */}
        <footer className="h-6 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] px-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative group flex">
              <button 
                onClick={() => setIsSyncLogModalOpen(true)}
                className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {isSyncing ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin text-[var(--info)]" />
                  ) : syncQueueCount > 0 ? (
                    <CloudOff className="w-3.5 h-3.5 text-[var(--warning)]" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-[var(--success)]" />
                  )}
                  <span>Sync Status:</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-[var(--success)]">{syncedCount} Synced</span>
                  <span className="text-[var(--text-secondary)]">/</span>
                  <span className={syncQueueCount > 0 ? "text-[var(--warning)]" : "text-[var(--text-secondary)]"}>
                    {syncQueueCount} Pending
                  </span>
                </div>
              </button>
              
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible z-50 pointer-events-none">
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Pending Items:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{syncQueueCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Latest Sync:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Last Success:</span>
                    <span className="font-semibold text-[var(--success)]">{lastSuccessTime ? new Date(lastSuccessTime).toLocaleTimeString() : 'Never'}</span>
                  </div>
                  <div className="mt-1 pt-2 border-t border-[var(--border-subtle)] text-[var(--text-secondary)] text-center italic">
                    Click to view detailed logs
                  </div>
                </div>
              </div>
            </div>
            <div className="w-px h-3 bg-[var(--border-subtle)]" />
            <span>v1.0.0 Desktop</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={isOffline ? "text-[var(--warning)]" : "text-[var(--success)]"}>
                {isOffline ? 'Offline' : 'Online'}
              </span>
              <div className={cn("w-2 h-2 rounded-full", isOffline ? "bg-[var(--warning)]" : "bg-[var(--success)]")}></div>
            </div>
            <span>UTF-8</span>
          </div>
        </footer>
      </div>
      <ShareImportModal />
      <CurlImportModal 
        isOpen={isCurlModalOpen} 
        onImport={handleCurlImport} 
        onCancel={() => setIsCurlModalOpen(false)} 
      />
      <AgentDownloadModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
      />
      <QuickSearchModal />
      <HelpGuideModal />
      <QuickEnvironmentModal />
      <KeyboardShortcutsModal />
      <SaveToCollectionModal />
      <ConflictResolutionModal />
      <SyncLogModal />
      <Toaster />
    </div>
  );
}

