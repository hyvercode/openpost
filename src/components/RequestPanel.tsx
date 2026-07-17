import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { cn, replaceEnvironmentVariables } from '../utils';
import { Play, Plus, Trash2, Save, TerminalSquare, Check } from 'lucide-react';
import axios from 'axios';
import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CurlImportModal } from './CurlImportModal';
import { AutocompleteInput, AutocompleteTextarea } from './AutocompleteInput';

export function RequestPanel() {
  const { 
    activeRequest, 
    setActiveRequest, 
    activeTab, 
    setActiveTab, 
    setResponse, 
    currentEnvironment, 
    setCurrentRequestConfig,
    addConsoleLog,
    addIssue,
    isBottomDrawerOpen,
    setIsBottomDrawerOpen
  } = useStore();
  
  // Local state for the active request to allow editing without saving immediately
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [params, setParams] = useState<KeyValue[]>([]);
  const [bodyContent, setBodyContent] = useState('');
  const [mockStatus, setMockStatus] = useState<number>(200);
  const [mockHeaders, setMockHeaders] = useState<KeyValue[]>([]);
  const [mockBodyContent, setMockBodyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Changed' | ''>('');
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);

  const activeRequestIdRef = useRef<string | null>(null);
  const skipNextAutosave = useRef(false);

  const handleCurlImport = (curlData: { method: string, url: string, headers: Array<{key: string, value: string}>, body: string }) => {
    setMethod(curlData.method);
    setUrl(curlData.url);
    if (curlData.headers.length > 0) {
      setHeaders(curlData.headers.map(h => ({ id: uuidv4(), key: h.key, value: h.value, enabled: true })));
      // Ensure there's an empty line at the end
      setHeaders(prev => [...prev, { id: uuidv4(), key: '', value: '', enabled: true }]);
    }
    setBodyContent(curlData.body);
    if (curlData.body) {
      setActiveTab('body');
    } else if (curlData.headers.length > 0) {
      setActiveTab('headers');
    }
    setIsCurlModalOpen(false);
  };

  useEffect(() => {
    setCurrentRequestConfig({ url, method, headers, params, bodyContent });
  }, [url, method, headers, params, bodyContent, setCurrentRequestConfig]);

  useEffect(() => {
    if (activeRequest) {
      if (activeRequest.id !== activeRequestIdRef.current) {
        activeRequestIdRef.current = activeRequest.id;
        skipNextAutosave.current = true;
        setUrl(activeRequest.url || '');
        setMethod(activeRequest.method || 'GET');
        setHeaders(activeRequest.headers?.length ? activeRequest.headers : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
        setParams(activeRequest.params?.length ? activeRequest.params : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
        setBodyContent(activeRequest.body?.content || '');
        setMockStatus(activeRequest.mockResponse?.status ?? 200);
        setMockHeaders(activeRequest.mockResponse?.headers?.length ? activeRequest.mockResponse.headers : [{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }]);
        setMockBodyContent(activeRequest.mockResponse?.body ?? '');
        setSaveStatus('');
      }
    } else {
      activeRequestIdRef.current = null;
      setUrl('');
      setMethod('GET');
      setHeaders([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setParams([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setBodyContent('');
      setMockStatus(200);
      setMockHeaders([{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }]);
      setMockBodyContent('');
      setSaveStatus('');
    }
  }, [activeRequest]);

  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!activeRequest || activeRequest.id !== activeRequestIdRef.current) return;
    
    setSaveStatus('Changed');
    
    const timeout = setTimeout(() => {
      handleSaveRequest();
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [url, method, headers, params, bodyContent, mockStatus, mockHeaders, mockBodyContent]);

  const handleSend = async () => {
    if (!url) return;
    setIsLoading(true);
    setResponse(null);

    const envVars = currentEnvironment ? currentEnvironment.variables : [];
    
    // Process URL
    let finalUrl = replaceEnvironmentVariables(url, envVars);
    
    // Process Params
    try {
      const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `http://${finalUrl}`);
      params.filter(p => p.enabled && p.key).forEach(p => {
        urlObj.searchParams.append(
          replaceEnvironmentVariables(p.key, envVars),
          replaceEnvironmentVariables(p.value, envVars)
        );
      });
      finalUrl = urlObj.toString();
    } catch (e: any) {
      addConsoleLog('error', `Invalid Request URL: ${finalUrl}`, method, finalUrl);
      addIssue('error', 'Malformed URL Address', `The requested URL "${finalUrl}" is not valid or contains unsupported characters.`, finalUrl, method, 'Check the syntax, query params, or replace special characters.');
      setIsLoading(false);
      return;
    }

    // Process Headers
    const finalHeaders: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key).forEach(h => {
      finalHeaders[replaceEnvironmentVariables(h.key, envVars)] = replaceEnvironmentVariables(h.value, envVars);
    });

    // Logging connection
    addConsoleLog('info', `Initiating connection: [${method}] ${finalUrl}`, method, finalUrl);

    // Dynamic Protocol Audit
    if (finalUrl.startsWith('http:')) {
      addIssue('warning', 'Unencrypted Protocol (HTTP)', `Request is utilizing cleartext HTTP, leaving payload vulnerable to interception.`, finalUrl, method, 'Upgrade the API service address to use secured https://.');
    }

    // Dynamic POST Audit
    if (method === 'POST' && (!bodyContent || bodyContent.trim() === '')) {
      addIssue('warning', 'POST Payload Empty', `You are sending a POST request with an empty body, which might be rejected by standard REST endpoints.`, finalUrl, method, 'Provide request variables or check if POST should be GET.');
    }

    try {
      let parsedBody = undefined;
      if (bodyContent) {
        try {
          parsedBody = JSON.parse(replaceEnvironmentVariables(bodyContent, envVars));
        } catch (jsonErr: any) {
          addConsoleLog('warn', `Body contains invalid JSON layout. Sending raw content.`, method, finalUrl);
          addIssue('warning', 'Invalid Request JSON', `Request body payload does not conform to standardized JSON syntax: ${jsonErr.message}`, finalUrl, method, 'Verify brackets, double quotes, and correct comma positions in request body tab.');
          parsedBody = replaceEnvironmentVariables(bodyContent, envVars);
        }
      }

      const res = await axios.post('/api/proxy', {
        method,
        url: finalUrl,
        headers: finalHeaders,
        body: parsedBody,
      });

      setResponse(res.data);

      // Log API response success
      addConsoleLog(
        res.data.status >= 400 ? 'error' : 'success', 
        `Response Code: ${res.data.status} ${res.data.statusText || 'OK'}`, 
        method, 
        finalUrl, 
        res.data.status, 
        res.data.timeMs, 
        res.data.size, 
        { 
          request: { url: finalUrl, method, headers: finalHeaders, body: parsedBody }, 
          response: res.data 
        }
      );

      // Audit status code
      if (res.data.status >= 400) {
        addIssue(
          'error', 
          `API Server Response: Error ${res.data.status}`, 
          `The remote host responded with HTTP status ${res.data.status} (${res.data.statusText || 'Error'}).`, 
          finalUrl, 
          method, 
          'Review backend authentication settings, headers, or query parameters.'
        );
      }

      // Audit Latency
      if (res.data.timeMs > 500) {
        addIssue(
          'warning', 
          'High Latency Response', 
          `The round-trip response took ${res.data.timeMs}ms, which is slower than the optimal budget of 500ms.`, 
          finalUrl, 
          method, 
          'Optimize server queries, leverage caching, or reduce requested items.'
        );
      }

      // Audit response size
      if (res.data.size > 1024 * 1024) {
        addIssue(
          'warning', 
          'Heavy Response Size', 
          `Transfer size is ${(res.data.size / 1024 / 1024).toFixed(2)} MB, increasing mobile network overhead.`, 
          finalUrl, 
          method, 
          'Enable server compression headers (gzip) or filter responses using GraphQL.'
        );
      }

      // Audit Security Headers
      const respHeaders = res.data.headers || {};
      const missingHeaders = [];
      if (!respHeaders['content-security-policy'] && !respHeaders['Content-Security-Policy']) missingHeaders.push('Content-Security-Policy');
      if (!respHeaders['x-frame-options'] && !respHeaders['X-Frame-Options']) missingHeaders.push('X-Frame-Options');
      if (!respHeaders['x-content-type-options'] && !respHeaders['X-Content-Type-Options']) missingHeaders.push('X-Content-Type-Options');
      if (missingHeaders.length > 0) {
        addIssue(
          'warning', 
          'Missing Security Headers', 
          `Response lacks network-level protection headers: ${missingHeaders.join(', ')}.`, 
          finalUrl, 
          method, 
          'Add security standard headers to backend response (e.g., using helmet in node).'
        );
      }

    } catch (error: any) {
      const errRes = {
        error: true,
        data: error.response?.data || error.message,
        status: error.response?.status || 0,
      };
      setResponse(errRes);

      addConsoleLog(
        'error', 
        `Connection failed: ${error.message}`, 
        method, 
        finalUrl, 
        error.response?.status || 0, 
        0, 
        0, 
        { 
          request: { url: finalUrl, method, headers: finalHeaders, body: bodyContent }, 
          error: error.message 
        }
      );

      addIssue(
        'error', 
        'Connection Network Failure', 
        `Failed to reach the API host: ${error.message}`, 
        finalUrl, 
        method, 
        'Verify host name resolution, local networking connection, or check CORS limits.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!activeRequest) return;
    setSaveStatus('Saving...');
    try {
      const collection = useStore.getState().collections.find(c => c.id === activeRequest.collectionId);
      if (!collection) return;

      const updatedRequest = {
        ...activeRequest,
        url,
        method,
        headers,
        params,
        body: { ...activeRequest.body, content: bodyContent },
        mockResponse: {
          status: mockStatus,
          headers: mockHeaders,
          body: mockBodyContent
        }
      };

      const updatedRequests = collection.requests.map(r => r.id === activeRequest.id ? updatedRequest : r);
      await updateDoc(doc(db, "collections", collection.id), { requests: updatedRequests });
      
      setActiveRequest(updatedRequest);
      setSaveStatus('Saved');
    } catch (e) {
      console.error("Save failed", e);
      setSaveStatus('Changed');
    }
  };

  const handleKeyValueChange = (
    type: 'headers' | 'params' | 'mockHeaders',
    id: string,
    field: keyof KeyValue,
    value: string | boolean
  ) => {
    const setter = type === 'headers' ? setHeaders : type === 'params' ? setParams : setMockHeaders;
    const items = type === 'headers' ? headers : type === 'params' ? params : mockHeaders;
    
    const newItems = items.map(item => item.id === id ? { ...item, [field]: value } : item);
    
    // Auto-add new row if last row is being typed in
    if (field === 'key' && items[items.length - 1].id === id && value !== '') {
      newItems.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }
    
    setter(newItems);
  };

  const removeKeyValue = (type: 'headers' | 'params' | 'mockHeaders', id: string) => {
    const setter = type === 'headers' ? setHeaders : type === 'params' ? setParams : setMockHeaders;
    const items = type === 'headers' ? headers : type === 'params' ? params : mockHeaders;
    if (items.length === 1) {
      setter([{ id: uuidv4(), key: '', value: '', enabled: true }]);
    } else {
      setter(items.filter(item => item.id !== id));
    }
  };

  const renderKeyValueEditor = (type: 'headers' | 'params' | 'mockHeaders') => {
    const items = type === 'headers' ? headers : type === 'params' ? params : mockHeaders;
    return (
      <div className="flex flex-col h-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded overflow-hidden">
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="w-8 shrink-0 border-r border-[var(--border-subtle)]"></div>
          <div className="flex-1 py-1.5 px-3 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)] border-r border-[var(--border-subtle)]">Key</div>
          <div className="flex-1 py-1.5 px-3 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)]">Value</div>
          <div className="w-10 shrink-0"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center group mb-1 border-b border-[var(--bg-panel)] pb-1">
              <div className="w-8 shrink-0 flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={item.enabled}
                  onChange={(e) => handleKeyValueChange(type, item.id, 'enabled', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 accent-[var(--primary)] text-[var(--primary)] focus:ring-offset-gray-900"
                />
              </div>
              <div className="flex-1 px-1">
                <AutocompleteInput
                  type="text"
                  placeholder="Key"
                  value={item.key || ''}
                  onValueChange={(val) => handleKeyValueChange(type, item.id, 'key', val)}
                  className="w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors"
                />
              </div>
              <div className="flex-1 px-1">
                 <AutocompleteInput
                  type="text"
                  placeholder="Value"
                  value={item.value || ''}
                  onValueChange={(val) => handleKeyValueChange(type, item.id, 'value', val)}
                  className="w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors"
                />
              </div>
              <div className="w-10 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => removeKeyValue(type, item.id)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-delete)] p-1"
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
    <div className="flex flex-col h-full bg-[var(--bg-panel)]">
      {/* URL Bar */}
      <div className="flex items-stretch gap-2 p-4 pb-0">
        <div className="flex bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded overflow-hidden flex-1">
          <select 
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-transparent text-[var(--text-put)] font-bold text-xs px-3 border-r border-[var(--border-strong)] focus:outline-none"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <AutocompleteInput 
            type="text" 
            value={url || ''}
            onValueChange={setUrl}
            placeholder="Enter URL or paste text"
            className="bg-transparent flex-1 px-3 text-sm text-[var(--text-primary)] focus:outline-none"
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={isLoading || !url}
          className="bg-[var(--primary)] hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current hidden" />
          )}
          Send
        </button>
        <div className="flex items-center justify-center min-w-[80px] text-xs font-medium text-[var(--text-secondary)]">
          {saveStatus === 'Saving...' && <span className="animate-pulse">Saving...</span>}
          {saveStatus === 'Saved' && <span className="flex items-center gap-1 text-green-500"><Check className="w-3.5 h-3.5" /> Saved</span>}
          {saveStatus === 'Changed' && <span>Unsaved...</span>}
        </div>
        <button 
          onClick={() => setIsCurlModalOpen(true)}
          className="bg-[var(--bg-hover)] border border-[var(--border-strong)] hover:border-[var(--border-focus)] text-[var(--text-primary)] px-4 rounded text-xs font-medium transition-colors flex items-center gap-2"
        >
          <TerminalSquare className="w-3.5 h-3.5" />
          Import cURL
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mt-4 border-b border-[var(--border-subtle)] px-4 shrink-0">
        {(['params', 'auth', 'headers', 'body', 'mock'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "text-xs pb-2 font-medium transition-colors capitalize",
              activeTab === tab 
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" 
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {tab === 'mock' ? 'Mock Response' : tab}
            {tab === 'headers' && headers.filter(h => h.key).length > 0 && (
              <span className="ml-1.5 text-[9px] bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1 rounded">
                {headers.filter(h => h.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-[var(--bg-base)] p-4">
        {activeTab === 'params' && renderKeyValueEditor('params')}
        {activeTab === 'headers' && renderKeyValueEditor('headers')}
        {activeTab === 'auth' && (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] text-xs">
            <p className="mb-2 text-sm text-[var(--text-primary)]">Authorization</p>
            <p>This request does not use any authorization.</p>
            <select className="mt-4 bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded px-3 py-1.5 outline-none focus:border-[var(--border-focus)]">
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>
        )}
        {activeTab === 'body' && (
          <div className="h-full flex flex-col">
            <div className="mb-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="radio" checked className="accent-[var(--primary)] bg-gray-800 border-gray-700 focus:ring-offset-gray-900" readOnly/>
                raw (JSON)
              </label>
            </div>
            <AutocompleteTextarea
              value={bodyContent}
              onValueChange={setBodyContent}
              placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
              className="flex-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded p-4 font-mono text-sm text-[var(--text-code)] outline-none focus:border-[var(--border-focus)] resize-none transition-colors leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
        {activeTab === 'mock' && (
          <div className="h-full flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Mock Status Code
                </label>
                <input
                  type="number"
                  placeholder="200"
                  value={mockStatus}
                  onChange={(e) => setMockStatus(Number(e.target.value) || 200)}
                  className="bg-[var(--bg-input)] border border-[var(--border-subtle)] focus:border-[var(--border-focus)] rounded text-xs font-mono text-[var(--text-primary)] px-3 py-1.5 outline-none w-32"
                />
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-6">
                Define the status code, custom headers, and body that this mock API will return.
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-[160px]">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Mock Response Headers
              </label>
              <div className="flex-1 min-h-0">
                {renderKeyValueEditor('mockHeaders')}
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-[200px]">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Mock Response Body (JSON or Text)
              </label>
              <AutocompleteTextarea
                value={mockBodyContent}
                onValueChange={setMockBodyContent}
                placeholder="{\n  &quot;message&quot;: &quot;Hello from mock API!&quot;\n}"
                className="flex-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded p-4 font-mono text-sm text-[var(--text-code)] outline-none focus:border-[var(--border-focus)] resize-none transition-colors leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>

      <CurlImportModal 
        isOpen={isCurlModalOpen} 
        onImport={handleCurlImport} 
        onCancel={() => setIsCurlModalOpen(false)} 
      />
    </div>
  );
}
