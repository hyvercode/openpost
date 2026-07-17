import { useState } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../utils';
import axios from 'axios';

export function ResponsePanel() {
  const { response, currentRequestConfig } = useStore();
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'code'>('body');
  
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

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-[#2B2B2B] shrink-0 min-w-0">
      <div className="h-10 border-b border-[#2B2B2B] flex items-center justify-between px-4 bg-[#161616] shrink-0">
        <div className="flex gap-4 h-full items-end">
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'body' ? "text-white border-b-2 border-[#FF6C37]" : "text-gray-500 hover:text-gray-300")}
             onClick={() => setActiveTab('body')}
           >
             Body
           </div>
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'headers' ? "text-white border-b-2 border-[#FF6C37]" : "text-gray-500 hover:text-gray-300")}
             onClick={() => setActiveTab('headers')}
           >
             Headers
           </div>
           <div 
             className={cn("text-xs font-medium pb-2 cursor-pointer", activeTab === 'code' ? "text-white border-b-2 border-[#FF6C37]" : "text-gray-500 hover:text-gray-300")}
             onClick={() => setActiveTab('code')}
           >
             Code
           </div>
        </div>
        
        {response && !response.error && activeTab !== 'code' && (
          <div className="flex gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Status:</span>
              <span className={cn(
                "font-bold",
                response.status >= 200 && response.status < 300 ? "text-green-500" :
                response.status >= 400 ? "text-red-500" : "text-yellow-500"
              )}>
                {response.status} {response.statusText}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Time:</span>
              <span className="text-white">{response.timeMs} ms</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Size:</span>
              <span className="text-white">{(response.size / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#0A0A0A] flex flex-col min-h-0">
        {activeTab === 'code' ? (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
             <div className="flex items-center gap-2 mb-4 shrink-0">
               <select 
                 className="bg-[#252525] border border-[#333] text-xs text-gray-300 rounded px-3 py-1.5 outline-none focus:border-[#444]"
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
                 className="bg-[#252525] hover:bg-[#333] disabled:opacity-50 border border-[#333] text-gray-300 px-3 py-1.5 rounded text-xs font-medium transition-colors"
               >
                 {isGeneratingCode ? 'Generating...' : 'Generate Code'}
               </button>
             </div>
             
             <div className="flex-1 overflow-auto bg-[#121212] border border-[#2B2B2B] rounded p-4 font-mono text-sm">
               {generatedCode ? (
                 <pre className="text-blue-300 leading-relaxed overflow-hidden">
                   {generatedCode}
                 </pre>
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                   Select a language and click Generate Code
                 </div>
               )}
             </div>
          </div>
        ) : activeTab === 'headers' && response ? (
          <div className="flex-1 overflow-auto p-4 font-mono text-sm">
            <pre className="text-blue-300 leading-relaxed overflow-hidden">
              {JSON.stringify(response.headers, null, 2)}
            </pre>
          </div>
        ) : !response ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
            Hit Send to get a response
          </div>
        ) : response.error ? (
          <div className="flex-1 p-4 overflow-auto text-red-400 font-mono text-sm">
            <h4 className="font-bold mb-2 text-xs">Error</h4>
            <pre className="whitespace-pre-wrap">{JSON.stringify(response.data, null, 2)}</pre>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-[#0A0A0A] p-4 font-mono text-sm">
             <div className="flex gap-4 mb-2 text-[11px] text-gray-500 border-b border-[#1A1A1A] pb-2">
               <span className="text-[#FF6C37] font-medium">JSON</span>
               <span className="hover:text-white cursor-pointer ml-auto">Copy Response</span>
            </div>
            <pre className="text-blue-300 leading-relaxed overflow-hidden">
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
