/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { apiService } from './lib/api';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { DeploymentPanel } from './components/DeploymentPanel';
import { CollectionDocPanel } from './components/CollectionDocPanel';
import { SettingsView } from './components/SettingsView';
import { TestRunnerPanel } from './components/TestRunnerPanel';
import { TabBar } from './components/TabBar';
import { BottomDrawer } from './components/BottomDrawer';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { Toaster } from './components/Toaster';
import { LogOut, MonitorSmartphone, Sun, Moon, ChevronRight, ChevronLeft, Columns2, Rows2, LayoutGrid, Maximize2, Minimize2, Move, GripHorizontal, User } from 'lucide-react';
import { Workspace, Theme } from './types';
import { cn } from './utils';

export default function App() {
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
    setLayoutMode
  } = useStore();
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

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
    const fetchUser = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/api/auth/me', {
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
      }
    };

    loadWorkspaceData();
    return () => {
      isMounted = false;
    };
  }, [currentWorkspace, setCollections, setEnvironments, setDeployments]);

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
      "flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-hidden",
      theme === 'light' ? 'theme-light' : theme === 'dark' ? 'theme-dark' : 'theme-default'
    )}>
      <div 
        className={cn(
          "h-full shrink-0 overflow-hidden relative",
          !isResizingSidebar && "transition-[width] duration-300 ease-in-out"
        )}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
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
        <header className="h-11 border-b border-[var(--border-subtle)] flex items-center justify-between px-4 shrink-0 bg-[var(--bg-panel)]">
          <div className="flex items-center gap-4">
            {sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(false)}
                className="p-1 hover:bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="text-[11px] font-medium pr-1">Sidebar</span>
              </button>
            )}
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Workspace: <span className="font-semibold">{currentWorkspace?.name || 'Loading...'}</span>
            </h2>
            <div className="h-4 w-px bg-[var(--border-strong)]"></div>
            <select 
              className="bg-[var(--bg-hover)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] rounded px-2 py-1 outline-none focus:border-[var(--border-focus)]"
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
          </div>
          <div className="flex items-center gap-3">
            {/* Layout Mode Toggles */}
            <div className="flex items-center bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-md p-0.5 shrink-0 select-none">
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={cn(
                  "p-1 rounded transition-all text-xs font-semibold flex items-center gap-1.5 px-2",
                  layoutMode === 'horizontal' 
                    ? "bg-[var(--primary)] text-white shadow-sm" 
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Horizontal Split (Side by Side)"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px]">Horizontal</span>
              </button>
              <button
                onClick={() => setLayoutMode('vertical')}
                className={cn(
                  "p-1 rounded transition-all text-xs font-semibold flex items-center gap-1.5 px-2",
                  layoutMode === 'vertical' 
                    ? "bg-[var(--primary)] text-white shadow-sm" 
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Vertical Split (Stacked)"
              >
                <Rows2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px]">Vertical</span>
              </button>
              <button
                onClick={() => setLayoutMode('floating')}
                className={cn(
                  "p-1 rounded transition-all text-xs font-semibold flex items-center gap-1.5 px-2",
                  layoutMode === 'floating' 
                    ? "bg-[var(--primary)] text-white shadow-sm" 
                    : "text-[var(--icon-color)] hover:text-[var(--text-primary)]"
                )}
                title="Docking Workspace (Floating Windows)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px]">Docking</span>
              </button>
            </div>

            <div className="h-4 w-px bg-[var(--border-strong)]"></div>

            <button
              onClick={() => {
                const themes: Theme[] = ['default', 'light', 'dark'];
                const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
                setTheme(themes[nextIndex]);
              }}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
              title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
            >
              {theme === 'default' ? <MonitorSmartphone className="w-4 h-4 text-[var(--icon-color)]" /> : 
               theme === 'light' ? <Sun className="w-4 h-4 text-[var(--icon-color)]" /> : 
               <Moon className="w-4 h-4 text-[var(--icon-color)]" />}
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                {theme}
              </span>
            </button>
            <div className="h-4 w-px bg-[var(--border-strong)]"></div>
            <button 
              onClick={() => setActiveView('settings')}
              className={cn(
                "flex items-center gap-2 p-1 rounded-full transition-all border-2",
                activeView === 'settings' ? "border-[var(--primary)] shadow-sm" : "border-transparent hover:border-[var(--border-subtle)]"
              )}
              title="Profile Settings"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                </div>
              )}
            </button>
            <button onClick={logout} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-primary)] transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        
        <TabBar />

        <main ref={mainRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {activeView === 'request' ? (
            <>
              {layoutMode === 'horizontal' && (
                <>
                  <div 
                    className={cn(
                      "flex flex-col min-h-0 border-r border-[var(--border-subtle)] shadow-[var(--shadow-panel)] z-10 relative",
                      !isResizingPanels && "transition-[width] duration-300 ease-in-out"
                    )}
                    style={{ 
                      width: responseCollapsed ? '100%' : `${requestPanelWidth}%`, 
                      minWidth: responseCollapsed ? '0px' : '20%' 
                    }}
                  >
                    <RequestPanel />
                  </div>
                  
                  <div 
                    className={cn(
                      "relative flex items-center justify-center cursor-col-resize select-none shrink-0 transition-all z-30 group hidden lg:flex",
                      isResizingPanels ? "bg-[var(--primary)]" : "bg-[var(--border-subtle)] hover:bg-[var(--primary)]",
                      responseCollapsed && "pointer-events-none opacity-0 w-0"
                    )}
                    style={{ width: responseCollapsed ? '0px' : '4px' }}
                    onMouseDown={handlePanelMouseDown}
                    onDoubleClick={() => setResponseCollapsed(!responseCollapsed)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResponseCollapsed(!responseCollapsed);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute h-9 w-4 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 shadow-md transition-all cursor-pointer z-40"
                      title={responseCollapsed ? "Expand Response Panel" : "Collapse Response Panel"}
                    >
                      {responseCollapsed ? (
                        <ChevronLeft className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div 
                    className={cn(
                      "flex flex-col min-h-0 shadow-[var(--shadow-panel)] z-10 relative overflow-hidden",
                      !isResizingPanels && "transition-[width] duration-300 ease-in-out"
                    )}
                    style={{ 
                      width: responseCollapsed ? '0%' : `${100 - requestPanelWidth}%`, 
                      minWidth: responseCollapsed ? '0px' : '20%' 
                    }}
                  >
                    <ResponsePanel />
                  </div>
                </>
              )}

              {layoutMode === 'vertical' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
                  <div 
                    className={cn(
                      "flex flex-col min-h-0 border-b border-[var(--border-subtle)] shadow-[var(--shadow-panel)] z-10 relative overflow-hidden",
                      !isResizingPanelsVertical && "transition-[height] duration-300 ease-in-out"
                    )}
                    style={{ 
                      height: responseCollapsed ? '100%' : `${requestPanelHeight}%`, 
                      minHeight: responseCollapsed ? '0px' : '15%' 
                    }}
                  >
                    <RequestPanel />
                  </div>
                  
                  <div 
                    className={cn(
                      "relative flex items-center justify-center cursor-row-resize select-none shrink-0 transition-all z-30 group flex",
                      isResizingPanelsVertical ? "bg-[var(--primary)]" : "bg-[var(--border-subtle)] hover:bg-[var(--primary)]",
                      responseCollapsed && "pointer-events-none opacity-0 h-0"
                    )}
                    style={{ height: responseCollapsed ? '0px' : '4px' }}
                    onMouseDown={handleVerticalPanelMouseDown}
                    onDoubleClick={() => setResponseCollapsed(!responseCollapsed)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResponseCollapsed(!responseCollapsed);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute h-4 w-9 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 shadow-md transition-all cursor-pointer z-40"
                      title={responseCollapsed ? "Expand Response Panel" : "Collapse Response Panel"}
                    >
                      {responseCollapsed ? (
                        <ChevronLeft className="w-3 h-3 rotate-90" />
                      ) : (
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      )}
                    </button>
                  </div>

                  <div 
                    className={cn(
                      "flex flex-col min-h-0 border-t border-[var(--border-subtle)] shadow-[var(--shadow-panel)] z-10 relative overflow-hidden",
                      !isResizingPanelsVertical && "transition-[height] duration-300 ease-in-out"
                    )}
                    style={{ 
                      height: responseCollapsed ? '0%' : `${100 - requestPanelHeight}%`, 
                      minHeight: responseCollapsed ? '0px' : '15%' 
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
          ) : activeView === 'test_suite' ? (
            <div className="flex-1 flex flex-col min-h-0">
              <TestRunnerPanel />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm bg-[var(--bg-base)]">
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[var(--primary)] font-bold text-2xl">P</span>
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
      <Toaster />
    </div>
  );
}

