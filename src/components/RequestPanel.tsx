import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn, replaceEnvironmentVariables } from '../utils';
import { Play, Plus, Trash2, Save } from 'lucide-react';
import axios from 'axios';
import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function RequestPanel() {
  const { activeRequest, setActiveRequest, activeTab, setActiveTab, setResponse, currentEnvironment, setCurrentRequestConfig } = useStore();
  
  // Local state for the active request to allow editing without saving immediately
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [params, setParams] = useState<KeyValue[]>([]);
  const [bodyContent, setBodyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentRequestConfig({ url, method, headers, params, bodyContent });
  }, [url, method, headers, params, bodyContent, setCurrentRequestConfig]);

  useEffect(() => {
    if (activeRequest) {
      setUrl(activeRequest.url);
      setMethod(activeRequest.method);
      setHeaders(activeRequest.headers.length ? activeRequest.headers : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setParams(activeRequest.params.length ? activeRequest.params : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setBodyContent(activeRequest.body.content);
    } else {
      setUrl('');
      setMethod('GET');
      setHeaders([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setParams([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setBodyContent('');
    }
  }, [activeRequest]);

  const handleSend = async () => {
    if (!url) return;
    setIsLoading(true);
    setResponse(null);

    const envVars = currentEnvironment ? currentEnvironment.variables : [];
    
    // Process URL
    let finalUrl = replaceEnvironmentVariables(url, envVars);
    
    // Process Params
    const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `http://${finalUrl}`);
    params.filter(p => p.enabled && p.key).forEach(p => {
      urlObj.searchParams.append(
        replaceEnvironmentVariables(p.key, envVars),
        replaceEnvironmentVariables(p.value, envVars)
      );
    });
    finalUrl = urlObj.toString();

    // Process Headers
    const finalHeaders: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key).forEach(h => {
      finalHeaders[replaceEnvironmentVariables(h.key, envVars)] = replaceEnvironmentVariables(h.value, envVars);
    });

    try {
      const res = await axios.post('/api/proxy', {
        method,
        url: finalUrl,
        headers: finalHeaders,
        body: bodyContent ? JSON.parse(replaceEnvironmentVariables(bodyContent, envVars)) : undefined, // very basic
      });
      setResponse(res.data);
    } catch (error: any) {
      setResponse({
        error: true,
        data: error.response?.data || error.message,
        status: error.response?.status || 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!activeRequest) return;
    setIsSaving(true);
    try {
      const collection = useStore.getState().collections.find(c => c.id === activeRequest.collectionId);
      if (!collection) return;

      const updatedRequest = {
        ...activeRequest,
        url,
        method,
        headers,
        params,
        body: { ...activeRequest.body, content: bodyContent }
      };

      const updatedRequests = collection.requests.map(r => r.id === activeRequest.id ? updatedRequest : r);
      await updateDoc(doc(db, "collections", collection.id), { requests: updatedRequests });
      
      setActiveRequest(updatedRequest);
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyValueChange = (
    type: 'headers' | 'params',
    id: string,
    field: keyof KeyValue,
    value: string | boolean
  ) => {
    const setter = type === 'headers' ? setHeaders : setParams;
    const items = type === 'headers' ? headers : params;
    
    const newItems = items.map(item => item.id === id ? { ...item, [field]: value } : item);
    
    // Auto-add new row if last row is being typed in
    if (field === 'key' && items[items.length - 1].id === id && value !== '') {
      newItems.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }
    
    setter(newItems);
  };

  const removeKeyValue = (type: 'headers' | 'params', id: string) => {
    const setter = type === 'headers' ? setHeaders : setParams;
    const items = type === 'headers' ? headers : params;
    if (items.length === 1) {
      setter([{ id: uuidv4(), key: '', value: '', enabled: true }]);
    } else {
      setter(items.filter(item => item.id !== id));
    }
  };

  const renderKeyValueEditor = (type: 'headers' | 'params') => {
    const items = type === 'headers' ? headers : params;
    return (
      <div className="flex flex-col h-full bg-[#121212] border border-[#2B2B2B] rounded overflow-hidden">
        <div className="flex border-b border-[#2B2B2B] bg-[#161616]">
          <div className="w-8 shrink-0 border-r border-[#2B2B2B]"></div>
          <div className="flex-1 py-1.5 px-3 text-[10px] uppercase tracking-widest font-medium text-gray-500 border-r border-[#2B2B2B]">Key</div>
          <div className="flex-1 py-1.5 px-3 text-[10px] uppercase tracking-widest font-medium text-gray-500">Value</div>
          <div className="w-10 shrink-0"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center group mb-1 border-b border-[#1A1A1A] pb-1">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={item.enabled}
                  onChange={(e) => handleKeyValueChange(type, item.id, 'enabled', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 accent-[#FF6C37] text-[#FF6C37] focus:ring-offset-gray-900"
                />
              </div>
              <div className="flex-1 px-1">
                <input
                  type="text"
                  placeholder="Key"
                  value={item.key}
                  onChange={(e) => handleKeyValueChange(type, item.id, 'key', e.target.value)}
                  className="w-full bg-transparent border-b border-transparent focus:border-[#333] px-2 py-1 text-xs font-mono text-gray-300 outline-none placeholder:text-gray-600 transition-colors"
                />
              </div>
              <div className="flex-1 px-1">
                 <input
                  type="text"
                  placeholder="Value"
                  value={item.value}
                  onChange={(e) => handleKeyValueChange(type, item.id, 'value', e.target.value)}
                  className="w-full bg-transparent border-b border-transparent focus:border-[#333] px-2 py-1 text-xs font-mono text-gray-300 outline-none placeholder:text-gray-600 transition-colors"
                />
              </div>
              <div className="w-10 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => removeKeyValue(type, item.id)}
                  className="text-gray-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1A1A]">
      {/* URL Bar */}
      <div className="flex items-stretch gap-2 p-4 pb-0">
        <div className="flex bg-[#252525] border border-[#333] rounded overflow-hidden flex-1">
          <select 
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-transparent text-blue-400 font-bold text-xs px-3 border-r border-[#333] focus:outline-none"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL or paste text"
            className="bg-transparent flex-1 px-3 text-sm text-gray-200 focus:outline-none"
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={isLoading || !url}
          className="bg-[#FF6C37] hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current hidden" />
          )}
          Send
        </button>
        <button 
          onClick={handleSaveRequest}
          disabled={isSaving || !activeRequest}
          className="bg-[#252525] border border-[#333] hover:border-[#444] disabled:opacity-50 text-gray-300 px-4 rounded text-xs font-medium transition-colors flex items-center gap-2"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mt-4 border-b border-[#2B2B2B] px-4 shrink-0">
        {(['params', 'auth', 'headers', 'body'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "text-xs pb-2 font-medium transition-colors capitalize",
              activeTab === tab 
                ? "text-[#FF6C37] border-b-2 border-[#FF6C37]" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            {tab}
            {tab === 'headers' && headers.filter(h => h.key).length > 0 && (
              <span className="ml-1.5 text-[9px] bg-[#252525] text-gray-400 px-1 rounded">
                {headers.filter(h => h.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-[#121212] p-4">
        {activeTab === 'params' && renderKeyValueEditor('params')}
        {activeTab === 'headers' && renderKeyValueEditor('headers')}
        {activeTab === 'auth' && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
            <p className="mb-2 text-sm text-gray-300">Authorization</p>
            <p>This request does not use any authorization.</p>
            <select className="mt-4 bg-[#252525] border border-[#333] text-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#444]">
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>
        )}
        {activeTab === 'body' && (
          <div className="h-full flex flex-col">
            <div className="mb-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="radio" checked className="accent-[#FF6C37] bg-gray-800 border-gray-700 focus:ring-offset-gray-900" readOnly/>
                raw (JSON)
              </label>
            </div>
            <textarea
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
              className="flex-1 w-full bg-[#0A0A0A] border border-[#2B2B2B] rounded p-4 font-mono text-sm text-blue-300 outline-none focus:border-[#444] resize-none transition-colors leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
