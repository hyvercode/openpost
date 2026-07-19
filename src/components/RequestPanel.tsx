import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { cn, replaceEnvironmentVariables } from '../utils';
import { Play, Plus, Trash2, Save, TerminalSquare, Check, Wand2, AlertCircle, Shield, Sparkles, File, Paperclip } from 'lucide-react';
import axios from 'axios';
import { KeyValue, RequestAuth } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../lib/api';
import { CurlImportModal } from './CurlImportModal';
import { AutocompleteInput, AutocompleteTextarea } from './AutocompleteInput';
import { JsonEditor } from './JsonEditor';
import { motion, AnimatePresence } from 'motion/react';
import { AuthModal } from './AuthModal';
import { wsManager } from '../lib/websocketManager';
import { GraphQLSchemaExplorer } from './GraphQLSchemaExplorer';

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
    setIsBottomDrawerOpen,
    isRequestLoading,
    setIsRequestLoading,
    addToast,
    wsStatus,
    wsMessages,
    addWsMessage,
    clearWsMessages
  } = useStore();
  
  // Local state for the active request to allow editing without saving immediately
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [params, setParams] = useState<KeyValue[]>([]);
  const [bodyContent, setBodyContent] = useState('');
  const [gqlVariables, setGqlVariables] = useState('');
  const [bodyType, setBodyType] = useState<'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql'>('none');
  const [bodyFormData, setBodyFormData] = useState<KeyValue[]>([]);
  const [mockStatus, setMockStatus] = useState<number>(200);
  const [mockHeaders, setMockHeaders] = useState<KeyValue[]>([]);
  const [mockBodyContent, setMockBodyContent] = useState('');
  const [preRequestScript, setPreRequestScript] = useState('');
  const [postResponseScript, setPostResponseScript] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Changed' | ''>('');
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const [isBulkParams, setIsBulkParams] = useState(false);
  const [bulkParamsValue, setBulkParamsValue] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const [authConfig, setAuthConfig] = useState<RequestAuth>({ type: 'none' });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [introspectionSchema, setIntrospectionSchema] = useState<any>(null);
  const [isDetectingGql, setIsDetectingGql] = useState(false);

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
    setCurrentRequestConfig({ url, method, headers, params, bodyContent, bodyType, bodyFormData });
  }, [url, method, headers, params, bodyContent, bodyType, bodyFormData, setCurrentRequestConfig]);

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
        setGqlVariables(activeRequest.body?.variables || '');
        setBodyType(activeRequest.body?.type || (activeRequest.body?.content ? 'raw' : 'none'));
        setBodyFormData(activeRequest.body?.formData?.length ? activeRequest.body.formData : [{ id: uuidv4(), key: '', value: '', enabled: true }]);
        setMockStatus(activeRequest.mockResponse?.status ?? 200);
        setMockHeaders(activeRequest.mockResponse?.headers?.length ? activeRequest.mockResponse.headers : [{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }]);
        setMockBodyContent(activeRequest.mockResponse?.body ?? '');
        setPreRequestScript(activeRequest.preRequestScript || '');
        setPostResponseScript(activeRequest.postResponseScript || '');
        setAuthConfig(activeRequest.auth || { type: 'none' });
        setSaveStatus('');
        setUrlTouched(false);
        setIntrospectionSchema(null);
        if (activeRequest.method === 'WS') {
          setActiveTab('ws_messages');
        } else if (activeTab === 'ws_messages') {
          setActiveTab('params');
        }

        if (activeRequest.id.endsWith('_rerun')) {
          setTimeout(() => {
            handleSend();
          }, 150);
        }
      }
    } else {
      activeRequestIdRef.current = null;
      setUrl('');
      setMethod('GET');
      setHeaders([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setParams([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setBodyContent('');
      setGqlVariables('');
      setBodyType('none');
      setBodyFormData([{ id: uuidv4(), key: '', value: '', enabled: true }]);
      setMockStatus(200);
      setMockHeaders([{ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true }]);
      setMockBodyContent('');
      setPreRequestScript('');
      setPostResponseScript('');
      setAuthConfig({ type: 'none' });
      setSaveStatus('');
      setUrlTouched(false);
      setIntrospectionSchema(null);
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
  }, [url, method, headers, params, bodyContent, gqlVariables, mockStatus, mockHeaders, mockBodyContent, preRequestScript, postResponseScript, JSON.stringify(authConfig), bodyType, JSON.stringify(bodyFormData)]);

  const handleFormatBody = (target: 'body' | 'mock') => {
    const content = target === 'body' ? bodyContent : mockBodyContent;
    if (!content) return;

    try {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // JSON Formatting
        const parsed = JSON.parse(trimmed);
        const formatted = JSON.stringify(parsed, null, 2);
        if (target === 'body') setBodyContent(formatted);
        else setMockBodyContent(formatted);
        addToast('JSON formatted successfully', 'success', 2000);
      } else if (trimmed.startsWith('<')) {
        // XML Formatting (Basic)
        let formatted = '';
        let reg = /(>)(<)(\/*)/g;
        let xml = trimmed.replace(reg, '$1\r\n$2$3');
        let pad = 0;
        xml.split('\r\n').forEach((node) => {
          let indent = 0;
          if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
          } else if (node.match(/^<\/\w/)) {
            if (pad !== 0) pad -= 1;
          } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
          } else {
            indent = 0;
          }
          formatted += '  '.repeat(pad) + node + '\r\n';
          pad += indent;
        });
        const result = formatted.trim();
        if (target === 'body') setBodyContent(result);
        else setMockBodyContent(result);
        addToast('XML formatted successfully', 'success', 2000);
      }
    } catch (e) {
      console.warn("Formatting failed:", e);
      addToast('Formatting failed. Please check syntax.', 'error');
    }
  };

  const toggleBulkParams = () => {
    if (isBulkParams) {
      // Saving bulk changes back to params
      try {
        const newParams: KeyValue[] = bulkParamsValue
          .split('&')
          .filter(pair => pair.trim() !== '')
          .map(pair => {
            const [key, ...valueParts] = pair.split('=');
            return {
              id: uuidv4(),
              key: decodeURIComponent((key || '').trim()),
              value: decodeURIComponent(valueParts.join('=')),
              enabled: true
            };
          });
        
        // Ensure there's an empty line at the end
        if (newParams.length === 0 || newParams[newParams.length - 1].key !== '') {
          newParams.push({ id: uuidv4(), key: '', value: '', enabled: true });
        }
        
        setParams(newParams);
        addToast('Parameters updated', 'success', 2000);
      } catch (e) {
        addToast('Failed to parse parameters', 'error');
      }
    } else {
      // Loading current params into bulk string
      const bulkString = params
        .filter(p => p.key.trim() !== '')
        .map(p => `${p.key}=${p.value}`)
        .join('&');
      setBulkParamsValue(bulkString);
    }
    setIsBulkParams(!isBulkParams);
  };

  const getUrlError = (value: string) => {
    if (!value.trim()) return "URL is required";
    let resolved = value.trim();
    if (resolved.startsWith('{{')) {
      resolved = resolved.replace(/^\{\{[^}]+\}\}/, 'http://example.com');
    }
    resolved = resolved.replace(/\{\{[^}]+\}\}/g, 'var');
    if (!/^https?:\/\//i.test(resolved)) {
      return "URL must start with http:// or https://";
    }
    try {
      new URL(resolved);
      return null;
    } catch (e) {
      return "Invalid URL format";
    }
  };

  const urlErrorMsg = urlTouched || url ? getUrlError(url) : null;

  const hasInvalidHeaders = headers.some(h => h.enabled && h.value && !h.key);
  const hasInvalidParams = params.some(p => p.enabled && p.value && !p.key);

  const bodyJsonError = (() => {
    if (!bodyContent.trim()) return null;
    const trimmed = bodyContent.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return null;
      } catch (e: any) {
        return e.message;
      }
    }
    return null;
  })();

  const mockJsonError = (() => {
    if (!mockBodyContent.trim()) return null;
    const trimmed = mockBodyContent.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return null;
      } catch (e: any) {
        return e.message;
      }
    }
    return null;
  })();

  const handleSend = async () => {
    setUrlTouched(true);
    const { addToast, currentWorkspace, addHistoryItem } = useStore.getState();

    if (method === 'WS') {
      const reqId = activeRequest?.id;
      if (!reqId) return;
      const status = wsStatus[reqId] || 'disconnected';
      if (status === 'disconnected') {
        let finalUrl = replaceEnvironmentVariables(url, currentEnvironment?.variables || []);
        if (!finalUrl.startsWith('ws://') && !finalUrl.startsWith('wss://')) {
          finalUrl = 'ws://' + finalUrl.replace(/^https?:\/\//, '');
        }
        wsManager.connect(reqId, finalUrl);
        setActiveTab('ws_messages');
      } else {
        wsManager.disconnect(reqId);
      }
      return;
    }
    
    const currentUrlError = getUrlError(url);
    if (currentUrlError) {
      addToast(`Validation Error: ${currentUrlError}`, 'error');
      return;
    }

    if (hasInvalidHeaders) {
      addToast('Validation Error: Headers contain values without keys.', 'error');
      setActiveTab('headers');
      return;
    }

    if (hasInvalidParams) {
      addToast('Validation Error: Parameters contain values without keys.', 'error');
      setActiveTab('params');
      return;
    }

    if (bodyJsonError) {
      addToast('Validation Error: Request body has invalid JSON.', 'error');
      setActiveTab('body');
      return;
    }

    if (!url) return;
    setIsRequestLoading(true);
    setResponse(null);
    addToast(`${method} request sent`, 'info', 2000);

    const envVars = currentEnvironment ? currentEnvironment.variables : [];
    
    // Process scripts (Pre-request)
    const runSandbox = (script: string, context: { envVars: KeyValue[], response?: any }) => {
      if (!script) return { envVars: context.envVars };
      
      const currentVars = [...context.envVars];
      const pm = {
        environment: {
          set: (key: string, value: string) => {
            const index = currentVars.findIndex(v => v.key === key);
            if (index !== -1) {
              currentVars[index] = { ...currentVars[index], value };
            } else {
              currentVars.push({ id: uuidv4(), key, value, enabled: true });
            }
          },
          get: (key: string) => {
            const v = currentVars.find(v => v.key === key);
            return v ? v.value : undefined;
          }
        },
        test: (name: string, fn: () => void) => {
          try {
            fn();
            addConsoleLog('success', `[Test Passed] ${name}`);
          } catch (e: any) {
            addConsoleLog('error', `[Test Failed] ${name}: ${e.message}`);
          }
        },
        response: {
          json: () => context.response?.data
        },
        request: {
          url: url,
          method,
          body: bodyContent
        }
      };

      try {
        const sandboxFunc = new Function('pm', 'console', script);
        sandboxFunc(pm, { log: (msg: any) => addConsoleLog('info', `[Sandbox] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`) });
      } catch (e: any) {
        addConsoleLog('error', `Script Runtime Error: ${e.message}`);
        addToast(`Script Error: ${e.message}`, 'error');
      }

      return { envVars: currentVars };
    };

    let processedEnvVars = envVars;
    if (preRequestScript) {
      addConsoleLog('info', 'Running Pre-request script...');
      const result = runSandbox(preRequestScript, { envVars });
      processedEnvVars = result.envVars;
      
      // If environment variables changed, update the store (local and backend)
      if (currentEnvironment && JSON.stringify(processedEnvVars) !== JSON.stringify(envVars)) {
        const updatedEnv = { ...currentEnvironment, variables: processedEnvVars };
        useStore.getState().setCurrentEnvironment(updatedEnv);
        // Persist to Postgres
        apiService.updateEnvironment(currentEnvironment.id, { variables: processedEnvVars }).catch(console.error);
      }
    }

    // Re-process URL with potentially updated variables
    let finalUrl = replaceEnvironmentVariables(url, processedEnvVars);
    
    // Process Params
    try {
      const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `http://${finalUrl}`);
      params.filter(p => p.enabled && p.key).forEach(p => {
        urlObj.searchParams.append(
          replaceEnvironmentVariables(p.key, processedEnvVars),
          replaceEnvironmentVariables(p.value, processedEnvVars)
        );
      });
      finalUrl = urlObj.toString();
    } catch (e: any) {
      addConsoleLog('error', `Invalid Request URL: ${finalUrl}`, method, finalUrl);
      addIssue('error', 'Malformed URL Address', `The requested URL "${finalUrl}" is not valid or contains unsupported characters.`, finalUrl, method, 'Check the syntax, query params, or replace special characters.');
      setIsRequestLoading(false);
      return;
    }

    // Process Headers
    const finalHeaders: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key).forEach(h => {
      finalHeaders[replaceEnvironmentVariables(h.key, processedEnvVars)] = replaceEnvironmentVariables(h.value, processedEnvVars);
    });

    // Injected Authentication configurations
    if (authConfig && authConfig.type !== 'none') {
      if (authConfig.type === 'bearer' && authConfig.bearer?.token) {
        const token = replaceEnvironmentVariables(authConfig.bearer.token, processedEnvVars);
        finalHeaders['Authorization'] = `Bearer ${token}`;
      } else if (authConfig.type === 'basic') {
        const username = replaceEnvironmentVariables(authConfig.basic?.username || '', processedEnvVars);
        const password = replaceEnvironmentVariables(authConfig.basic?.password || '', processedEnvVars);
        finalHeaders['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
      } else if (authConfig.type === 'apikey' && authConfig.apikey?.key && authConfig.apikey?.value) {
        const keyName = replaceEnvironmentVariables(authConfig.apikey.key, processedEnvVars);
        const keyValue = replaceEnvironmentVariables(authConfig.apikey.value, processedEnvVars);
        if (authConfig.apikey.addTo === 'header') {
          finalHeaders[keyName] = keyValue;
        } else {
          try {
            const urlObj = new URL(finalUrl);
            urlObj.searchParams.set(keyName, keyValue);
            finalUrl = urlObj.toString();
          } catch (e) {
            console.error("Failed to append api key to URL query params", e);
          }
        }
      } else if (authConfig.type === 'oauth2' && authConfig.oauth2?.accessToken) {
        const token = replaceEnvironmentVariables(authConfig.oauth2.accessToken, processedEnvVars);
        finalHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    if (method === 'GQL' && !finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    // Logging connection
    addConsoleLog('info', `Initiating connection: [${method === 'GQL' ? 'POST' : method}] ${finalUrl}`, method, finalUrl);

    // Dynamic Protocol Audit
    if (finalUrl.startsWith('http:')) {
      addIssue('warning', 'Unencrypted Protocol (HTTP)', `Request is utilizing cleartext HTTP, leaving payload vulnerable to interception.`, finalUrl, method, 'Upgrade the API service address to use secured https://.');
    }

    // Dynamic POST Audit
    if (method === 'POST' && (!bodyContent || bodyContent.trim() === '')) {
      addIssue('warning', 'POST Payload Empty', `You are sending a POST request with an empty body, which might be rejected by standard REST endpoints.`, finalUrl, method, 'Provide request variables or check if POST should be GET.');
    }

    try {
      const { proxyConfig } = useStore.getState();
      let parsedBody = undefined;
      const computedBodyType = method === 'GQL' ? 'graphql' : (method === 'WS' ? 'none' : bodyType);

      if (computedBodyType === 'graphql') {
        const resolvedVariables = gqlVariables ? replaceEnvironmentVariables(gqlVariables, processedEnvVars) : '{}';
        let variablesObj = {};
        try {
          variablesObj = JSON.parse(resolvedVariables);
        } catch (e) {
          addToast('Invalid JSON in GraphQL variables', 'error');
          return;
        }
        parsedBody = {
          query: replaceEnvironmentVariables(bodyContent, processedEnvVars),
          variables: variablesObj
        };
        if (!finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
          finalHeaders['Content-Type'] = 'application/json';
        }
      } else if (computedBodyType === 'raw' && bodyContent) {
        try {
          parsedBody = JSON.parse(replaceEnvironmentVariables(bodyContent, processedEnvVars));
          if (!finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
            finalHeaders['Content-Type'] = 'application/json';
          }
        } catch (jsonErr: any) {
          addConsoleLog('warn', `Body contains invalid JSON layout. Sending raw content.`, method, finalUrl);
          addIssue('warning', 'Invalid Request JSON', `Request body payload does not conform to standardized JSON syntax: ${jsonErr.message}`, finalUrl, method, 'Verify brackets, double quotes, and correct comma positions in request body tab.');
          parsedBody = replaceEnvironmentVariables(bodyContent, processedEnvVars);
          if (!finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
            finalHeaders['Content-Type'] = 'text/plain';
          }
        }
      } else if (computedBodyType === 'form-data') {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        let rawBody = '';
        bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
          rawBody += `--${boundary}\r\n`;
          rawBody += `Content-Disposition: form-data; name="${replaceEnvironmentVariables(f.key, processedEnvVars)}"\r\n\r\n`;
          rawBody += `${replaceEnvironmentVariables(f.value, processedEnvVars)}\r\n`;
        });
        if (bodyFormData.filter(f => f.enabled && f.key).length > 0) {
          rawBody += `--${boundary}--\r\n`;
        }
        parsedBody = rawBody;
        finalHeaders['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      } else if (computedBodyType === 'x-www-form-urlencoded') {
        const urlParams = new URLSearchParams();
        bodyFormData.filter(f => f.enabled && f.key).forEach(f => {
          urlParams.append(
            replaceEnvironmentVariables(f.key, processedEnvVars),
            replaceEnvironmentVariables(f.value, processedEnvVars)
          );
        });
        parsedBody = urlParams.toString();
        finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const res = await axios.post('/api/proxy', {
        method: method === 'GQL' ? 'POST' : method,
        url: finalUrl,
        headers: finalHeaders,
        body: parsedBody,
        proxyConfig,
      });

      setResponse(res.data);
      addToast(`Request successful (${res.status})`, 'success');

      // Save to Request History
      addHistoryItem({
        workspaceId: currentWorkspace?.id || 'default',
        name: activeRequest?.name || url || 'Untitled Request',
        method: method,
        url: url,
        headers: headers.filter(h => h.key || h.value),
        params: params.filter(p => p.key || p.value),
        body: {
          type: computedBodyType as any,
          content: bodyContent,
          formData: bodyFormData
        },
        auth: authConfig,
        responseStatus: res.data.status || 200,
        responseStatusText: res.data.statusText || 'OK',
        timeMs: res.data.timeMs
      });

      // Process scripts (Post-response)
      if (postResponseScript) {
        addConsoleLog('info', 'Running Post-response script...');
        const scriptResult = runSandbox(postResponseScript, { envVars: processedEnvVars, response: res.data });
        
        // If environment variables changed in post-response, update store
        if (currentEnvironment && JSON.stringify(scriptResult.envVars) !== JSON.stringify(processedEnvVars)) {
          const finalEnv = { ...currentEnvironment, variables: scriptResult.envVars };
          useStore.getState().setCurrentEnvironment(finalEnv);
          apiService.updateEnvironment(currentEnvironment.id, { variables: scriptResult.envVars }).catch(console.error);
        }
      }

      if (res.data.timeMs) {
        useStore.getState().addLatency(res.data.timeMs);
      }

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
      addToast(`Request failed: ${error.message}`, 'error');

      // Save to Request History
      addHistoryItem({
        workspaceId: currentWorkspace?.id || 'default',
        name: activeRequest?.name || url || 'Untitled Request',
        method: method,
        url: url,
        headers: headers.filter(h => h.key || h.value),
        params: params.filter(p => p.key || p.value),
        body: {
          type: (method === 'GQL' ? 'graphql' : (method === 'WS' ? 'none' : bodyType)) as any,
          content: bodyContent,
          formData: bodyFormData
        },
        auth: authConfig,
        responseStatus: error.response?.status || 0,
        responseStatusText: error.response?.statusText || 'Error',
        timeMs: 0
      });

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
      setIsRequestLoading(false);
    }
  };

  const handleIntrospect = async () => {
    if (!url) {
      addToast('URL is required for introspection', 'error');
      return;
    }
    setIsRequestLoading(true);
    const { currentEnvironment } = useStore.getState();
    const processedEnvVars = currentEnvironment?.variables || [];
    const finalUrl = replaceEnvironmentVariables(url, processedEnvVars);
    
    addConsoleLog('info', `Running GraphQL Introspection on ${finalUrl}...`, 'POST', finalUrl);
    
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            kind
            name
            description
            fields(includeDeprecated: true) {
              name
              description
              args {
                name
                description
                type { name kind }
              }
              type { name kind }
            }
          }
        }
      }
    `;

    try {
      const { proxyConfig } = useStore.getState();
      const finalHeaders: Record<string, string> = {};
      headers.forEach(h => {
        if (h.enabled && h.key) {
          finalHeaders[h.key] = replaceEnvironmentVariables(h.value, processedEnvVars);
        }
      });

      const res = await axios.post('/api/proxy', {
        method: 'POST',
        url: finalUrl,
        headers: {
          ...finalHeaders,
          'Content-Type': 'application/json'
        },
        body: { query: introspectionQuery },
        proxyConfig
      });

      setResponse(res.data);
      if (res.data.data?.__schema) {
        setIntrospectionSchema(res.data.data.__schema);
        addToast('Introspection successful', 'success');
        addConsoleLog('success', 'GraphQL schema fetched successfully', 'POST', finalUrl);
      } else {
        addToast('Introspection returned no schema', 'warning');
        addConsoleLog('warn', 'GraphQL introspection returned empty schema', 'POST', finalUrl);
      }
    } catch (err: any) {
      addToast('Introspection failed', 'error');
      addConsoleLog('error', `Introspection error: ${err.message}`, 'POST', finalUrl);
    } finally {
      setIsRequestLoading(false);
    }
  };

  const handleDetectGraphQL = async () => {
    if (!url) {
      addToast('Please enter a URL first', 'error');
      return;
    }
    setIsDetectingGql(true);
    const { currentEnvironment } = useStore.getState();
    const processedEnvVars = currentEnvironment?.variables || [];
    const finalUrl = replaceEnvironmentVariables(url, processedEnvVars);
    
    addConsoleLog('info', `Testing if ${finalUrl} is a GraphQL endpoint...`, 'POST', finalUrl);

    try {
      const finalHeaders: Record<string, string> = {};
      headers.forEach(h => {
        if (h.enabled && h.key) {
          finalHeaders[h.key] = replaceEnvironmentVariables(h.value, processedEnvVars);
        }
      });

      const { proxyConfig } = useStore.getState();
      const res = await axios.post('/api/proxy', {
        method: 'POST',
        url: finalUrl,
        headers: {
          ...finalHeaders,
          'Content-Type': 'application/json'
        },
        body: { query: '{ __typename }' },
        proxyConfig
      });

      if (res.data?.data?.__typename || res.data?.errors) {
        addToast('GraphQL Endpoint Confirmed!', 'success');
        addConsoleLog('success', 'GraphQL confirmed! Switched to GraphQL editor and triggered schema introspection.', 'POST', finalUrl);
        setMethod('GQL');
        setActiveTab('graphql');
        
        // Fetch schema automatically
        setTimeout(() => {
          handleIntrospect();
        }, 100);
      } else {
        addToast('Endpoint did not return a valid GraphQL response', 'warning');
        addConsoleLog('warn', 'GraphQL check returned response that does not match GraphQL specification.', 'POST', finalUrl);
      }
    } catch (err: any) {
      addToast('Connection failed or endpoint is not GraphQL', 'error');
      addConsoleLog('error', `GraphQL verification failed: ${err.message}`, 'POST', finalUrl);
    } finally {
      setIsDetectingGql(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!activeRequest) return;
    setSaveStatus('Saving...');
    try {
      const collection = useStore.getState().collections.find(c => c.id === activeRequest.collectionId);
      if (!collection) {
        setSaveStatus('');
        return;
      }

      const updatedRequest = {
        ...activeRequest,
        url,
        method,
        headers,
        params,
        body: { 
          ...activeRequest.body, 
          content: bodyContent, 
          variables: gqlVariables,
          type: method === 'GQL' ? 'graphql' : (method === 'WS' ? 'none' : bodyType),
          formData: bodyFormData
        },
        mockResponse: {
          status: mockStatus,
          headers: mockHeaders,
          body: mockBodyContent
        },
        preRequestScript,
        postResponseScript,
        auth: authConfig
      };

      const updatedRequests = collection.requests.map(r => r.id === activeRequest.id ? updatedRequest : r);
      await apiService.updateCollection(collection.id, { requests: updatedRequests });
      
      const { collections, setCollections } = useStore.getState();
      setCollections(collections.map(c => c.id === collection.id ? { ...c, requests: updatedRequests } : c));
      
      setActiveRequest(updatedRequest);
      setSaveStatus('Saved');
      addToast('Request saved successfully', 'success', 2000);
    } catch (e) {
      console.error("Save failed", e);
      setSaveStatus('Changed');
      addToast('Failed to save request', 'error');
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
    
    if (type === 'params' && isBulkParams) {
      return (
        <div className="flex flex-col h-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)]">Bulk Edit Mode</span>
            <button 
              onClick={toggleBulkParams}
              className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider hover:opacity-80 transition-opacity"
            >
              Back to Table
            </button>
          </div>
          <div className="flex-1 p-3">
            <textarea
              value={bulkParamsValue}
              onChange={(e) => setBulkParamsValue(e.target.value)}
              placeholder="id=1&name=test&active=true"
              className="w-full h-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg p-3 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] resize-none"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] pr-3">
          <div className="flex flex-1">
            <div className="w-8 shrink-0 border-r border-[var(--border-subtle)]"></div>
            <div className="flex-1 py-1.5 px-3 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)] border-r border-[var(--border-subtle)]">Key</div>
            <div className="flex-1 py-1.5 px-3 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)]">Value</div>
          </div>
          {type === 'params' && (
            <button 
              onClick={toggleBulkParams}
              className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider hover:opacity-80 transition-opacity ml-2"
            >
              Bulk Edit
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {items.map((item) => {
            const isRowInvalid = item.enabled && item.value.trim() !== '' && item.key.trim() === '';
            return (
              <div key={item.id} className="flex items-center group mb-1 border-b border-[var(--bg-panel)] pb-1">
                <div className="w-8 shrink-0 flex items-center justify-center">
                  <input 
                    type="checkbox" 
                    checked={item.enabled}
                    onChange={(e) => handleKeyValueChange(type, item.id, 'enabled', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 accent-[var(--primary)] text-[var(--primary)] focus:ring-offset-gray-900"
                  />
                </div>
                <div className="flex-1 px-1 relative">
                  <AutocompleteInput
                    type="text"
                    placeholder="Key"
                    value={item.key || ''}
                    onValueChange={(val) => handleKeyValueChange(type, item.id, 'key', val)}
                    className={cn(
                      "w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors",
                      isRowInvalid && "border-red-500 bg-red-500/10 focus:border-red-500 rounded px-2"
                    )}
                  />
                  {isRowInvalid && (
                    <span className="absolute right-2 top-1.5 text-red-500 flex items-center gap-1" title="Key is required when value is provided">
                      <AlertCircle className="w-3 h-3" />
                    </span>
                  )}
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
            );
          })}
          <div className="px-2 py-1.5 mt-1 flex justify-start">
            <button
              onClick={() => {
                const setter = type === 'headers' ? setHeaders : type === 'params' ? setParams : setMockHeaders;
                const currentItems = type === 'headers' ? headers : type === 'params' ? params : mockHeaders;
                setter([...currentItems, { id: uuidv4(), key: '', value: '', enabled: true }]);
              }}
              className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:opacity-85 font-medium px-2 py-1 rounded border border-dashed border-[var(--primary)]/30 hover:border-[var(--primary)] bg-[var(--primary)]/5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      key={activeRequest?.id || 'empty'}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex flex-col h-full bg-[var(--bg-panel)] relative"
    >
      {/* Top Loading Bar */}
      {isRequestLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--bg-hover)] overflow-hidden z-50">
          <div className="h-full bg-[var(--primary)] animate-loading" />
        </div>
      )}

      {/* URL Bar */}
      <div className="flex flex-col px-4 pt-4 pb-0 gap-1.5">
        <div className="flex items-stretch gap-2">
          <div className={cn(
            "flex bg-[var(--bg-hover)] border rounded overflow-hidden flex-1 transition-all",
            urlErrorMsg 
              ? "border-red-500/80 ring-1 ring-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]" 
              : "border-[var(--border-strong)] focus-within:border-[var(--border-focus)]"
          )}>
            <select 
              value={method}
              onChange={(e) => {
                const newMethod = e.target.value;
                setMethod(newMethod);
                if (newMethod === 'WS') {
                  setActiveTab('ws_messages');
                } else if (newMethod === 'GQL') {
                  setActiveTab('graphql');
                } else if (activeTab === 'ws_messages' || activeTab === 'graphql') {
                  setActiveTab('params');
                }
              }}
              className="bg-transparent text-[var(--text-put)] font-bold text-xs px-3 border-r border-[var(--border-strong)] focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="WS">WS</option>
              <option value="GQL">GQL</option>
            </select>
            <AutocompleteInput 
              type="text" 
              value={url || ''}
              onValueChange={setUrl}
              onBlur={() => setUrlTouched(true)}
              placeholder={method === 'WS' ? "Enter ws:// or wss:// URL" : "Enter URL or paste text"}
              className="bg-transparent flex-1 px-3 text-sm text-[var(--text-primary)] focus:outline-none"
            />
            {url && !getUrlError(url) && (
              <button
                onClick={handleDetectGraphQL}
                disabled={isDetectingGql}
                title="Auto-detect if this is a GraphQL endpoint"
                className="flex items-center gap-1.5 text-[10px] px-3 font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] border-l border-[var(--border-strong)] transition-colors duration-150 disabled:opacity-50"
              >
                {isDetectingGql ? (
                  <span className="w-3 h-3 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                )}
                <span>Detect GQL</span>
              </button>
            )}
          </div>
          <button 
            onClick={handleSend}
            disabled={isRequestLoading || (method === 'WS' && wsStatus[activeRequest?.id || ''] === 'connecting')}
            className={cn(
              "text-white px-6 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2",
              method === 'WS' && wsStatus[activeRequest?.id || ''] === 'connected' ? "bg-red-500 hover:bg-red-600" : "bg-[var(--primary)] hover:bg-[#e65a2d]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isRequestLoading || (method === 'WS' && wsStatus[activeRequest?.id || ''] === 'connecting') ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current hidden" />
            )}
            {method === 'WS' 
              ? (wsStatus[activeRequest?.id || ''] === 'connected' ? 'Disconnect' : wsStatus[activeRequest?.id || ''] === 'connecting' ? 'Connecting' : 'Connect') 
              : 'Send'}
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

        {urlErrorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium px-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{urlErrorMsg}</span>
          </div>
        )}

        {url && !getUrlError(url) && /graphql|gql/i.test(url) && method !== 'GQL' && (
          <div className="mt-2 px-3 py-2 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-md flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-[var(--text-primary)]">
              <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse shrink-0" />
              <span>We detected that this URL might be a GraphQL endpoint. Switch to GraphQL Editor?</span>
            </div>
            <button
              onClick={() => {
                setMethod('GQL');
                setActiveTab('graphql');
              }}
              className="bg-[var(--primary)] text-white px-3 py-1 rounded font-bold text-[10px] uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Switch to GraphQL
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mt-4 border-b border-[var(--border-subtle)] px-4 shrink-0 overflow-x-auto no-scrollbar">
        {(method === 'WS' ? ['ws_messages', 'params', 'headers', 'auth', 'scripts'] as const : (method === 'GQL' ? ['graphql', 'params', 'headers', 'auth', 'scripts'] as const : ['params', 'auth', 'headers', 'body', 'scripts', 'mock'] as const)).map(tab => {
          const hasTabError = (() => {
            if (tab === 'headers') return hasInvalidHeaders;
            if (tab === 'params') return hasInvalidParams;
            if (tab === 'body') return !!bodyJsonError;
            if (tab === 'mock') return !!mockJsonError;
            return false;
          })();

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "text-xs pb-2 font-medium transition-colors capitalize flex items-center gap-1.5",
                activeTab === tab 
                  ? "text-[var(--primary)] border-b-2 border-[var(--primary)]" 
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span>{tab === 'mock' ? 'Mock Response' : tab === 'ws_messages' ? 'Messages' : tab}</span>
              {tab === 'headers' && headers.filter(h => h.key).length > 0 && (
                <span className="text-[9px] bg-[var(--bg-hover)] text-[var(--text-secondary)] px-1 rounded font-mono">
                  {headers.filter(h => h.key).length}
                </span>
              )}
              {hasTabError && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Validation issue detected in this tab" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-[var(--bg-base)] p-4 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="h-full flex flex-col min-h-0"
          >
            {activeTab === 'ws_messages' && (
              <div className="h-full flex flex-col min-h-0 bg-[var(--bg-surface)]">
                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                  {wsMessages[activeRequest?.id || '']?.map(msg => (
                    <div key={msg.id} className={cn(
                      "p-2 rounded border",
                      msg.type === 'sent' ? "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)] ml-auto w-fit max-w-[80%]" : 
                      msg.type === 'received' ? "bg-[var(--bg-input)] border-[var(--border-strong)] text-[var(--text-primary)] mr-auto w-fit max-w-[80%]" : 
                      msg.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500 mx-auto w-full text-center" : 
                      "bg-blue-500/10 border-blue-500/20 text-blue-500 mx-auto w-full text-center"
                    )}>
                      <div className="text-[9px] opacity-70 mb-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                      <div className="break-words whitespace-pre-wrap">{msg.data}</div>
                    </div>
                  ))}
                  {(!wsMessages[activeRequest?.id || ''] || wsMessages[activeRequest?.id || ''].length === 0) && (
                    <div className="text-center text-[var(--text-secondary)] italic mt-8">No messages yet.</div>
                  )}
                </div>
                <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Enter message..."
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-strong)] focus:border-[var(--border-focus)] rounded px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        wsManager.sendMessage(activeRequest?.id || '', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value) {
                        wsManager.sendMessage(activeRequest?.id || '', input.value);
                        input.value = '';
                      }
                    }}
                    disabled={wsStatus[activeRequest?.id || ''] !== 'connected'}
                    className="bg-[var(--primary)] hover:bg-[#e65a2d] disabled:opacity-50 text-white px-4 rounded font-bold text-sm transition-colors"
                  >
                    Send
                  </button>
                  <button 
                    onClick={() => clearWsMessages(activeRequest?.id || '')}
                    className="bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[var(--text-primary)] px-3 rounded font-bold text-xs transition-colors"
                    title="Clear Messages"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'graphql' && (
              <div className="h-full flex flex-col min-h-0 bg-[var(--bg-base)]">
                <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] shrink-0">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)]">GraphQL Editor</span>
                     <div className="h-3 w-px bg-[var(--border-subtle)] mx-1" />
                     <button 
                        onClick={handleIntrospect}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider hover:bg-[var(--primary)]/10 px-2 py-1 rounded transition-colors"
                        disabled={isRequestLoading}
                     >
                       <Wand2 className="w-3 h-3" />
                       Introspect
                     </button>
                   </div>
                </div>
                <div className="flex-1 flex min-h-0 overflow-hidden">
                  <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)] min-w-0">
                    <div className="px-4 py-1.5 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)] font-bold uppercase border-b border-[var(--border-subtle)] select-none">Query</div>
                    <div className="flex-1 min-h-0">
                      <AutocompleteTextarea
                        value={bodyContent}
                        onValueChange={setBodyContent}
                        placeholder="query { ... }"
                        className="w-full h-full bg-transparent p-4 font-mono text-xs text-[var(--text-primary)] outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="w-1/3 flex flex-col min-w-0">
                    <div className="px-4 py-1.5 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)] font-bold uppercase border-b border-[var(--border-subtle)] select-none">Variables (JSON)</div>
                    <div className="flex-1 min-h-0">
                      <JsonEditor
                        value={gqlVariables}
                        onChange={setGqlVariables}
                      />
                    </div>
                  </div>
                  {introspectionSchema && (
                    <GraphQLSchemaExplorer 
                      schema={introspectionSchema}
                      onInsertQuery={(queryStub) => {
                        setBodyContent(queryStub);
                        addToast('Query template inserted!', 'success', 2000);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
            {activeTab === 'params' && renderKeyValueEditor('params')}
            {activeTab === 'headers' && renderKeyValueEditor('headers')}
            {activeTab === 'auth' && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg max-w-md mx-auto my-auto shadow-sm">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 border border-blue-500/20">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-[var(--text-primary)] text-sm font-semibold mb-1">Authorization Protocol</h4>
                
                {/* Active Method Pill */}
                <div className="mt-2 mb-3">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                    authConfig.type === 'none' 
                      ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      : "bg-green-500/10 text-green-500 border-green-500/20"
                  )}>
                    {authConfig.type === 'none' ? 'No Auth Active' : 
                     authConfig.type === 'bearer' ? 'Bearer Token' :
                     authConfig.type === 'basic' ? 'Basic Credentials' :
                     authConfig.type === 'apikey' ? 'API Key Integration' : 'OAuth 2.0 (Flow)'}
                  </span>
                </div>

                {/* Description and previews */}
                <p className="text-[var(--text-secondary)] text-xs max-w-xs leading-normal mb-5">
                  {authConfig.type === 'none' && "Configure parameters, bearer tokens, basic credentials, or interactive OAuth 2.0 flows to safely authorize request transmissions."}
                  {authConfig.type === 'bearer' && "Bearer token authorization is active. The token will be injected dynamically in request headers."}
                  {authConfig.type === 'basic' && `Basic credentials active for user "${authConfig.basic?.username}". Encoding credentials automatically.`}
                  {authConfig.type === 'apikey' && `API key "${authConfig.apikey?.key}" will be appended to request ${authConfig.apikey?.addTo === 'header' ? 'headers' : 'query params'}.`}
                  {authConfig.type === 'oauth2' && `OAuth 2.0 token flow active. Active token: ${authConfig.oauth2?.accessToken ? authConfig.oauth2.accessToken.slice(0, 15) + '...' : 'None'}`}
                </p>

                {/* Trigger Modal */}
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold rounded shadow-md hover:shadow-lg transition-all"
                >
                  Configure Authentication...
                </button>
              </div>
            )}
            {activeTab === 'scripts' && (
              <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                      <Play className="w-3 h-3 text-green-500" />
                      Pre-request Script
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)] italic">Executes before sending the request</span>
                  </div>
                  <textarea
                    value={preRequestScript}
                    onChange={(e) => setPreRequestScript(e.target.value)}
                    placeholder="// Use pm.environment.set('key', 'value') to update variables\n// Use pm.request.headers.add({ key: 'X-Foo', value: 'Bar' }) to add headers"
                    className="h-40 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded p-4 font-mono text-xs text-[var(--text-code)] outline-none focus:border-[var(--border-focus)] resize-none transition-colors leading-relaxed"
                    spellCheck={false}
                  />
                </div>

                <div className="flex flex-col gap-3 pb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                      <Check className="w-3 h-3 text-blue-500" />
                      Post-response Script (Tests)
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)] italic">Executes after receiving the response</span>
                  </div>
                  <textarea
                    value={postResponseScript}
                    onChange={(e) => setPostResponseScript(e.target.value)}
                    placeholder="// Use pm.test('Name', () => { ... }) for validations\n// Use pm.response.json() to access response data"
                    className="h-40 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded p-4 font-mono text-xs text-[var(--text-code)] outline-none focus:border-[var(--border-focus)] resize-none transition-colors leading-relaxed"
                    spellCheck={false}
                  />
                </div>
                
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  <p className="font-bold text-[var(--text-primary)] mb-1">Available API (Sandbox):</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><code className="text-[var(--text-code)]">pm.environment.set(key, value)</code> - Set environment variable</li>
                    <li><code className="text-[var(--text-code)]">pm.environment.get(key)</code> - Get environment variable</li>
                    <li><code className="text-[var(--text-code)]">pm.response.json()</code> - Get response body as JSON</li>
                    <li><code className="text-[var(--text-code)]">pm.test(name, fn)</code> - Run a test validation</li>
                    <li><code className="text-[var(--text-code)]">console.log(msg)</code> - Log to internal console</li>
                  </ul>
                </div>
              </div>
            )}
            {activeTab === 'body' && (
              <div className="h-full flex flex-col gap-3 min-h-0">
                {/* Body type selectors */}
                <div className="flex items-center gap-4 border-b border-[var(--border-subtle)] pb-2.5 shrink-0 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'none', label: 'none' },
                    { id: 'raw', label: 'raw (JSON)' },
                    { id: 'form-data', label: 'form-data' },
                    { id: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' }
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                      <input
                        type="radio"
                        name="bodyType"
                        value={option.id}
                        checked={bodyType === option.id}
                        onChange={() => setBodyType(option.id as any)}
                        className="w-3.5 h-3.5 rounded-full border-gray-700 bg-gray-800 accent-[var(--primary)] text-[var(--primary)] focus:ring-offset-gray-900"
                      />
                      <span className={cn(bodyType === option.id && "text-[var(--text-primary)] font-semibold")}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Body Content depending on type */}
                <div className="flex-1 min-h-0">
                  {bodyType === 'none' && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                      <p className="text-[var(--text-secondary)] text-xs">
                        This request does not have a body payload.
                      </p>
                    </div>
                  )}

                  {bodyType === 'raw' && (
                    <div className="h-full flex flex-col">
                      <JsonEditor
                        value={bodyContent}
                        onChange={setBodyContent}
                        placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
                      />
                    </div>
                  )}

                  {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
                    <div className="flex flex-col h-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded overflow-hidden">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 px-3 select-none">
                        <div className="flex flex-1">
                          <div className="w-8 shrink-0 border-r border-[var(--border-subtle)]"></div>
                          <div className="flex-1 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)] border-r border-[var(--border-subtle)] px-3">Key</div>
                          <div className="flex-1 text-[10px] uppercase tracking-widest font-medium text-[var(--text-secondary)] px-3">Value</div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-1">
                        {bodyFormData.map((item) => {
                          const isRowInvalid = item.enabled && item.value.trim() !== '' && item.key.trim() === '';
                          const isFile = bodyType === 'form-data' && item.type === 'file';
                          return (
                            <div key={item.id} className="flex items-center group mb-1 border-b border-[var(--bg-panel)] pb-1">
                              <div className="w-8 shrink-0 flex items-center justify-center">
                                <input 
                                  type="checkbox" 
                                  checked={item.enabled}
                                  onChange={(e) => {
                                    const newItems = bodyFormData.map(b => b.id === item.id ? { ...b, enabled: e.target.checked } : b);
                                    setBodyFormData(newItems);
                                  }}
                                  className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 accent-[var(--primary)] text-[var(--primary)] focus:ring-offset-gray-900"
                                />
                              </div>
                              <div className="flex-1 px-1 relative flex items-center gap-1.5">
                                {bodyType === 'form-data' && (
                                  <div className="shrink-0">
                                    <select
                                      value={item.type || 'text'}
                                      onChange={(e) => {
                                        const newType = e.target.value as 'text' | 'file';
                                        const newItems = bodyFormData.map(b => 
                                          b.id === item.id 
                                            ? { ...b, type: newType, value: '', fileName: undefined } 
                                            : b
                                        );
                                        setBodyFormData(newItems);
                                      }}
                                      className="bg-[var(--bg-surface)] text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold border border-[var(--border-subtle)] rounded px-1.5 py-0.5 cursor-pointer outline-none uppercase transition-all tracking-wider focus:border-[var(--primary)]"
                                    >
                                      <option value="text" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">Text</option>
                                      <option value="file" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans">File</option>
                                    </select>
                                  </div>
                                )}
                                <div className="flex-1 min-h-0">
                                  <AutocompleteInput
                                    type="text"
                                    placeholder="Key"
                                    value={item.key || ''}
                                    onValueChange={(val) => {
                                      let newItems = bodyFormData.map(b => b.id === item.id ? { ...b, key: val } : b);
                                      if (bodyFormData[bodyFormData.length - 1].id === item.id && val !== '') {
                                        newItems.push({ id: uuidv4(), key: '', value: '', enabled: true, type: 'text' });
                                      }
                                      setBodyFormData(newItems);
                                    }}
                                    className={cn(
                                      "w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors",
                                      isRowInvalid && "border-red-500 bg-red-500/10 focus:border-red-500 rounded px-2"
                                    )}
                                  />
                                </div>
                              </div>
                              <div className="flex-1 px-1">
                                {isFile ? (
                                  <div className="flex items-center gap-2">
                                    {item.fileName ? (
                                      <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-1 rounded text-xs text-[var(--text-primary)] max-w-full min-w-0 font-mono flex-1">
                                        <File className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                                        <span className="truncate flex-1 text-[11px] font-medium">{item.fileName}</span>
                                        <button
                                          onClick={() => {
                                            const newItems = bodyFormData.map(b => 
                                              b.id === item.id 
                                                ? { ...b, value: '', fileName: undefined } 
                                                : b
                                            );
                                            setBodyFormData(newItems);
                                          }}
                                          className="text-[var(--text-secondary)] hover:text-[var(--text-delete)] p-0.5 rounded transition-all ml-1"
                                          title="Clear file"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <label className="flex items-center gap-1.5 cursor-pointer bg-[var(--bg-surface)] hover:bg-[var(--bg-panel)] border border-dashed border-[var(--border-strong)] px-3 py-1 rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-medium select-none">
                                        <Paperclip className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                        <span className="text-[11px]">Select File</span>
                                        <input
                                          type="file"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onload = () => {
                                                const result = reader.result as string;
                                                const base64Content = result.split(',')[1] || result;
                                                const newItems = bodyFormData.map(b => 
                                                  b.id === item.id 
                                                    ? { ...b, value: base64Content, fileName: file.name } 
                                                    : b
                                                );
                                                setBodyFormData(newItems);
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  <AutocompleteInput
                                    type="text"
                                    placeholder="Value"
                                    value={item.value || ''}
                                    onValueChange={(val) => {
                                      const newItems = bodyFormData.map(b => b.id === item.id ? { ...b, value: val } : b);
                                      setBodyFormData(newItems);
                                    }}
                                    className="w-full bg-transparent border-b border-transparent focus:border-[var(--border-strong)] px-2 py-1 text-xs font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] transition-colors"
                                  />
                                )}
                              </div>
                              <div className="w-10 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => {
                                    if (bodyFormData.length === 1) {
                                      setBodyFormData([{ id: uuidv4(), key: '', value: '', enabled: true }]);
                                    } else {
                                      setBodyFormData(bodyFormData.filter(b => b.id !== item.id));
                                    }
                                  }}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-delete)] p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="px-2 py-1.5 border-t border-[var(--border-subtle)] mt-1 flex justify-start">
                          <button
                            onClick={() => {
                              setBodyFormData([...bodyFormData, { id: uuidv4(), key: '', value: '', enabled: true }]);
                            }}
                            className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:opacity-85 font-medium px-2 py-1 rounded border border-dashed border-[var(--primary)]/30 hover:border-[var(--primary)] bg-[var(--primary)]/5 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Field</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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

                <div className="flex flex-col flex-1 min-h-[280px]">
                  <JsonEditor
                    value={mockBodyContent}
                    onChange={setMockBodyContent}
                    placeholder="{\n  &quot;message&quot;: &quot;Hello from mock API!&quot;\n}"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <CurlImportModal 
        isOpen={isCurlModalOpen} 
        onImport={handleCurlImport} 
        onCancel={() => setIsCurlModalOpen(false)} 
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        auth={authConfig}
        onSave={(updatedAuth) => setAuthConfig(updatedAuth)}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </motion.div>
  );
}
