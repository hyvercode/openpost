/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvironmentPanel } from './components/EnvironmentPanel';
import { TabBar } from './components/TabBar';
import { LogOut, MonitorSmartphone, Sun, Moon, ChevronRight } from 'lucide-react';
import { Workspace } from './types';

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
    setSidebarCollapsed
  } = useStore();
  const [loading, setLoading] = useState(true);

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
    
    const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
      const owned = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
      
      if (owned.length === 0) {
        // Create default workspace
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
        setWorkspaces(owned);
        if (!currentWorkspace) {
          setCurrentWorkspace(owned[0]);
        }
      }
    });

    return () => {
      unsubscribe1();
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
          <h1 className="text-3xl font-bold mb-2">API Tester Pro</h1>
          <p className="text-[var(--text-secondary)] mb-8">Collaborative API Testing Platform for Teams.</p>
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
      {!sidebarCollapsed && <Sidebar />}
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

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {activeView === 'request' ? (
            <>
              <div className="flex-1 flex flex-col min-h-0 border-r border-[var(--border-subtle)]">
                <RequestPanel />
              </div>
              <div className="w-1 cursor-col-resize bg-[var(--border-subtle)] hover:bg-[var(--primary)] transition-colors shrink-0 hidden lg:block"></div>
              <div className="flex-1 flex flex-col min-h-0">
                <ResponsePanel />
              </div>
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

