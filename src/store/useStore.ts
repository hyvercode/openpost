import { create } from "zustand";
import { User, Workspace, ApiCollection, Environment, RequestItem } from "../types";

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;

  collections: ApiCollection[];
  setCollections: (collections: ApiCollection[]) => void;

  environments: Environment[];
  setEnvironments: (environments: Environment[]) => void;
  currentEnvironment: Environment | null;
  setCurrentEnvironment: (env: Environment | null) => void;

  activeView: 'request' | 'environment' | 'empty';
  setActiveView: (view: 'request' | 'environment' | 'empty') => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  
  openTabs: Array<{ id: string; type: 'request' | 'environment'; name: string; method?: string; isDirty?: boolean }>;
  setOpenTabs: (tabs: Array<{ id: string; type: 'request' | 'environment'; name: string; method?: string; isDirty?: boolean }>) => void;
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  
  openTab: (tab: { id: string; type: 'request' | 'environment'; name: string; method?: string; isDirty?: boolean }) => void;
  closeTab: (id: string) => void;

  editingEnvironment: Environment | null;
  setEditingEnvironment: (env: Environment | null) => void;

  activeRequest: RequestItem | null;
  setActiveRequest: (request: RequestItem | null) => void;
  
  activeTab: 'params' | 'auth' | 'headers' | 'body';
  setActiveTab: (tab: 'params' | 'auth' | 'headers' | 'body') => void;
  
  currentRequestConfig: any;
  setCurrentRequestConfig: (config: any) => void;
  
  response: any;
  setResponse: (res: any) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  requestPanelWidth: number;
  setRequestPanelWidth: (width: number) => void;

  responseCollapsed: boolean;
  setResponseCollapsed: (collapsed: boolean) => void;

  layoutMode: 'horizontal' | 'vertical' | 'floating';
  setLayoutMode: (mode: 'horizontal' | 'vertical' | 'floating') => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  currentWorkspace: null,
  setCurrentWorkspace: (currentWorkspace) => {
    if (currentWorkspace) {
      localStorage.setItem('lastWorkspaceId', currentWorkspace.id);
    }
    set({ currentWorkspace });
  },

  collections: [],
  setCollections: (collections) => set({ collections }),

  environments: [],
  setEnvironments: (environments) => set({ environments }),
  currentEnvironment: null,
  setCurrentEnvironment: (currentEnvironment) => set({ currentEnvironment }),

  activeView: 'empty',
  setActiveView: (activeView) => set({ activeView }),

  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  openTabs: [],
  setOpenTabs: (openTabs) => set({ openTabs }),
  activeTabId: null,
  setActiveTabId: (activeTabId) => set({ activeTabId }),
  
  openTab: (tab) => set((state) => {
    const existing = state.openTabs.find(t => t.id === tab.id);
    if (!existing) {
      return { openTabs: [...state.openTabs, tab], activeTabId: tab.id };
    }
    return { activeTabId: tab.id };
  }),
  
  closeTab: (id) => set((state) => {
    const newTabs = state.openTabs.filter(t => t.id !== id);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    
    // If no tabs left, reset active view
    if (newTabs.length === 0) {
      return { openTabs: newTabs, activeTabId: newActiveId, activeView: 'empty' };
    }
    return { openTabs: newTabs, activeTabId: newActiveId };
  }),

  editingEnvironment: null,
  setEditingEnvironment: (editingEnvironment) => set({ editingEnvironment }),

  activeRequest: null,
  setActiveRequest: (activeRequest) => set({ activeRequest }),

  activeTab: 'params',
  setActiveTab: (activeTab) => set({ activeTab }),

  currentRequestConfig: null,
  setCurrentRequestConfig: (currentRequestConfig) => set({ currentRequestConfig }),

  response: null,
  setResponse: (response) => set({ response }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  sidebarWidth: Number(localStorage.getItem('sidebarWidth') || 256),
  setSidebarWidth: (sidebarWidth) => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
    set({ sidebarWidth });
  },

  requestPanelWidth: Number(localStorage.getItem('requestPanelWidth') || 50),
  setRequestPanelWidth: (requestPanelWidth) => {
    localStorage.setItem('requestPanelWidth', String(requestPanelWidth));
    set({ requestPanelWidth });
  },

  responseCollapsed: localStorage.getItem('responseCollapsed') === 'true',
  setResponseCollapsed: (responseCollapsed) => {
    localStorage.setItem('responseCollapsed', String(responseCollapsed));
    set({ responseCollapsed });
  },

  layoutMode: (localStorage.getItem('layoutMode') as 'horizontal' | 'vertical' | 'floating') || 'horizontal',
  setLayoutMode: (layoutMode) => {
    localStorage.setItem('layoutMode', layoutMode);
    set({ layoutMode });
  },
}));
