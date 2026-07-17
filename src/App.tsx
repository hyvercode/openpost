/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { TabBar } from './components/TabBar';
import { LogOut, MonitorSmartphone, Sun, Moon, ChevronRight, ChevronLeft, Columns2, Rows2, LayoutGrid, Maximize2, Minimize2, Move, GripHorizontal } from 'lucide-react';
import { Workspace } from './types';
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
    currentEnvironment, 
    setCurrentEnvironment, 
    activeView, 
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (!user) return;
    
    const q1 = query(collection(db, "workspaces"), where("ownerId", "==", user.uid));
    const q2 = query(collection(db, "workspaces"), where("members", "array-contains", user.uid));
    
    let ownedWorkspaces: Workspace[] = [];
    let memberWorkspaces: Workspace[] = [];
    
    const updateMergedWorkspaces = () => {
      const all = [...ownedWorkspaces];
      memberWorkspaces.forEach(w => {
        if (!all.some(x => x.id === w.id)) {
          all.push(w);
        }
      });
      
      setWorkspaces(all);
      
      const storedId = localStorage.getItem('lastWorkspaceId');
      if (all.length > 0) {
        const found = all.find(w => w.id === storedId);
        if (found) {
          if (!currentWorkspace || currentWorkspace.id !== found.id) {
            setCurrentWorkspace(found);
          }
        } else if (!currentWorkspace || !all.some(w => w.id === currentWorkspace.id)) {
          setCurrentWorkspace(all[0]);
        }
      }
    };

    const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
      ownedWorkspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
      
      if (ownedWorkspaces.length === 0 && memberWorkspaces.length === 0) {
        const { doc, setDoc } = await import('firebase/firestore');
        const { v4: uuidv4 } = await import('uuid');
        const newWorkspace = {
          id: uuidv4(),
          name: "My Workspace",
          ownerId: user.uid,
          members: []
        };
        await setDoc(doc(db, "workspaces", newWorkspace.id), newWorkspace);
      } else {
        updateMergedWorkspaces();
      }
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      memberWorkspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
      updateMergedWorkspaces();
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, setWorkspaces, setCurrentWorkspace, currentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) return;

    const unsubCollections = onSnapshot(query(collection(db, "collections"), where("workspaceId", "==", currentWorkspace.id)), (snapshot) => {
      setCollections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const unsubEnvironments = onSnapshot(query(collection(db, "environments"), where("workspaceId", "==", currentWorkspace.id)), (snapshot) => {
      setEnvironments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    return () => {
      unsubCollections();
      unsubEnvironments();
    };
  }, [currentWorkspace, setCollections, setEnvironments]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-[var(--text-primary)] flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-[var(--text-primary)] flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full text-center">
          <MonitorSmartphone className="w-16 h-16 mx-auto mb-6 text-indigo-500" />
          <h1 className="text-3xl font-bold mb-2">OpenPost</h1>
          <p className="text-[var(--text-secondary)] mb-8">Collaborative API Testing Platform.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-[var(--text-primary)] font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans overflow-hidden ${theme === 'light' ? 'theme-light' : ''}`}>
      {!sidebarCollapsed && (
        <>
          <Sidebar />
          <div 
            className={cn(
              "w-1 hover:w-1.5 cursor-col-resize select-none shrink-0 transition-all z-30 group relative hidden lg:block border-r border-[var(--border-subtle)]",
              isResizingSidebar ? "bg-[var(--primary)]" : "bg-transparent hover:bg-[var(--primary)]"
            )}
            style={{ width: '4px' }}
            onMouseDown={handleSidebarMouseDown}
          />
        </>
      )}
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
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                title="Docking Workspace (Floating Windows)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px]">Docking</span>
              </button>
            </div>

            <div className="h-4 w-px bg-[var(--border-strong)]"></div>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-primary)] transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-[var(--border-strong)]"></div>
            <div className="flex items-center gap-2">
              {user.photoURL && <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />}
              <span className="text-sm text-[var(--text-primary)]">{user.email}</span>
            </div>
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
                    className="flex flex-col min-h-0 border-r border-[var(--border-subtle)]"
                    style={responseCollapsed ? { flex: '1 1 0%', minWidth: '0' } : { width: `${requestPanelWidth}%`, minWidth: '20%' }}
                  >
                    <RequestPanel />
                  </div>
                  
                  <div 
                    className={cn(
                      "relative flex items-center justify-center cursor-col-resize select-none shrink-0 transition-colors z-30 group hidden lg:flex",
                      isResizingPanels ? "bg-[var(--primary)]" : "bg-[var(--border-subtle)] hover:bg-[var(--primary)]"
                    )}
                    style={{ width: '4px' }}
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

                  {!responseCollapsed && (
                    <div 
                      className="flex-1 flex flex-col min-h-0"
                      style={{ width: `${100 - requestPanelWidth}%`, minWidth: '20%' }}
                    >
                      <ResponsePanel />
                    </div>
                  )}
                </>
              )}

              {layoutMode === 'vertical' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
                  <div 
                    className="flex flex-col min-h-0"
                    style={responseCollapsed ? { flex: '1 1 0%', minHeight: '0' } : { height: `${requestPanelHeight}%`, minHeight: '15%' }}
                  >
                    <RequestPanel />
                  </div>
                  
                  <div 
                    className={cn(
                      "relative flex items-center justify-center cursor-row-resize select-none shrink-0 transition-colors z-30 group flex",
                      isResizingPanelsVertical ? "bg-[var(--primary)]" : "bg-[var(--border-subtle)] hover:bg-[var(--primary)]"
                    )}
                    style={{ height: '4px' }}
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

                  {!responseCollapsed && (
                    <div 
                      className="flex-1 flex flex-col min-h-0"
                      style={{ height: `${100 - requestPanelHeight}%`, minHeight: '15%' }}
                    >
                      <ResponsePanel />
                    </div>
                  )}
                </div>
              )}

              {layoutMode === 'floating' && (
                <div className="flex-1 relative overflow-hidden bg-[var(--bg-base)] w-full h-full" style={{ minHeight: '400px' }}>
                  {/* REQUEST WINDOW */}
                  <div
                    onClick={() => setActiveWindow('request')}
                    className={cn(
                      "absolute flex flex-col bg-[var(--bg-surface)] border rounded-lg shadow-2xl overflow-hidden transition-all duration-75",
                      activeWindow === 'request' ? "border-[var(--primary)] shadow-3xl" : "border-[var(--border-strong)] shadow-lg"
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
                      "absolute flex flex-col bg-[var(--bg-surface)] border rounded-lg shadow-2xl overflow-hidden transition-all duration-75",
                      activeWindow === 'response' ? "border-[var(--primary)] shadow-3xl" : "border-[var(--border-strong)] shadow-lg"
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
    </div>
  );
}

