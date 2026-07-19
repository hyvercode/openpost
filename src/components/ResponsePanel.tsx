import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../utils';
import axios from 'axios';
import { JsonTree } from './JsonTree';
import { Clock, Database, Activity, CheckCircle2, AlertCircle, Wifi, Copy, Check, TrendingUp } from 'lucide-react';
import { generateCurl, generateFetch, generateAxios, generatePythonRequests, generateGo } from '../utils/snippetGenerator';
import { replaceEnvironmentVariables } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

function LatencyChart({ data }: { data: number[] }) {
  const chartData = data.map((ms, index) => ({
    name: `Req ${index + 1}`,
    latency: ms,
  }));

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] text-xs italic bg-[var(--bg-base)]/30 rounded-lg border border-dashed border-[var(--border-subtle)] p-8">
        <TrendingUp className="w-8 h-8 mb-2 opacity-20" />
        No performance data yet. Execute requests to see trends.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
          <XAxis 
            dataKey="name" 
            hide={true}
          />
          <YAxis 
            stroke="var(--text-secondary)" 
            fontSize={10} 
            tickFormatter={(value) => `${value}ms`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-panel)', 
              borderColor: 'var(--border-strong)',
              fontSize: '11px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            itemStyle={{ color: 'var(--primary)' }}
            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="latency" 
            stroke="var(--primary)" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorLatency)" 
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const MAX_HIGHLIGHT_SIZE = 150 * 1024; // 150 KB

function formatXml(xml: string): string {
  let formatted = '';
  let indent = '';
  const tab = '  ';
  
  const cleanXml = xml
    .replace(/>\s+</g, '><')
    .trim();
    
  const tokens = cleanXml.split(/(<\/?[^>]+>)/g);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;
    
    const tagNameMatch = token.match(/<([^\s>]+)/);
    const rawTagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
    const tagName = rawTagName.replace('/', '');
    const isVoid = HTML_VOID_ELEMENTS.has(tagName);
    
    if (token.startsWith('</')) {
      // Closing tag
      if (indent.length >= tab.length) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + token + '\n';
    } else if (token.startsWith('<') && !token.endsWith('/>') && !token.startsWith('<?') && !token.startsWith('<!') && !isVoid) {
      // Opening tag
      let isInline = false;
      if (i + 2 < tokens.length) {
        const next = tokens[i + 1].trim();
        const afterNext = tokens[i + 2].trim();
        const currentTagNameMatch = token.match(/<([^\s>]+)/);
        const currentTagName = currentTagNameMatch ? currentTagNameMatch[1] : '';
        if (next && !next.startsWith('<') && afterNext === `</${currentTagName}>`) {
          isInline = true;
        }
      }
      
      if (isInline) {
        formatted += indent + token + tokens[i + 1].trim() + tokens[i + 2].trim() + '\n';
        i += 2; // skip text and closing tag
      } else {
        formatted += indent + token + '\n';
        indent += tab;
      }
    } else {
      // Self closing, void, comment, declaration or text
      formatted += indent + token + '\n';
    }
  }
  return formatted.trim();
}

function highlightJson(json: string, isLightTheme: boolean): string {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
    let cls = isLightTheme ? 'text-amber-600 font-medium' : 'text-amber-400'; // number
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = isLightTheme ? 'text-blue-700 font-semibold' : 'text-sky-400 font-semibold'; // key
      } else {
        cls = isLightTheme ? 'text-emerald-700 font-medium' : 'text-emerald-400'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = isLightTheme ? 'text-purple-700 font-semibold' : 'text-purple-400 font-medium'; // boolean
    } else if (/null/.test(match)) {
      cls = isLightTheme ? 'text-gray-400 italic' : 'text-gray-500 italic'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function highlightXml(xml: string, isLightTheme: boolean): string {
  let escaped = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Comments
  escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (match) => {
    const cls = isLightTheme ? 'text-gray-400 italic' : 'text-gray-500 italic';
    return `<span class="${cls}">${match}</span>`;
  });

  // 2. Declarations
  escaped = escaped.replace(/(&lt;\?xml[\s\S]*?\?&gt;|&lt;!DOCTYPE[\s\S]*?&gt;)/gi, (match) => {
    const cls = isLightTheme ? 'text-pink-700 font-semibold' : 'text-pink-400 font-semibold';
    return `<span class="${cls}">${match}</span>`;
  });

  // 3. Tags and Attributes
  escaped = escaped.replace(/&lt;(\/?[a-zA-Z0-9_:-]+)([\s\S]*?)(\/?)&gt;/g, (match, tagName, attrs, selfClosed) => {
    const tagCls = isLightTheme ? 'text-blue-700 font-medium' : 'text-sky-400 font-medium';
    
    const highlightedAttrs = attrs.replace(/([a-zA-Z0-9_:-]+)(=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (_attrMatch, attrName, attrVal) => {
      const attrNameCls = isLightTheme ? 'text-amber-700 font-medium' : 'text-amber-400';
      const attrValCls = isLightTheme ? 'text-emerald-700' : 'text-emerald-400';
      
      let formattedAttr = `<span class="${attrNameCls}">${attrName}</span>`;
      if (attrVal) {
        const eqIdx = attrVal.indexOf('=');
        const eq = attrVal.substring(0, eqIdx + 1);
        const val = attrVal.substring(eqIdx + 1);
        formattedAttr += `<span class="text-gray-500">${eq}</span><span class="${attrValCls}">${val}</span>`;
      }
      return formattedAttr;
    });

    return `<span class="${tagCls}">&lt;${tagName}</span>${highlightedAttrs}<span class="${tagCls}">${selfClosed}&gt;</span>`;
  });

  return escaped;
}

function detectLanguage(response: any): 'json' | 'xml' | 'html' | 'text' {
  if (!response) return 'text';
  
  const headers = response.headers || {};
  const contentType = Object.keys(headers).reduce((acc, key) => {
    if (key.toLowerCase() === 'content-type') {
      return String(headers[key]).toLowerCase();
    }
    return acc;
  }, '');
  
  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    return 'json';
  }
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
    return 'html';
  }
  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    return 'xml';
  }
  
  const data = response.data;
  if (typeof data === 'object' && data !== null) {
    return 'json';
  }
  
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch (_) {}
    }
    if (trimmed.startsWith('<')) {
      if (trimmed.startsWith('<!DOCTYPE html') || trimmed.toLowerCase().includes('<html') || trimmed.toLowerCase().includes('<body>')) {
        return 'html';
      }
      return 'xml';
    }
  }
  
  return 'text';
}

function getFormattedContent(data: any, lang: 'json' | 'xml' | 'html' | 'text'): string {
  if (data === null || data === undefined) return '';
  
  if (lang === 'json') {
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch (_) {
        return data;
      }
    }
  }
  
  if (lang === 'xml' || lang === 'html') {
    if (typeof data === 'string') {
      try {
        return formatXml(data);
      } catch (_) {
        return data;
      }
    }
  }
  
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  
  return String(data);
}

function getHighlightedContent(content: string, lang: 'json' | 'xml' | 'html' | 'text', isLightTheme: boolean): string {
  if (lang === 'json') {
    return highlightJson(content, isLightTheme);
  }
  if (lang === 'xml' || lang === 'html') {
    return highlightXml(content, isLightTheme);
  }
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function ResponsePanel() {
  const { response, currentRequestConfig, currentEnvironment, latencyHistory, isRequestLoading, activeRequest, wsStatus, wsMessages, clearWsMessages, theme } = useStore();
  const isLightTheme = theme === 'light';

  const [activeTab, setActiveTab] = useState<'body' | 'preview' | 'headers' | 'code' | 'stats'>('body');  
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('fetch');
  const [copied, setCopied] = useState(false);

  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [selectedLang, setSelectedLang] = useState<'json' | 'xml' | 'html' | 'text' | 'auto'>('auto');
  const [bodyCopied, setBodyCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState<'json' | 'xml' | 'html' | 'text'>('text');

  useEffect(() => {
    if (response && !response.error) {
      setDetectedLang(detectLanguage(response));
    }
  }, [response]);

  const currentLang = selectedLang === 'auto' ? detectedLang : selectedLang;

  const handleGenerateCode = async (lang?: string) => {
    if (!currentRequestConfig) return;
    const targetLang = lang || codeLanguage;

    // Resolve variables
    const envVars = currentEnvironment ? currentEnvironment.variables : [];
    const resolvedConfig = {
      ...currentRequestConfig,
      url: replaceEnvironmentVariables(currentRequestConfig.url, envVars),
      headers: currentRequestConfig.headers.map((h: any) => ({
        ...h,
        key: replaceEnvironmentVariables(h.key, envVars),
        value: replaceEnvironmentVariables(h.value, envVars)
      })),
      params: currentRequestConfig.params.map((p: any) => ({
        ...p,
        key: replaceEnvironmentVariables(p.key, envVars),
        value: replaceEnvironmentVariables(p.value, envVars)
      })),
      bodyContent: replaceEnvironmentVariables(currentRequestConfig.bodyContent, envVars)
    };
    
    // Check for local generators first
    let localCode = '';
    switch (targetLang) {
      case 'cURL': localCode = generateCurl(resolvedConfig); break;
      case 'fetch': localCode = generateFetch(resolvedConfig); break;
      case 'axios': localCode = generateAxios(resolvedConfig); break;
      case 'python': localCode = generatePythonRequests(resolvedConfig); break;
      case 'go': localCode = generateGo(resolvedConfig); break;
    }

    if (localCode) {
      setGeneratedCode(localCode);
      return;
    }

    // Fallback to AI for others
    setIsGeneratingCode(true);
    try {
      const res = await axios.post('/api/generate-code', {
        requestConfig: resolvedConfig,
        language: targetLang
      });
      let code = res.data.code;
      code = code.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
      setGeneratedCode(code);
    } catch (error) {
      console.error("Failed to generate code", error);
      setGeneratedCode("// Error generating code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'code') {
      handleGenerateCode();
    }
  }, [activeTab, codeLanguage, currentRequestConfig]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHtml = typeof response?.data === 'string' && response.data.trim().startsWith('<');

  if (activeRequest?.method === 'WS') {
    const status = wsStatus[activeRequest.id] || 'disconnected';
    const messages = wsMessages[activeRequest.id] || [];
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col h-full bg-[var(--bg-input)] border-l border-[var(--border-subtle)] shrink-0 min-w-0"
      >
        <div className="h-10 border-b border-[var(--border-subtle)] flex items-center justify-between px-4 bg-[var(--bg-surface)] shrink-0">
          <div className="flex gap-4 h-full items-end">
             <div className="text-xs font-medium pb-2 text-[var(--text-primary)] border-b-2 border-[var(--primary)] cursor-default">
               Event Log
             </div>
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Status:</span>
              <span className={cn(
                "font-bold uppercase",
                status === 'connected' ? "text-green-500" :
                status === 'connecting' ? "text-yellow-500 animate-pulse" : "text-[var(--text-secondary)]"
              )}>
                {status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-[var(--border-subtle)] pl-4">
              <span className="text-[var(--text-secondary)]">Events:</span>
              <span className="font-bold text-[var(--text-primary)]">{messages.length}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[11px] bg-[var(--bg-surface)]">
          {messages.map(msg => (
            <div key={msg.id} className="flex gap-3 py-1 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)] px-2 rounded -mx-2">
              <div className="text-[var(--text-secondary)] w-16 shrink-0 pt-0.5">{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
              <div className="w-16 shrink-0 pt-0.5">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                  msg.type === 'sent' ? "bg-[var(--primary)]/10 text-[var(--primary)]" : 
                  msg.type === 'received' ? "bg-blue-500/10 text-blue-500" : 
                  msg.type === 'error' ? "bg-red-500/10 text-red-500" : 
                  "bg-[var(--bg-input)] text-[var(--text-secondary)]"
                )}>
                  {msg.type}
                </span>
              </div>
              <div className={cn(
                "break-words whitespace-pre-wrap flex-1",
                msg.type === 'error' ? "text-red-500" : "text-[var(--text-primary)]"
              )}>
                {msg.data}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] italic">
              <Wifi className="w-8 h-8 mb-2 opacity-20" />
              Waiting for connection...
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-[var(--bg-input)] border-l border-[var(--border-subtle)] shrink-0 min-w-0"
    >
      <div className="h-10 border-b border-[var(--border-subtle)] flex items-center justify-between px-4 bg-[var(--bg-surface)] shrink-0">
        <div className="flex gap-4 h-full items-end"> 
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'body' ? "text-[var(--text-primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
             onClick={() => setActiveTab('body')}
           >
             Body
           </div>
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'preview' ? "text-[var(--text-primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
             onClick={() => setActiveTab('preview')}
           >
             Preview
           </div>
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'headers' ? "text-[var(--text-primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
             onClick={() => setActiveTab('headers')}
           >
             Headers
           </div>
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'code' ? "text-[var(--text-primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
             onClick={() => setActiveTab('code')}
           >
             Code
           </div>
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'stats' ? "text-[var(--text-primary)] border-b-2 border-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
             onClick={() => setActiveTab('stats')}
           >
             Stats
           </div>
        </div>
        
        {response && !response.error && activeTab !== 'code' && (
          <div className="flex gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Status:</span>
              <span className={cn(
                "font-bold",
                response.status >= 200 && response.status < 300 ? "text-green-500" :
                response.status >= 400 ? "text-red-500" : "text-yellow-500"
              )}>
                {response.status} {response.statusText}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Time:</span>
              <span className="text-[var(--text-primary)]">{response.timeMs} ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Size:</span>
              <span className="text-[var(--text-primary)]">{(response.size / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 bg-[var(--bg-input)] flex flex-col min-h-0 relative">
        <AnimatePresence>
          {isRequestLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-[var(--bg-base)]/60 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="relative flex flex-col items-center"
              >
                <div className="absolute w-28 h-28 bg-[var(--primary)]/10 blur-xl rounded-full animate-pulse -top-6" />
                <div className="relative mb-4">
                  <div className="w-14 h-14 border-4 border-[var(--primary)]/10 border-t-[var(--primary)] rounded-full animate-spin shadow-lg shadow-[var(--primary)]/5" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[var(--primary)] animate-pulse" />
                  </div>
                </div>
                <div className="text-[var(--text-primary)] text-xs font-bold tracking-widest uppercase flex items-center gap-1.5 bg-[var(--bg-panel)] px-3.5 py-1.5 border border-[var(--border-strong)] rounded-full shadow-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  Processing Request...
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (response ? '-has-resp' : '-empty')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 flex flex-col min-h-0"
          >
            {activeTab === 'code' ? (
              <div className="flex-1 flex flex-col p-4 overflow-hidden"> 
                 <div className="flex items-center justify-between mb-4 shrink-0">
                   <div className="flex items-center gap-2">
                     <select 
                       className="bg-[var(--bg-hover)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] rounded px-3 py-1.5 outline-none focus:border-[var(--border-focus)]"
                       value={codeLanguage}
                       onChange={(e) => setCodeLanguage(e.target.value)}
                     >
                       <option value="fetch">JavaScript (Fetch)</option>
                       <option value="axios">JavaScript (Axios)</option>
                       <option value="cURL">cURL</option>
                       <option value="python">Python (Requests)</option>
                       <option value="go">Go (net/http)</option>
                       <option value="java">Java (OkHttp)</option>
                       <option value="php">PHP (cURL)</option>
                       <option value="ruby">Ruby (Net::HTTP)</option>
                       <option value="csharp">C# (HttpClient)</option>
                       <option value="swift">Swift (URLSession)</option>
                     </select>
                     {isGeneratingCode && (
                       <span className="text-[10px] text-[var(--text-secondary)] animate-pulse flex items-center gap-1.5 ml-2">
                         <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></span>
                         AI Generating...
                       </span>
                     )}
                   </div>
                   
                   <button 
                     onClick={handleCopy}
                     disabled={!generatedCode}
                     className="flex items-center gap-1.5 bg-[var(--bg-hover)] hover:bg-[var(--border-strong)] disabled:opacity-50 border border-[var(--border-strong)] text-[var(--text-primary)] px-3 py-1.5 rounded text-xs font-medium transition-all active:scale-95"
                   >
                     {copied ? (
                       <>
                         <Check className="w-3.5 h-3.5 text-green-500" />
                         <span>Copied!</span>
                       </>
                     ) : (
                       <>
                         <Copy className="w-3.5 h-3.5" />
                         <span>Copy Code</span>
                       </>
                     )}
                   </button>
                 </div>
                 
                 <div className="flex-1 overflow-auto bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-mono text-sm group relative">
                   {generatedCode ? (
                     <div className="p-4">
                       <pre className="text-[var(--text-code)] leading-relaxed overflow-x-auto whitespace-pre">
                         {generatedCode}
                       </pre>
                     </div>
                   ) : (
                     <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-xs italic">
                       {isGeneratingCode ? 'Processing request parameters...' : 'Select a language to view snippet'}
                     </div>
                   )}
                 </div>
              </div>
            ) : activeTab === 'stats' && response ? (
              <div className="flex-1 overflow-auto p-6 space-y-6 bg-[var(--bg-base)]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--primary)]" />
                  Request Performance & Telemetry
                </h3>

                {/* Performance Trend Chart */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">Performance Trends</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Latency history for the last {latencyHistory.length} requests</p>
                    </div>
                    <div className="bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[9px] font-bold border border-[var(--primary)]/20 uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3" />
                      Live History
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 h-[200px] shadow-sm relative group overflow-hidden">
                    <LatencyChart data={latencyHistory} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timing Breakdown Card */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-400" />
                        Timing Breakdown
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        response.timeMs < 100 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        response.timeMs < 300 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        response.timeMs < 1000 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {response.timeMs < 100 ? "Excellent" :
                         response.timeMs < 300 ? "Good" :
                         response.timeMs < 1000 ? "Average" : "Slow"}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-[var(--text-secondary)]">DNS Lookup</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">{response.timings?.dns ?? 0} ms</span>
                        </div>
                        <div className="w-full h-1 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${Math.min(100, ((response.timings?.dns || 0) / (response.timeMs || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-[var(--text-secondary)]">TCP Connection</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">{response.timings?.tcp ?? 0} ms</span>
                        </div>
                        <div className="w-full h-1 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full" 
                            style={{ width: `${Math.min(100, ((response.timings?.tcp || 0) / (response.timeMs || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-[var(--text-secondary)]">Request/Response</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">{Math.max(0, response.timeMs - (response.timings?.dns || 0) - (response.timings?.tcp || 0))} ms</span>
                        </div>
                        <div className="w-full h-1 bg-[var(--bg-input)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[var(--primary)] rounded-full" 
                            style={{ width: `${Math.min(100, (Math.max(0, response.timeMs - (response.timings?.dns || 0) - (response.timings?.tcp || 0)) / (response.timeMs || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Total Latency</span>
                      <span className="text-sm font-bold text-[var(--primary)] font-mono">{response.timeMs} ms</span>
                    </div>
                  </div>

                  {/* Size Card */}
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-purple-400" />
                        Response Size
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        response.size < 10240 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        response.size < 102400 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      )}>
                        {response.size < 10240 ? "Lightweight" :
                         response.size < 102400 ? "Medium" : "Heavy"}
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                        {(response.size / 1024).toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-secondary)]">KB</span>
                      <span className="text-xs text-[var(--text-secondary)] font-normal">({response.size.toLocaleString()} bytes)</span>
                    </div>
                    
                    <div className="w-full bg-[var(--bg-input)] rounded-full h-1.5 overflow-hidden mb-3">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (response.size / 512000) * 100)}%` }}
                      />
                    </div>
                    
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      The raw size of the transferred response payload returned by the remote server.
                    </p>
                  </div>
                </div>

                {/* Network Speed Estimations */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-4 flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-[var(--primary)]" />
                    Estimated Download Times
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[var(--bg-input)] p-3.5 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">Slow 3G Connection (1.6 Mbps)</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] mt-1.5 font-mono">
                        {Math.max(0.001, response.size / (200 * 1024)).toFixed(3)}s
                      </span>
                    </div>
                    <div className="bg-[var(--bg-input)] p-3.5 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">Fast 4G Connection (12 Mbps)</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] mt-1.5 font-mono">
                        {Math.max(0.001, response.size / (1500 * 1024)).toFixed(3)}s
                      </span>
                    </div>
                    <div className="bg-[var(--bg-input)] p-3.5 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium">Broadband Wi-Fi (100 Mbps)</span>
                      <span className="text-sm font-bold text-[var(--text-primary)] mt-1.5 font-mono">
                        {Math.max(0.001, response.size / (12500 * 1024)).toFixed(3)}s
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overview Detail Box */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    response.status >= 200 && response.status < 300 ? "bg-green-500/10 text-green-400" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {response.status >= 200 && response.status < 300 ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">HTTP Status Code</div>
                    <div className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{response.status}</span>
                      <span className="text-xs text-[var(--text-secondary)] font-normal">—</span>
                      <span className="text-sm text-[var(--text-secondary)] font-medium">{response.statusText || (response.status >= 200 && response.status < 300 ? "OK" : "Error")}</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Active Engine</div>
                    <div className="text-xs text-[var(--text-primary)] font-mono">API Proxy Core v1.0</div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'headers' && response ? (
              <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                <pre className="text-[var(--text-code)] leading-relaxed overflow-hidden">
                  {JSON.stringify(response.headers, null, 2)}
                </pre>
              </div>
            ) : activeTab === 'preview' && response && !response.error ? (
              <div className="flex-1 overflow-auto bg-[var(--bg-base)] p-4">
                {isHtml ? (
                  <iframe 
                    srcDoc={response.data} 
                    className="w-full h-full bg-white rounded border border-[var(--border-subtle)]"
                    sandbox="allow-same-origin"
                    title="Response Preview"
                  />
                ) : typeof response.data === 'object' ? (
                  <div className="pl-4">
                    <JsonTree data={response.data} initiallyExpanded={true} />
                  </div>
                ) : (
                  <div className="text-[var(--text-secondary)] text-sm font-mono whitespace-pre-wrap">
                    {response.data}
                  </div>
                )}
              </div>
            ) : !response ? (
              <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-xs">
                Hit Send to get a response
              </div>
            ) : response.error ? (
              <div className="flex-1 p-4 overflow-auto text-[var(--text-delete)] font-mono text-sm">
                <h4 className="font-bold mb-2 text-xs">Error</h4>
                <pre className="whitespace-pre-wrap">{JSON.stringify(response.data, null, 2)}</pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-input)]">
                {/* Format and language selector toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 gap-2">
                  <div className="flex items-center gap-3">
                    {/* View mode toggle */}
                    <div className="flex items-center bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded p-0.5">
                      <button
                        onClick={() => setViewMode('pretty')}
                        className={cn(
                          "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                          viewMode === 'pretty'
                            ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm font-semibold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        Pretty
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={cn(
                          "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                          viewMode === 'raw'
                            ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm font-semibold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        Raw
                      </button>
                    </div>

                    {/* Language selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">Type:</span>
                      <select
                        className="bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[11px] text-[var(--text-primary)] rounded px-2 py-1 outline-none focus:border-[var(--border-focus)] font-medium cursor-pointer"
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value as any)}
                      >
                        <option value="auto">Auto ({detectedLang.toUpperCase()})</option>
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="html">HTML</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                  </div>

                  {/* Copy response body button */}
                  <button
                    onClick={() => {
                      const text = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
                      navigator.clipboard.writeText(text);
                      setBodyCopied(true);
                      setTimeout(() => setBodyCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 bg-[var(--bg-hover)] hover:bg-[var(--border-strong)] border border-[var(--border-strong)] text-[var(--text-primary)] px-2.5 py-1 rounded text-xs font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    {bodyCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Response Code/Text viewer */}
                <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-[var(--bg-base)]">
                  {(() => {
                    const rawContent = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
                    
                    if (viewMode === 'raw') {
                      return (
                        <pre className="text-[var(--text-code)] leading-relaxed whitespace-pre-wrap break-all">
                          {rawContent}
                        </pre>
                      );
                    }

                    const formattedContent = getFormattedContent(response.data, currentLang);
                    const isTooLarge = formattedContent.length > MAX_HIGHLIGHT_SIZE;

                    if (isTooLarge) {
                      return (
                        <div className="space-y-3">
                          <div className="text-[11px] bg-amber-500/15 text-amber-500 border border-amber-500/20 rounded p-2.5 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Response body ({(formattedContent.length / 1024).toFixed(1)} KB) is too large for syntax highlighting. Showing formatted raw text instead.</span>
                          </div>
                          <pre className="text-[var(--text-code)] leading-relaxed whitespace-pre-wrap break-all">
                            {formattedContent}
                          </pre>
                        </div>
                      );
                    }

                    const highlightedHtml = getHighlightedContent(formattedContent, currentLang, isLightTheme);

                    return (
                      <pre 
                        className="text-[var(--text-code)] leading-relaxed whitespace-pre"
                        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                      />
                    );
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
