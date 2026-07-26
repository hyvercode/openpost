import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../lib/api';
import { Globe, Lock, Share2, Server, BookOpen, Copy, Check, X, Loader } from 'lucide-react';
import { cn } from '../utils';

interface ShareSettingsModalProps {
  isOpen: boolean;
  collectionId: string;
  onClose: () => void;
}

export function ShareSettingsModal({ isOpen, collectionId, onClose }: ShareSettingsModalProps) {
  const { collections, setCollections, addToast } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const collection = collections.find(c => c.id === collectionId);

  if (!isOpen || !collection) return null;

  const handleToggle = async (field: 'shareVisibility' | 'mockVisibility' | 'docVisibility', currentValue: string) => {
    const newValue = currentValue === 'public' ? 'private' : 'public';
    setLoading(true);
    try {
      const updated = await apiService.updateCollection(collectionId, { [field]: newValue });
      setCollections(collections.map(c => c.id === collectionId ? updated : c));
      addToast(`Updated visibility to ${newValue}`, 'success');
    } catch (e) {
      addToast('Failed to update visibility', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    addToast('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(null), 2000);
  };

  const shareUrl = `${window.location.origin}?share_type=collection&share_id=${collection.id}`;
  const mockUrl = `${window.location.origin}/mock/collection/${collection.id}`;
  const docUrl = `${window.location.origin}?public_doc=${collection.id}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Share2 className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold">Share & Visibility Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="text-xs text-[var(--text-secondary)]">
            Configure access levels for <strong className="text-[var(--text-primary)]">{collection.name}</strong>. Public items can be accessed without authentication. Private items require workspace membership or API keys.
          </div>

          <div className="space-y-4">
            <SettingRow 
              title="Collection Sharing"
              description="Allow importing this collection into other workspaces."
              icon={<Share2 className="w-5 h-5 text-emerald-500" />}
              visibility={collection.shareVisibility || 'private'}
              url={shareUrl}
              onToggle={() => handleToggle('shareVisibility', collection.shareVisibility || 'private')}
              onCopy={() => copyUrl(shareUrl, 'share')}
              copied={copied === 'share'}
              loading={loading}
            />

            <SettingRow 
              title="Mock Server"
              description="Access the mock API endpoints for this collection."
              icon={<Server className="w-5 h-5 text-blue-500" />}
              visibility={collection.mockVisibility || 'private'}
              url={mockUrl}
              onToggle={() => handleToggle('mockVisibility', collection.mockVisibility || 'private')}
              onCopy={() => copyUrl(mockUrl, 'mock')}
              copied={copied === 'mock'}
              loading={loading}
            />

            <SettingRow 
              title="Documentation"
              description="View the interactive API documentation."
              icon={<BookOpen className="w-5 h-5 text-purple-500" />}
              visibility={collection.docVisibility || 'private'}
              url={docUrl}
              onToggle={() => handleToggle('docVisibility', collection.docVisibility || 'private')}
              onCopy={() => copyUrl(docUrl, 'doc')}
              copied={copied === 'doc'}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ title, description, icon, visibility, url, onToggle, onCopy, copied, loading }: any) {
  const isPublic = visibility === 'public';
  return (
    <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--bg-surface)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--bg-base)] rounded-lg border border-[var(--border-subtle)]">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{description}</p>
          </div>
        </div>
        <button 
          onClick={onToggle}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border",
            isPublic ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" : "bg-gray-500/10 text-[var(--text-secondary)] border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
          )}
        >
          {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {isPublic ? 'Public' : 'Private'}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-3 py-1.5 flex items-center">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono truncate select-all">{url}</span>
        </div>
        <button
          onClick={onCopy}
          className="shrink-0 p-1.5 border border-[var(--border-subtle)] bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] rounded text-[var(--text-primary)] transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
