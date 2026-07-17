import { useStore } from '../store/useStore';
import { X } from 'lucide-react';
import { cn } from '../utils';

export function TabBar() {
  const { openTabs, activeTabId, setActiveTabId, closeTab, setActiveView, setActiveRequest, setEditingEnvironment, collections, environments } = useStore();

  const handleTabClick = (tab: { id: string; type: 'request' | 'environment' }) => {
    setActiveTabId(tab.id);
    if (tab.type === 'request') {
      const request = collections.flatMap(c => c.requests).find(r => r.id === tab.id);
      if (request) {
        setActiveRequest(request);
        setActiveView('request');
      }
    } else {
      const env = environments.find(e => e.id === tab.id);
      if (env) {
        setEditingEnvironment(env);
        setActiveView('environment');
      }
    }
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTab(id);
    // State logic is handled in the store, but we need to update active component based on new activeTabId
    // Actually, it's easier to just handle it here to keep store simple
    const newTabs = openTabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
      setActiveView('empty');
    } else if (activeTabId === id) {
      const newActive = newTabs[newTabs.length - 1];
      handleTabClick(newActive);
    }
  };

  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center bg-[#161616] border-b border-[#2B2B2B] overflow-x-auto no-scrollbar shrink-0 h-9">
      {openTabs.map(tab => (
        <div 
          key={tab.id}
          onClick={() => handleTabClick(tab)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-r border-[#2B2B2B] max-w-[200px] cursor-pointer group text-xs",
            activeTabId === tab.id ? "bg-[#1A1A1A] text-white border-t-2 border-t-[#FF6C37]" : "bg-[#161616] text-gray-400 hover:bg-[#1A1A1A]"
          )}
        >
          {tab.type === 'request' && tab.method && (
             <span className={cn(
              "font-bold text-[10px]",
              tab.method === 'GET' ? "text-green-400" :
              tab.method === 'POST' ? "text-yellow-400" :
              tab.method === 'PUT' ? "text-blue-400" :
              tab.method === 'DELETE' ? "text-red-400" : "text-gray-500"
            )}>{tab.method}</span>
          )}
          <span className="truncate flex-1">{tab.name}</span>
          <button 
            onClick={(e) => handleClose(e, tab.id)}
            className={cn(
              "p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
              activeTabId === tab.id ? "opacity-100 hover:bg-[#333]" : "hover:bg-[#333]"
            )}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
