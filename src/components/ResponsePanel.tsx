import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../utils';
import axios from 'axios';
import { JsonTree } from './JsonTree';
import { Clock, Database, Activity, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';

export function ResponsePanel() {
  const { response, currentRequestConfig } = useStore();
  const [activeTab, setActiveTab] = useState<'body' | 'preview' | 'headers' | 'code' | 'stats'>('body');  
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('fetch');

  const handleGenerateCode = async () => {
    if (!currentRequestConfig) return;
    setIsGeneratingCode(true);
    try {
      const res = await axios.post('/api/generate-code', {
        requestConfig: currentRequestConfig,
        language: codeLanguage
      });
      // Try to remove markdown formatting if AI still included it
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

  const isHtml = typeof response?.data === 'string' && response.data.trim().startsWith('<');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-input)] border-l border-[var(--border-subtle)] shrink-0 min-w-0">
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
      <div className="flex-1 bg-[var(--bg-input)] flex flex-col min-h-0">
        {activeTab === 'code' ? (
          <div className="flex-1 flex flex-col p-4 overflow-hidden"> 
             <div className="flex items-center gap-2 mb-4 shrink-0">
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
               </select>
               <button 
                 onClick={handleGenerateCode}
                 disabled={isGeneratingCode || !currentRequestConfig}
                 className="bg-[var(--bg-hover)] hover:bg-[var(--border-strong)] disabled:opacity-50 border border-[var(--border-strong)] text-[var(--text-primary)] px-3 py-1.5 rounded text-xs font-medium transition-colors"
               >
                 {isGeneratingCode ? 'Generating...' : 'Generate Code'}
               </button>
             </div>
             
             <div className="flex-1 overflow-auto bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded p-4 font-mono text-sm">
               {generatedCode ? (
                 <pre className="text-[var(--text-code)] leading-relaxed overflow-hidden">
                   {generatedCode}
                 </pre>
               ) : (
                 <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-xs">
                   Select a language and click Generate Code
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latency Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Request Latency
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
                
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                    {response.timeMs}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">ms</span>
                </div>
                
                <div className="w-full bg-[var(--bg-input)] rounded-full h-1.5 overflow-hidden mb-3">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      response.timeMs < 100 ? "bg-green-500" :
                      response.timeMs < 300 ? "bg-blue-500" :
                      response.timeMs < 1000 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(100, (response.timeMs / 1500) * 100)}%` }}
                  />
                </div>
                
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Total time elapsed for DNS lookup, connection establishment, request transmission, and server response processing.
                </p>
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
          <div className="flex-1 overflow-auto bg-[var(--bg-input)] p-4 font-mono text-sm"> 
             <div className="flex gap-4 mb-2 text-[11px] text-[var(--text-secondary)] border-b border-[var(--bg-panel)] pb-2">
               <span className="text-[var(--primary)] font-medium">JSON</span>
               <span className="hover:text-[var(--text-primary)] cursor-pointer ml-auto" onClick={() => {
                 const text = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
                 navigator.clipboard.writeText(text);
               }}>Copy Response</span>
            </div>
            <pre className="text-[var(--text-code)] leading-relaxed overflow-hidden">
              {typeof response.data === 'object' 
                ? JSON.stringify(response.data, null, 2) 
                : response.data}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
