import React, { useState, useRef } from 'react';
import { FileCode, Upload, Check, AlertCircle, Loader, Sparkles, X, Code2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { apiService } from '../lib/api';
import { parseOpenAPISpec } from '../utils/openapiImport';

interface OpenApiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenApiImportModal({ isOpen, onClose }: OpenApiImportModalProps) {
  const { currentWorkspace, collections, setCollections, addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [specContent, setSpecContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessImport = async (content: string) => {
    if (!currentWorkspace) {
      setError('No active workspace selected.');
      return;
    }

    if (!content || !content.trim()) {
      setError('Please provide OpenAPI or Swagger content.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = parseOpenAPISpec(content, currentWorkspace.id);
      
      const createdCollection = await apiService.createCollection(result.collection);
      setCollections([...collections, createdCollection]);

      addToast(
        `Successfully imported OpenAPI spec "${createdCollection.name}" (${result.requestsCount} requests, ${result.foldersCount} folders)!`,
        'success',
        4000
      );

      setSpecContent('');
      onClose();
    } catch (err: any) {
      console.error('OpenAPI import error:', err);
      setError(err.message || 'Failed to parse and import OpenAPI specification.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleProcessImport(text);
      }
    };
    reader.onerror = () => {
      setError('Failed to read selected file.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in backdrop-blur-sm">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans text-xs">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Import OpenAPI / Swagger</h2>
              <p className="text-[10px] text-[var(--text-secondary)]">Supports OpenAPI 3.0, 3.1 & Swagger 2.0 (JSON or YAML)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 px-4 pt-2 gap-2">
          <button
            onClick={() => { setActiveTab('file'); setError(null); }}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'file'
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-panel)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => { setActiveTab('text'); setError(null); }}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === 'text'
                ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-panel)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Paste Specification</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'file' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--primary)] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[var(--bg-surface)]/50 hover:bg-[var(--bg-surface)] transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-[var(--text-primary)] mb-1">Click to browse or drop file here</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Supports .json, .yaml, .yml OpenAPI or Swagger files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={specContent}
                onChange={(e) => setSpecContent(e.target.value)}
                placeholder="Paste raw OpenAPI 3.0/3.1 or Swagger 2.0 JSON/YAML specification here..."
                className="w-full h-52 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg p-3 font-mono text-xs text-[var(--text-code)] outline-none focus:border-[var(--border-focus)] transition-colors leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-bold transition-all"
            disabled={loading}
          >
            Cancel
          </button>

          {activeTab === 'text' && (
            <button
              onClick={() => handleProcessImport(specContent)}
              disabled={loading || !specContent.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing & Importing...</span>
                </>
              ) : (
                <>
                  <span>Import Spec</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
