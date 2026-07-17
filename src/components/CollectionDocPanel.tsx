import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { BookOpen, Edit3, Eye, Check, X, FileCode, Play, Terminal, HelpCircle, Folder, ChevronRight, Hash, ArrowRight, Table, Server } from 'lucide-react';
import { cn } from '../utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Helper for custom regex-based markdown parser
function parseInlineStyles(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let idx = 0;

  while (currentText.length > 0) {
    // Bold check: **text**
    const boldMatch = currentText.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={idx++} className="font-semibold text-[var(--text-primary)]">{boldMatch[1]}</strong>);
      currentText = currentText.slice(boldMatch[0].length);
      continue;
    }

    // Code check: `code`
    const codeMatch = currentText.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={idx++} className="bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[var(--border-subtle)] text-[var(--text-code)]">
          {codeMatch[1]}
        </code>
      );
      currentText = currentText.slice(codeMatch[0].length);
      continue;
    }

    // Link check: [label](url)
    const linkMatch = currentText.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a key={idx++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline inline-flex items-center gap-0.5 font-semibold">
          {linkMatch[1]}
        </a>
      );
      currentText = currentText.slice(linkMatch[0].length);
      continue;
    }

    // Match any characters up to the next styling token
    const nextTokenMatch = currentText.match(/^([^*`\[]+)/);
    if (nextTokenMatch) {
      parts.push(nextTokenMatch[1]);
      currentText = currentText.slice(nextTokenMatch[1].length);
    } else {
      // Fallback for trailing symbol issues
      parts.push(currentText[0]);
      currentText = currentText.slice(1);
    }
  }

  return parts;
}

function renderMarkdown(text: string) {
  if (!text) return null;
  const blocks = text.split(/\n\s*\n/);
  
  return blocks.map((block, bIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Headings
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={bIdx} className="text-xl font-extrabold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1.5 mb-4 mt-6 first:mt-0 font-sans">
          {trimmed.replace('# ', '')}
        </h1>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={bIdx} className="text-base font-bold text-[var(--text-primary)] mb-3 mt-5 font-sans">
          {trimmed.replace('## ', '')}
        </h2>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={bIdx} className="text-sm font-semibold text-[var(--text-primary)] mb-2 mt-4 font-sans">
          {trimmed.replace('### ', '')}
        </h3>
      );
    }

    // Code block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n');
      const firstLine = lines[0];
      const lang = firstLine.slice(3).trim();
      const code = lines.slice(1, lines.length - (lines[lines.length - 1] === '```' ? 1 : 0)).join('\n');
      return (
        <pre key={bIdx} className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg p-3.5 font-mono text-xs text-[var(--text-code)] overflow-x-auto my-3 shadow-inner max-w-full">
          {lang && (
            <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-2 border-b border-[var(--border-subtle)] pb-1">
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Bullet lists: - item or * item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed.split('\n').map(item => item.replace(/^[-*]\s+/, ''));
      return (
        <ul key={bIdx} className="list-disc pl-5 mb-4 space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
          {items.map((item, iIdx) => (
            <li key={iIdx}>{parseInlineStyles(item)}</li>
          ))}
        </ul>
      );
    }

    // Numbered lists: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = trimmed.split('\n').map(item => item.replace(/^\d+\.\s+/, ''));
      return (
        <ol key={bIdx} className="list-decimal pl-5 mb-4 space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
          {items.map((item, iIdx) => (
            <li key={iIdx}>{parseInlineStyles(item)}</li>
          ))}
        </ol>
      );
    }

    // Default blockquote
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed.replace(/^>\s+/, '');
      return (
        <blockquote key={bIdx} className="border-l-4 border-[var(--primary)] bg-[var(--primary)]/5 pl-4 py-2.5 pr-2.5 rounded-r-md text-xs italic text-[var(--text-secondary)] my-4 font-sans leading-relaxed">
          {parseInlineStyles(quoteText)}
        </blockquote>
      );
    }

    // Default paragraph
    return (
      <p key={bIdx} className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3.5 font-sans">
        {parseInlineStyles(trimmed)}
      </p>
    );
  });
}

export function CollectionDocPanel() {
  const { activeTabId, collections, openTab } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'docs' | 'api'>('docs');
  const [isSaving, setIsSaving] = useState(false);

  // Find the current active collection based on tab ID
  const collectionItem = collections.find(c => c.id === activeTabId);

  useEffect(() => {
    if (collectionItem) {
      setDocContent(collectionItem.description || '');
    }
  }, [collectionItem]);

  if (!collectionItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] p-8">
        <BookOpen className="w-12 h-12 text-[var(--border-strong)] mb-4 stroke-1 animate-pulse" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Collection Not Found</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Please select "View Documentation" from a collection's menu.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "collections", collectionItem.id), {
        description: docContent
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save collection documentation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDocContent(collectionItem.description || '');
    setIsEditing(false);
  };

  // Group requests by folder
  const folders = collectionItem.folders || [];
  const requests = collectionItem.requests || [];

  const rootRequests = requests.filter(r => !r.folderId);
  const folderGroups = folders.map(f => ({
    folder: f,
    requests: requests.filter(r => r.folderId === f.id)
  })).filter(g => g.requests.length > 0 || g.folder);

  const totalEndpoints = requests.length;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto p-6 animate-fade-in font-sans">
      
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ 
              backgroundColor: `${collectionItem.color || 'var(--primary)'}12`,
              borderColor: `${collectionItem.color || 'var(--primary)'}33`
            }}
          >
            <BookOpen className="w-6 h-6 animate-pulse" style={{ color: collectionItem.color || 'var(--primary)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold leading-tight">{collectionItem.name} Documentation</h2>
              <span className="bg-orange-500/10 text-[var(--primary)] border border-orange-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                API Reference
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mt-1.5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                {folders.length} Folder{folders.length !== 1 && 's'}
              </span>
              <span className="h-3 w-px bg-[var(--border-subtle)]"></span>
              <span className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                {totalEndpoints} Endpoint{totalEndpoints !== 1 && 's'}
              </span>
            </div>
          </div>
        </div>

        {/* Action button */}
        {!isEditing && activeSubTab === 'docs' && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white border border-transparent px-4 py-2 rounded text-xs font-semibold shadow-md transition-all self-start md:self-auto"
          >
            <Edit3 className="w-4 h-4" />
            Edit Documentation
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] mb-6 shrink-0">
        <button
          onClick={() => { setActiveSubTab('docs'); setIsEditing(false); }}
          className={cn(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide",
            activeSubTab === 'docs' 
              ? "text-[var(--primary)] border-b-[var(--primary)]" 
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-transparent"
          )}
        >
          Overview & Guides
        </button>
        <button
          onClick={() => { setActiveSubTab('api'); setIsEditing(false); }}
          className={cn(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide",
            activeSubTab === 'api' 
              ? "text-[var(--primary)] border-b-[var(--primary)]" 
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-transparent"
          )}
        >
          API Endpoints ({totalEndpoints})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {activeSubTab === 'docs' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Left/Middle Column - Content */}
            <div className="lg:col-span-3 space-y-4">
              {isEditing ? (
                <div className="flex flex-col gap-3 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl p-5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <span className="text-xs font-bold uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-[var(--primary)]" />
                      Markdown Editor
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      Supports standard markdown formatting
                    </span>
                  </div>
                  
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="# Welcome to our API Collection Documentation!

Write introduction guides, list environment variables, or share developer instructions here.

## Quick Start
You can write step-by-step startup instructions.
1. Authenticate using OAuth.
2. Provide your API Key in headers.

## Authentication
> All routes require the Authorization bearer token header."
                    className="w-full h-96 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg p-4 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] leading-relaxed resize-y"
                  />

                  {/* Editor Actions */}
                  <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3.5">
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors border border-transparent"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-[var(--primary)] text-white hover:opacity-90 shadow transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 min-h-[300px]">
                  {docContent.trim() ? (
                    <div className="markdown-body select-text">
                      {renderMarkdown(docContent)}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--text-secondary)]">
                      <HelpCircle className="w-10 h-10 text-[var(--border-strong)] mb-3 stroke-1" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">No Description or Guide Yet</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mt-1 mb-4 leading-relaxed">
                        Add a helpful overview, authentication rules, standard errors, and developer notes to get your team up to speed.
                      </p>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white border border-[var(--primary)]/20 px-3.5 py-1.5 rounded text-xs font-semibold transition-all"
                      >
                        Create Guide
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Quick Help Sheet */}
            <div className="space-y-4">
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[var(--primary)]" />
                  Markdown Reference
                </h4>
                <div className="space-y-2.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded"># Heading 1</span>
                    <span>Title</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded">## Heading 2</span>
                    <span>Sub-heading</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded">**bold text**</span>
                    <strong className="font-semibold text-[var(--text-primary)]">bold text</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded">`code`</span>
                    <span className="font-mono text-indigo-400">code</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded">- List item</span>
                    <span>Bulleted list</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded">&gt; Blockquote</span>
                    <span className="italic">Alert box</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono bg-[var(--bg-hover)] px-1 py-0.2 rounded">[Name](Url)</span>
                    <span className="text-[var(--primary)] hover:underline">Link</span>
                  </div>
                </div>
              </div>

              {/* API Overview Card */}
              <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-4.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  Quick API Index
                </h4>
                {requests.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
                    {requests.map(req => (
                      <div 
                        key={req.id} 
                        onClick={() => openTab({ id: req.id, type: 'request', name: req.name, method: req.method })}
                        className="flex items-center gap-2 p-1.5 hover:bg-[var(--bg-hover)] rounded cursor-pointer transition-colors"
                      >
                        <span className={cn(
                          "text-[9px] font-extrabold px-1 py-0.2 rounded min-w-[32px] text-center shrink-0 font-mono",
                          req.method === 'GET' ? "bg-[var(--text-get)]/10 text-[var(--text-get)] border border-[var(--text-get)]/20" :
                          req.method === 'POST' ? "bg-[var(--text-post)]/10 text-[var(--text-post)] border border-[var(--text-post)]/20" :
                          req.method === 'PUT' ? "bg-[var(--text-put)]/10 text-[var(--text-put)] border border-[var(--text-put)]/20" :
                          req.method === 'DELETE' ? "bg-[var(--text-delete)]/10 text-[var(--text-delete)] border border-[var(--text-delete)]/20" : 
                          "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
                        )}>
                          {req.method}
                        </span>
                        <span className="text-[11px] text-[var(--text-primary)] truncate font-semibold">
                          {req.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    No endpoints defined in this collection yet.
                  </p>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* API Endpoint Documentation List */
          <div className="space-y-6">
            {requests.length === 0 ? (
              <div className="text-center p-12 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-secondary)] max-w-lg mx-auto">
                <HelpCircle className="w-12 h-12 text-[var(--border-strong)] mb-3 mx-auto stroke-1" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Endpoints Registered</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Add endpoints to this collection to automatically generate the full API schema references and interactive test consoles.
                </p>
              </div>
            ) : (
              <div className="space-y-8 select-text">
                
                {/* 1. Root Requests (No Folder) */}
                {rootRequests.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3.5 flex items-center gap-1.5">
                      <Folder className="w-4 h-4 text-[var(--text-secondary)]" />
                      General Endpoints
                    </h3>
                    <div className="space-y-5">
                      {rootRequests.map(req => (
                        <EndpointDocCard key={req.id} request={req} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Folder Grouped Requests */}
                {folderGroups.map(({ folder, requests: folderReqs }) => {
                  if (folderReqs.length === 0) return null;
                  return (
                    <div key={folder.id}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3.5 flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
                        <Folder className="w-4 h-4 text-[var(--primary)] shrink-0" />
                        {folder.name}
                      </h3>
                      <div className="space-y-5">
                        {folderReqs.map(req => (
                          <EndpointDocCard key={req.id} request={req} />
                        ))}
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Separate clean component for rendering individual endpoint doc details
function EndpointDocCard({ request }: { request: any; key?: React.Key }) {
  const { openTab } = useStore();
  const enabledHeaders = (request.headers || []).filter((h: any) => h.enabled && h.key);
  const enabledParams = (request.params || []).filter((p: any) => p.enabled && p.key);

  const mockRes = request.mockResponse || {
    status: 200,
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    body: JSON.stringify({ message: "Mock response body" })
  };

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl overflow-hidden transition-all shadow-sm">
      
      {/* Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--bg-hover)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn(
            "text-xs font-extrabold px-2 py-0.5 rounded min-w-[50px] text-center font-mono border",
            request.method === 'GET' ? "bg-[var(--text-get)]/10 text-[var(--text-get)] border-[var(--text-get)]/20" :
            request.method === 'POST' ? "bg-[var(--text-post)]/10 text-[var(--text-post)] border-[var(--text-post)]/20" :
            request.method === 'PUT' ? "bg-[var(--text-put)]/10 text-[var(--text-put)] border-[var(--text-put)]/20" :
            request.method === 'DELETE' ? "bg-[var(--text-delete)]/10 text-[var(--text-delete)] border-[var(--text-delete)]/20" : 
            "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
          )}>
            {request.method}
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)] truncate font-sans">
            {request.name}
          </span>
          <span className="font-mono text-xs text-[var(--text-secondary)] truncate">
            {request.url || '/'}
          </span>
        </div>

        <button
          onClick={() => openTab({ id: request.id, type: 'request', name: request.name, method: request.method })}
          className="flex items-center justify-center gap-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover-strong)] border border-[var(--border-strong)] text-[var(--text-primary)] text-[10px] font-bold px-2.5 py-1 rounded transition-colors self-start sm:self-auto shrink-0 uppercase tracking-wider"
        >
          <Play className="w-3 h-3 text-[var(--primary)]" />
          Test Request
        </button>
      </div>

      {/* Detail grids */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Left Side: Request Schema & Params */}
        <div className="space-y-4 min-w-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
              Request URL
            </span>
            <div className="font-mono text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] px-3 py-2 rounded-lg text-amber-500 truncate select-all">
              {request.url || '{{base_url}}/'}
            </div>
          </div>

          {/* Headers */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
              Headers ({enabledHeaders.length})
            </span>
            {enabledHeaders.length > 0 ? (
              <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] font-sans border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-hover)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                      <th className="px-3 py-1.5 font-semibold w-1/3">Header Key</th>
                      <th className="px-3 py-1.5 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledHeaders.map((h: any) => (
                      <tr key={h.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)]/30 text-[var(--text-primary)]">
                        <td className="px-3 py-1.5 font-mono text-[var(--text-code)] font-medium">{h.key}</td>
                        <td className="px-3 py-1.5 font-mono text-[var(--text-secondary)] truncate">{h.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <span className="text-[10px] text-[var(--text-secondary)] italic">No headers defined.</span>
            )}
          </div>

          {/* Query Params */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
              Query Parameters ({enabledParams.length})
            </span>
            {enabledParams.length > 0 ? (
              <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] font-sans border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-hover)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                      <th className="px-3 py-1.5 font-semibold w-1/3">Parameter</th>
                      <th className="px-3 py-1.5 font-semibold">Default Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledParams.map((p: any) => (
                      <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-hover)]/30 text-[var(--text-primary)]">
                        <td className="px-3 py-1.5 font-mono text-[var(--text-code)] font-medium">{p.key}</td>
                        <td className="px-3 py-1.5 font-mono text-[var(--text-secondary)] truncate">{p.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <span className="text-[10px] text-[var(--text-secondary)] italic">No query parameters defined.</span>
            )}
          </div>

          {/* Request Body Payload */}
          {request.body && request.body.type !== 'none' && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                Request Body Type: <span className="text-[var(--text-primary)] font-mono">{request.body.type}</span>
              </span>
              {request.body.content ? (
                <pre className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-lg p-3.5 font-mono text-[11px] text-[var(--text-code)] overflow-x-auto leading-tight shadow-inner max-h-40">
                  <code>{request.body.content}</code>
                </pre>
              ) : (
                <span className="text-[10px] text-[var(--text-secondary)] italic">Empty payload content.</span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Mock Response Schema */}
        <div className="space-y-4 min-w-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
              Mock Response Status
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border",
                mockRes.status >= 200 && mockRes.status < 300 ? "bg-green-500/10 text-green-400 border-green-500/20" :
                mockRes.status >= 300 && mockRes.status < 400 ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              )}>
                {mockRes.status}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                {mockRes.status === 200 ? 'OK' : 
                 mockRes.status === 201 ? 'Created' : 
                 mockRes.status === 400 ? 'Bad Request' : 
                 mockRes.status === 401 ? 'Unauthorized' : 
                 mockRes.status === 404 ? 'Not Found' : 
                 mockRes.status === 500 ? 'Internal Server Error' : ''}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
              Response Body (Mock)
            </span>
            <pre className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg p-3.5 font-mono text-[11px] text-indigo-400 overflow-x-auto leading-tight shadow-inner max-h-56">
              <code>{mockRes.body || '{}'}</code>
            </pre>
          </div>

          {/* Quick Mock Response Headers indicator */}
          {mockRes.headers && mockRes.headers.filter((h: any) => h.enabled && h.key).length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                Response Headers
              </span>
              <div className="space-y-1 bg-[var(--bg-hover)] p-2.5 rounded-lg border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-secondary)]">
                {mockRes.headers.filter((h: any) => h.enabled && h.key).map((h: any) => (
                  <div key={h.id} className="flex justify-between">
                    <span className="text-[var(--text-code)]">{h.key}:</span>
                    <span>{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
