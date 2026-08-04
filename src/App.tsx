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
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { LogOut, Eye, Keyboard, Cloud, MonitorSmartphone, Download, HelpCircle, Sun, Moon, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Columns2, Rows2, LayoutGrid, Maximize2, Minimize2, Move, GripHorizontal, User, Server, PanelRight, TerminalSquare, RefreshCw, Search } from 'lucide-react';
import { Workspace, Theme, ApiCollection, RequestItem } from './types';
import { cn } from './utils';
import { v4 as uuidv4 } from 'uuid';

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
    primaryColor,
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
    setIsQuickEnvModalOpen,
    setIsKeyboardShortcutsModalOpen
  } = useStore();
  const [loading, setLoading] = useState(true);
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);

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

  useEffect(() => {
    const root = document.documentElement;
    if (primaryColor) {
      root.style.setProperty('--primary', primaryColor);
      root.style.setProperty('--icon-color', primaryColor);
      root.style.setProperty('--border-focus', primaryColor);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--icon-color');
      root.style.removeProperty('--border-focus');
    }
  }, [primaryColor, theme]);

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

  const logout = () => {
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
          const list = await apiService.getWorkspaces(user.uid);
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
        let list = await apiService.getWorkspaces(user.uid);
        if (!isMounted) return;

        if (list.length === 0) {
          // Create default workspace if none exist
          const newWS = await apiService.createWorkspace("My Workspace", user.uid);
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f111a] text-white p-6 font-sans">
        <div className="w-full max-w-sm bg-[#151824] border border-[#23273a] p-6 rounded-lg text-center shadow-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-white mb-1">Authorization Successful!</h2>
          <p className="text-xs text-gray-400 mb-4">You have successfully authenticated with the provider.</p>
          <p className="text-[10px] text-gray-500 animate-pulse">This window will close automatically in a moment...</p>
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

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className={cn(
      "flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-hidden relative",
      theme === 'light' ? 'theme-light' : theme === 'dark' ? 'theme-dark' : 'theme-default'
    )}>
      {/* Mobile Backdrop Overlay for Sidebar */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <div 
        className={cn(
          "h-full shrink-0 overflow-hidden relative z-40 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] shadow-2xl lg:shadow-none",
          "lg:static fixed inset-y-0 left-0",
          !isResizingSidebar && "transition-all duration-300 ease-in-out",
          sidebarCollapsed && "max-lg:-translate-x-full"
        )}
        style={{ width: sidebarCollapsed ? '0px' : sidebarWidth }}
      >
        <Sidebar />
      </div>
      <div 
        className={cn(
          "w-1 hover:w-1.5 cursor-col-resize select-none shrink-0 transition-all z-30 group relative hidden lg:block border-r border-[var(--border-subtle)]",
          isResizingSidebar ? "bg-[var(--primary)]" : "bg-transparent hover:bg-[var(--primary)]",
          sidebarCollapsed && "pointer-events-none opacity-0 w-0"
        )}
        style={{ width: sidebarCollapsed ? '0px' : '4px' }}
        onMouseDown={handleSidebarMouseDown}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-[var(--border-subtle)] flex items-center justify-between px-2.5 md:px-4 shrink-0 bg-[var(--bg-panel)] shadow-2xs select-none gap-2 overflow-x-auto scrollbar-none">
          {/* Left Context Controls */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight className={cn("w-4 h-4 transition-transform", !sidebarCollapsed && "rotate-180")} />
              <span className="text-xs font-semibold pr-1 hidden sm:inline">Sidebar</span>
            </button>

            {/* Workspace Identifier */}
            <div 
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg-hover)]/60 border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-semibold shadow-2xs hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
              title="Current Active Workspace"
              onClick={() => setActiveView('settings')}
            >
              <Server className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="truncate max-w-[120px] md:max-w-[180px]">
                {currentWorkspace?.name || 'Workspace'}
              </span>
            </div>

            {/* Environment Dropdown Custom Styling */}
            <div className="relative flex items-center">
              <span className={cn(
                "absolute left-2.5 w-2 h-2 rounded-full pointer-events-none z-10 transition-colors",
                currentEnvironment ? "bg-emerald-500 animate-pulse shadow-xs" : "bg-gray-400 opacity-40"
              )} />
              <select 
                className="bg-[var(--bg-hover)]/60 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] rounded-lg pl-6 pr-7 py-1 outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all appearance-none cursor-pointer shadow-2xs"
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
              className="p-1.5 rounded-lg bg-[var(--bg-hover)]/60 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all shadow-2xs shrink-0"
              title="Quick Manage Environment Variables"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Quick Search Workspace Trigger */}
            <button
              onClick={() => setIsQuickSearchOpen(true)}
              className="flex items-center gap-2 bg-[var(--bg-hover)]/60 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg px-2.5 py-1 transition-all shadow-2xs cursor-pointer group shrink-0"
              title="Quick Search Workspace (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--primary)] transition-colors" />
              <span className="hidden sm:inline font-medium">Search...</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-tertiary)] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded shadow-2xs">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </button>

            {/* Quick Actions Group */}
            <div className="flex items-center bg-[var(--bg-hover)]/40 border border-[var(--border-subtle)] rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setIsCurlModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-all cursor-pointer group flex items-center justify-center"
                title="Import request from cURL command string"
              >
                <TerminalSquare className="w-4 h-4 text-[var(--primary)] transition-transform group-hover:scale-110" />
              </button>

              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />

              <button
                onClick={handleSyncWorkspace}
                disabled={isWorkspaceLoading}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Synchronize Workspace Data"
              >
                <RefreshCw className={cn("w-4 h-4 text-[var(--primary)] transition-transform", isWorkspaceLoading && "animate-spin")} />
              </button>
            </div>

            {/* Agent Connection Mode Group */}
            <div className="flex items-center bg-[var(--bg-hover)]/40 border border-[var(--border-subtle)] rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => {
                  setAgentMode(agentMode === 'cloud' ? 'desktop' : 'cloud');
                  addToast(agentMode === 'cloud' ? 'Switched to Desktop Agent for local requests' : 'Switched to Cloud Agent', 'success', 2000);
                }}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-all cursor-pointer flex items-center justify-center"
                title={agentMode === 'cloud' ? 'Current Mode: Cloud Agent (Click to switch to Desktop Agent)' : 'Current Mode: Desktop Agent (Click to switch to Cloud Agent)'}
              >
                {agentMode === 'cloud' ? (
                  <Cloud className="w-4 h-4 text-blue-500" />
                ) : (
                  <MonitorSmartphone className="w-4 h-4 text-emerald-500" />
                )}
              </button>
              <button
                onClick={() => setIsAgentModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                title="Download Desktop Agent Bridge & Instructions"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />
              <button
                onClick={() => setIsKeyboardShortcutsModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all flex items-center justify-center"
                title="Keyboard Shortcuts & Hotkeys (Ctrl + /)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all flex items-center justify-center"
                title="Open Documentation & Feature Guide (F1)"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Layout & Preferences Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Layout Split Mode Segment */}
            <div className="flex items-center bg-[var(--bg-hover)]/50 border border-[var(--border-subtle)] rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center justify-center",
                  layoutMode === 'horizontal' 
                    ? "bg-[var(--bg-surface)] text-[var(--primary)] shadow-2xs border border-[var(--border-subtle)]" 
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Horizontal Split View (Side by Side)"
              >
                <Columns2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('vertical')}
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center justify-center",
                  layoutMode === 'vertical' 
                    ? "bg-[var(--bg-surface)] text-[var(--primary)] shadow-2xs border border-[var(--border-subtle)]" 
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Vertical Split View (Stacked)"
              >
                <Rows2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('floating')}
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center justify-center",
                  layoutMode === 'floating' 
                    ? "bg-[var(--bg-surface)] text-[var(--primary)] shadow-2xs border border-[var(--border-subtle)]" 
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
                  "p-1.5 rounded-md transition-all flex items-center justify-center",
                  !responseCollapsed 
                    ? "text-[var(--icon-color)] hover:text-[var(--text-primary)]" 
                    : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                )}
                title={responseCollapsed ? "Expand Response Panel" : "Collapse Response Panel"}
              >
                <PanelRight className="w-4 h-4" />
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                const themes: Theme[] = ['default', 'light', 'dark'];
                const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
                setTheme(themes[nextIndex]);
              }}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
              title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
            >
              <div className="transition-transform duration-300 group-hover:rotate-12">
                {theme === 'default' ? <MonitorSmartphone className="w-4 h-4 text-[var(--icon-color)]" /> : 
                 theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : 
                 <Moon className="w-4 h-4 text-indigo-400" />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline text-[var(--text-secondary)]">
                {theme}
              </span>
            </button>

            {/* User Avatar & Settings */}
            <div className="flex items-center gap-1 border-l border-[var(--border-subtle)] pl-2">
              <button 
                onClick={() => setActiveView('settings')}
                className={cn(
                  "flex items-center gap-2 p-1 pr-2 rounded-full transition-all border",
                  activeView === 'settings' 
                    ? "border-[var(--primary)] shadow-xs bg-[var(--bg-hover)]" 
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
                className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-[var(--text-secondary)] transition-colors" 
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
                      "flex flex-col min-h-0 shadow-[var(--shadow-panel)] z-10 relative",
                      (!isResizingPanels && !isResizingPanelsVertical) && "transition-all duration-300 ease-in-out",
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
                        "absolute flex items-center justify-center transition-all cursor-pointer z-50 pointer-events-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 shadow-md",
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
                      "flex flex-col min-h-0 shadow-[var(--shadow-panel)] z-10 relative overflow-hidden",
                      (!isResizingPanels && !isResizingPanelsVertical) && "transition-all duration-300 ease-in-out",
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
                      "absolute flex flex-col bg-[var(--bg-surface)] border rounded-lg overflow-hidden",
                      (!dragState && !resizeState) ? "transition-all duration-300 ease-in-out" : "transition-none",
                      activeWindow === 'request' 
                        ? "border-[var(--primary)] shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-[var(--primary)]/20" 
                        : "border-[var(--border-strong)] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
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
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-all"
                          title={requestWindow.isMaximized ? "Restore Window" : "Maximize Window"}
                        >
                          {requestWindow.isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setLayoutMode('horizontal')}
                          className="text-[10px] bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 border border-[var(--border-subtle)] rounded transition-all font-semibold"
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
                      "absolute flex flex-col bg-[var(--bg-surface)] border rounded-lg overflow-hidden",
                      (!dragState && !resizeState) ? "transition-all duration-300 ease-in-out" : "transition-none",
                      activeWindow === 'response' 
                        ? "border-[var(--primary)] shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-[var(--primary)]/20" 
                        : "border-[var(--border-strong)] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
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
                          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-all"
                          title={responseWindow.isMaximized ? "Restore Window" : "Maximize Window"}
                        >
                          {responseWindow.isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setLayoutMode('horizontal')}
                          className="text-[10px] bg-[var(--bg-hover)] hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-0.5 border border-[var(--border-subtle)] rounded transition-all font-semibold"
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
        <footer className="h-6 bg-[var(--border-strong)] text-[var(--text-primary)] text-[10px] px-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span>Real-time Sync Active</span>
            </div>
            <span>v1.0.0 Desktop</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Online</span>
            <span>UTF-8</span>
            <div className="w-3 h-3 rounded-full bg-blue-400"></div>
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
      <Toaster />
    </div>
  );
}

