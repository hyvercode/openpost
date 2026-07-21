import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { BookOpen, Edit3, Eye, Check, X, FileCode, Play, Terminal, HelpCircle, Folder, ChevronRight, Hash, ArrowRight, Table, Server, Globe, Download, Copy, FileJson, Share2 } from 'lucide-react';
import { cn } from '../utils';
import { apiService } from '../lib/api';
import { MockSettings } from './MockSettings';
import { generateCollectionMarkdown } from '../utils/markdownGenerator';
import { generateCollectionPdf } from '../utils/pdfGenerator';
import ReactMarkdown from 'react-markdown';

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
  const { activeTabId, collections, openTab, addToast } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'docs' | 'api' | 'mock' | 'export'>('docs');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set());

  // PDF Export States
  const [exportFormat, setExportFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfIncludeIntro, setPdfIncludeIntro] = useState(true);
  const [pdfAccentColor, setPdfAccentColor] = useState('#4F46E5');
  const [pdfShowPageNumbers, setPdfShowPageNumbers] = useState(true);
  const [pdfIncludeMock, setPdfIncludeMock] = useState(true);
  const [docVersion, setDocVersion] = useState('1.0.0');

  // Find the current active collection based on tab ID
  const collectionItem = collections.find(c => c.id === activeTabId);

  useEffect(() => {
    if (collectionItem && selectedEndpoints.size === 0) {
      setSelectedEndpoints(new Set(collectionItem.requests.map(r => r.id)));
    }
  }, [collectionItem]);

  useEffect(() => {
    if (collectionItem) {
      setDocContent(collectionItem.description || '');
      setPdfTitle(collectionItem.name || '');
      setPdfAccentColor(collectionItem.color || '#4F46E5');
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
      await apiService.updateCollection(collectionItem.id, {
        description: docContent
      });
      
      const { collections, setCollections } = useStore.getState();
      setCollections(collections.map(c => c.id === collectionItem.id ? { ...c, description: docContent } : c));
      
      setIsEditing(false);
      addToast('Documentation updated successfully', 'success', 2000);
    } catch (error) {
      console.error("Failed to save collection documentation:", error);
      addToast('Failed to update documentation', 'error');
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

  const generatedMarkdown = useMemo(() => 
    collectionItem ? generateCollectionMarkdown(collectionItem, selectedEndpoints, docVersion) : '', 
    [collectionItem, selectedEndpoints, docVersion]
  );

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMarkdown);
    addToast('Documentation Markdown copied!', 'success', 2000);
  };

  const downloadMarkdown = () => {
    if (!collectionItem) return;
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collectionItem.name.replace(/\s+/g, '_').toLowerCase()}_docs.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Documentation downloaded', 'success', 2000);
  };

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
        <button
          onClick={() => { setActiveSubTab('mock'); setIsEditing(false); }}
          className={cn(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide flex items-center gap-2",
            activeSubTab === 'mock' 
              ? "text-[var(--primary)] border-b-[var(--primary)]" 
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-transparent"
          )}
        >
          <Globe className="w-3.5 h-3.5" />
          Public Mock API
        </button>
        <button
          onClick={() => { setActiveSubTab('export'); setIsEditing(false); }}
          className={cn(
            "px-4 py-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wide flex items-center gap-2",
            activeSubTab === 'export' 
              ? "text-[var(--primary)] border-b-[var(--primary)]" 
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-b-transparent"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Documentation
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
        ) : activeSubTab === 'api' ? (
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
        ) : activeSubTab === 'export' ? (
          <div className="flex flex-col h-full animate-fade-in gap-5 select-none">
            {/* Format Selection Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-hover)] p-3.5 rounded-xl border border-[var(--border-subtle)] shrink-0 shadow-inner">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[var(--primary)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Export Format:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExportFormat('markdown')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                    exportFormat === 'markdown'
                      ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                      : "bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Markdown (.md)
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                    exportFormat === 'pdf'
                      ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                      : "bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  PDF Report (.pdf)
                </button>
              </div>
            </div>

            <div className="flex-1 flex min-h-0 gap-6">
              {/* Left Column: Settings */}
              <div className="w-80 flex flex-col border-r border-[var(--border-subtle)] pr-6 overflow-y-auto custom-scrollbar gap-5 shrink-0 select-text">
                
                {/* 1. Endpoint Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Endpoints to Include</h3>
                    <button 
                      onClick={() => {
                        if (selectedEndpoints.size === requests.length) {
                          setSelectedEndpoints(new Set());
                        } else {
                          setSelectedEndpoints(new Set(requests.map(r => r.id)));
                        }
                      }}
                      className="text-[10px] text-[var(--primary)] hover:underline font-semibold cursor-pointer"
                    >
                      {selectedEndpoints.size === requests.length ? 'Select None' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg custom-scrollbar">
                    {requests.map(req => (
                      <label key={req.id} className="flex items-start gap-2 cursor-pointer group p-1 hover:bg-[var(--bg-hover)] rounded">
                        <input 
                          type="checkbox"
                          checked={selectedEndpoints.has(req.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedEndpoints);
                            if (e.target.checked) newSet.add(req.id);
                            else newSet.delete(req.id);
                            setSelectedEndpoints(newSet);
                          }}
                          className="mt-0.5 rounded border-[var(--border-strong)] bg-[var(--bg-input)] text-[var(--primary)] focus:ring-[var(--primary)]/20 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[8px] font-extrabold px-1 py-0.2 rounded font-mono uppercase shrink-0 border",
                              req.method === 'GET' ? 'bg-[var(--text-get)]/10 text-[var(--text-get)] border-[var(--text-get)]/20' :
                              req.method === 'POST' ? 'bg-[var(--text-post)]/10 text-[var(--text-post)] border-[var(--text-post)]/20' :
                              req.method === 'PUT' ? 'bg-[var(--text-put)]/10 text-[var(--text-put)] border-[var(--text-put)]/20' :
                              req.method === 'DELETE' ? 'bg-[var(--text-delete)]/10 text-[var(--text-delete)] border-[var(--text-delete)]/20' :
                              'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            )}>{req.method}</span>
                            <span className="text-xs text-[var(--text-primary)] truncate font-semibold group-hover:text-[var(--primary)] transition-colors">{req.name}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 1.5 General Documentation Options */}
                <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Documentation Info</h3>
                  
                  {/* Document Version */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Document Version</label>
                    <input
                      type="text"
                      value={docVersion}
                      onChange={(e) => setDocVersion(e.target.value)}
                      placeholder="e.g. 1.0.0"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] font-mono"
                    />
                    <p className="text-[9px] text-[var(--text-secondary)]">
                      The version is appended to headings and exported as a custom badge.
                    </p>
                  </div>
                </div>

                {/* 2. PDF specific options */}
                {exportFormat === 'pdf' ? (
                  <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4 animate-fade-in">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">PDF Style & Branding</h3>
                    
                    {/* Document Title */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Custom Title</label>
                      <input
                        type="text"
                        value={pdfTitle}
                        onChange={(e) => setPdfTitle(e.target.value)}
                        placeholder="Collection Name"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>

                    {/* Accent Color picker */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">Brand Theme Accent</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { name: 'Indigo', hex: '#4F46E5' },
                          { name: 'Emerald', hex: '#10B981' },
                          { name: 'Ocean', hex: '#3B82F6' },
                          { name: 'Amber', hex: '#F59E0B' },
                          { name: 'Crimson', hex: '#EF4444' },
                          { name: 'Slate', hex: '#4B5563' },
                        ].map(c => (
                          <button
                            key={c.hex}
                            onClick={() => setPdfAccentColor(c.hex)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all relative shrink-0 cursor-pointer hover:scale-105",
                              pdfAccentColor === c.hex ? "border-[var(--text-primary)] scale-110 shadow" : "border-transparent"
                            )}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          >
                            {pdfAccentColor === c.hex && (
                              <Check className="w-3 h-3 text-white absolute inset-0 m-auto font-extrabold" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content Toggles */}
                    <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
                      <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Elements to Include</label>
                      
                      <label className="flex items-center gap-2 cursor-pointer py-1 group">
                        <input
                          type="checkbox"
                          checked={pdfIncludeIntro}
                          onChange={(e) => setPdfIncludeIntro(e.target.checked)}
                          className="rounded border-[var(--border-strong)] bg-[var(--bg-input)] text-[var(--primary)] focus:ring-[var(--primary)]/20 cursor-pointer"
                        />
                        <span className="text-xs text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">Include introduction guide</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer py-1 group">
                        <input
                          type="checkbox"
                          checked={pdfIncludeMock}
                          onChange={(e) => setPdfIncludeMock(e.target.checked)}
                          className="rounded border-[var(--border-strong)] bg-[var(--bg-input)] text-[var(--primary)] focus:ring-[var(--primary)]/20 cursor-pointer"
                        />
                        <span className="text-xs text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">Include mock responses</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer py-1 group">
                        <input
                          type="checkbox"
                          checked={pdfShowPageNumbers}
                          onChange={(e) => setPdfShowPageNumbers(e.target.checked)}
                          className="rounded border-[var(--border-strong)] bg-[var(--bg-input)] text-[var(--primary)] focus:ring-[var(--primary)]/20 cursor-pointer"
                        />
                        <span className="text-xs text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">Show page numbers & footers</span>
                      </label>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4 animate-fade-in text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-1">Markdown Benefits</h3>
                    <p>• Perfect for pasting directly into GitHub, GitLab, or GitBook wikis.</p>
                    <p>• Preserves clean inline syntax, tables, and raw code snippets easily.</p>
                    <p>• Completely responsive to dark/light rendering on target platforms.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Preview / Generate */}
              <div className="flex-1 flex flex-col min-w-0 h-full select-text">
                {exportFormat === 'markdown' ? (
                  <>
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Shareable Markdown Docs</h3>
                        <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Auto-Generated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                        <button
                          onClick={downloadMarkdown}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[var(--primary)] text-white hover:opacity-90 rounded shadow-md transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download .md
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col shadow-inner">
                      <div className="flex-1 overflow-y-auto p-8 prose prose-invert prose-slate max-w-none markdown-body select-text custom-scrollbar">
                        <ReactMarkdown>{generatedMarkdown}</ReactMarkdown>
                      </div>
                    </div>
                  </>
                ) : (
                  /* PDF Preview Blueprint Outline */
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">PDF Document Structure</h3>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Print Ready</span>
                      </div>
                      <button
                        onClick={() => {
                          if (selectedEndpoints.size === 0) {
                            addToast('Please select at least one endpoint to export', 'warning');
                            return;
                          }
                          generateCollectionPdf(collectionItem, selectedEndpoints, {
                            title: pdfTitle || collectionItem.name,
                            includeIntro: pdfIncludeIntro,
                            accentColor: pdfAccentColor,
                            showPageNumbers: pdfShowPageNumbers,
                            includeMockResponse: pdfIncludeMock,
                            docVersion: docVersion
                          });
                          addToast('PDF documentation compiled and downloaded!', 'success', 2500);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF Document
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-y-auto p-6 space-y-5 custom-scrollbar shadow-inner select-none">
                      {/* Interactive visual mockup of PDF cover */}
                      <div className="border border-dashed border-[var(--border-strong)] rounded-lg p-5 relative overflow-hidden bg-[var(--bg-base)]">
                        {/* Accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: pdfAccentColor }}></div>
                        <span className="text-[9px] font-bold text-[var(--text-secondary)] absolute top-2 right-3 uppercase font-mono">Page 1 Outline Preview</span>
                        
                        <div className="space-y-3 mt-2 select-text">
                          <h4 className="text-base font-extrabold text-[var(--text-primary)]">{pdfTitle || collectionItem.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white px-1.5 py-0.2 rounded font-bold uppercase" style={{ backgroundColor: pdfAccentColor }}>API Reference</span>
                            {docVersion && (
                              <span className="text-[9px] bg-slate-500/10 text-slate-400 px-1.5 py-0.2 rounded font-bold uppercase font-mono border border-slate-500/20">Version {docVersion}</span>
                            )}
                            <span className="text-[10px] text-[var(--text-secondary)]">Generated Today</span>
                          </div>
                          <hr className="border-[var(--border-subtle)]" />
                          
                          {pdfIncludeIntro && collectionItem.description && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-[var(--text-secondary)] block uppercase tracking-wider text-[8px]">Collection Overview</span>
                              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-3 italic leading-relaxed">
                                {collectionItem.description.replace(/[#>*\-`\[\]()]/g, "")}
                              </p>
                            </div>
                          )}

                          <div className="space-y-1.5 pt-2">
                            <span className="text-[10px] font-bold text-[var(--text-secondary)] block uppercase tracking-wider text-[8px]">Document Index ({requests.filter(r => selectedEndpoints.has(r.id)).length} Endpoints)</span>
                            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                              {requests.filter(r => selectedEndpoints.has(r.id)).map((req, i) => (
                                <div key={req.id} className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]/30 pb-0.5">
                                  <span className="w-3 text-right text-[8px]">{i+1}.</span>
                                  <span className={cn(
                                    "font-bold text-[8px] px-1 rounded",
                                    req.method === 'GET' ? 'bg-blue-500/10 text-blue-400' :
                                    req.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400' :
                                    req.method === 'PUT' ? 'bg-amber-500/10 text-amber-400' :
                                    req.method === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'
                                  )}>{req.method}</span>
                                  <span className="font-semibold text-[var(--text-primary)] truncate">{req.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Remaining Endpoints details mockup cards */}
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[8px] block">Endpoint Details Preview (Sample)</span>
                        {requests.filter(r => selectedEndpoints.has(r.id)).slice(0, 3).map((req) => (
                          <div key={req.id} className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--bg-base)]/50 space-y-3 select-text">
                            <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/50 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-extrabold px-1.5 py-0.2 rounded font-mono border",
                                  req.method === 'GET' ? 'bg-[var(--text-get)]/10 text-[var(--text-get)] border-[var(--text-get)]/20' :
                                  req.method === 'POST' ? 'bg-[var(--text-post)]/10 text-[var(--text-post)] border-[var(--text-post)]/20' :
                                  req.method === 'PUT' ? 'bg-[var(--text-put)]/10 text-[var(--text-put)] border-[var(--text-put)]/20' :
                                  req.method === 'DELETE' ? 'bg-[var(--text-delete)]/10 text-[var(--text-delete)] border-[var(--text-delete)]/20' : 'bg-purple-500/10 text-purple-400'
                                )}>{req.method}</span>
                                <span className="text-xs font-bold text-[var(--text-primary)]">{req.name}</span>
                              </div>
                              <span className="text-[9px] text-[var(--text-secondary)] font-mono truncate max-w-xs">{req.url || '/'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-[10px]">
                              <div className="space-y-1">
                                <span className="font-bold text-[var(--text-secondary)] uppercase text-[8px] tracking-wider">Request Parameters</span>
                                <div className="text-[9px] text-[var(--text-secondary)] space-y-0.5">
                                  <div>Headers: {req.headers.filter(h => h.enabled && h.key).length || 'None'}</div>
                                  <div>Query Params: {req.params.filter(p => p.enabled && p.key).length || 'None'}</div>
                                  <div>Body Payload: {req.body?.type !== 'none' ? req.body?.type : 'None'}</div>
                                </div>
                              </div>
                              {pdfIncludeMock && req.mockResponse && (
                                <div className="space-y-1">
                                  <span className="font-bold text-[var(--text-secondary)] uppercase text-[8px] tracking-wider">Mock Response</span>
                                  <div className="text-[9px] text-[var(--text-secondary)]">
                                    Status: <span className="text-green-400 font-mono font-bold">{req.mockResponse.status || 200}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {requests.filter(r => selectedEndpoints.has(r.id)).length > 3 && (
                          <div className="text-center text-xs text-[var(--text-secondary)] py-2.5 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)] border-dashed">
                            And {requests.filter(r => selectedEndpoints.has(r.id)).length - 3} more endpoint document pages...
                          </div>
                        )}
                        {requests.filter(r => selectedEndpoints.has(r.id)).length === 0 && (
                          <div className="text-center text-xs text-[var(--text-secondary)] py-5 bg-[var(--bg-hover)] rounded border border-red-500/30 border-dashed">
                            No endpoints selected. Please check at least one endpoint in the left checklist.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                <p className="mt-4 text-[10px] text-[var(--text-secondary)] leading-relaxed text-center px-12 italic shrink-0">
                  Exported documentation can be shared directly with your team. Markdown format is optimized for web indices, and PDF files are ready for enterprise distribution.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <MockSettings collection={collectionItem} />
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
