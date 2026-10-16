import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitBranch, GitCommit, History, Tag, AlertTriangle, Plus, Trash2, 
  RotateCcw, Download, Copy, Check, ChevronDown, ChevronRight, 
  FileText, ArrowRight, ShieldAlert, CheckCircle2, 
  ExternalLink, Layers, Search, Filter, X
} from 'lucide-react';
import { ApiCollection, CollectionVersion, CollectionDiffResult, EndpointDiffItem, RequestItem } from '../types';
import { apiService } from '../lib/api';
import { useStore } from '../store/useStore';
import { computeCollectionDiff, generateChangelogMarkdown } from '../utils/versionDiff';
import { exportSingleCollectionToPostman } from '../utils/postmanExport';

interface CollectionVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: ApiCollection;
  initialTab?: 'history' | 'diff' | 'release';
  onCollectionUpdated?: (updated: ApiCollection) => void;
}

export const CollectionVersionModal: React.FC<CollectionVersionModalProps> = ({
  isOpen,
  onClose,
  collection,
  initialTab = 'history',
  onCollectionUpdated
}) => {
  const { user, addToast, setCollections, collections } = useStore();
  const [activeTab, setActiveTab] = useState<'history' | 'diff' | 'release'>(initialTab);
  const [versions, setVersions] = useState<CollectionVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Release Form State
  const [versionInput, setVersionInput] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['latest']);
  const [tagInput, setTagInput] = useState('');

  // Diff Explorer State
  const [baseVersionId, setBaseVersionId] = useState<string>('latest');
  const [targetVersionId, setTargetVersionId] = useState<string>('draft'); // 'draft' means current collection
  const [diffFilter, setDiffFilter] = useState<'all' | 'breaking' | 'added' | 'modified' | 'removed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  // Rollback confirmation
  const [confirmRollbackVersion, setConfirmRollbackVersion] = useState<CollectionVersion | null>(null);

  // Load versions
  const loadVersions = async () => {
    if (!collection?.id) return;
    setIsLoading(true);
    try {
      const data = await apiService.getCollectionVersions(collection.id);
      setVersions(data);
      if (data.length > 0 && !versionInput) {
        // Calculate smart SemVer from latest version
        const latest = data[0];
        const currentDiff = computeCollectionDiff(latest.requests, collection.requests, latest.version);
        setVersionInput(currentDiff.suggestedSemVer);
        setBaseVersionId(latest.id);
      } else if (data.length === 0 && !versionInput) {
        setVersionInput('v1.0.0');
        setReleaseTitle('Initial Version Snapshot');
      }
    } catch (err) {
      console.error('Failed to load collection versions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadVersions();
    }
  }, [isOpen, collection?.id, initialTab]);

  // Find latest version
  const latestVersion = useMemo(() => {
    if (versions.length === 0) return null;
    return versions.find(v => v.tags?.includes('latest')) || versions[0];
  }, [versions]);

  // Compute diff between current working draft and latest version for the Release tab
  const releaseDraftDiff = useMemo(() => {
    const baseRequests = latestVersion ? latestVersion.requests : [];
    const baseVer = latestVersion ? latestVersion.version : 'v0.0.0';
    return computeCollectionDiff(baseRequests, collection.requests || [], baseVer);
  }, [latestVersion, collection.requests]);

  // Compute diff for the Diff Explorer Tab
  const explorerDiffResult = useMemo<CollectionDiffResult>(() => {
    let baseRequests: RequestItem[] = [];
    let baseVer = 'v1.0.0';

    if (baseVersionId === 'latest') {
      baseRequests = latestVersion ? latestVersion.requests : [];
      baseVer = latestVersion ? latestVersion.version : 'v1.0.0';
    } else if (baseVersionId === 'draft') {
      baseRequests = collection.requests || [];
    } else {
      const found = versions.find(v => v.id === baseVersionId);
      if (found) {
        baseRequests = found.requests || [];
        baseVer = found.version;
      }
    }

    let targetRequests: RequestItem[] = [];
    if (targetVersionId === 'draft') {
      targetRequests = collection.requests || [];
    } else if (targetVersionId === 'latest') {
      targetRequests = latestVersion ? latestVersion.requests : [];
    } else {
      const found = versions.find(v => v.id === targetVersionId);
      if (found) {
        targetRequests = found.requests || [];
      }
    }

    return computeCollectionDiff(baseRequests, targetRequests, baseVer);
  }, [baseVersionId, targetVersionId, versions, latestVersion, collection.requests]);

  // Auto-generate changelog for the Release tab
  const handleAutoGenerateChangelog = () => {
    const ver = versionInput.trim() || 'v1.0.0';
    const notes = generateChangelogMarkdown(releaseDraftDiff, ver, releaseTitle.trim() || undefined);
    setReleaseNotes(notes);
    addToast('Changelog generated from endpoint diff!', 'info');
  };

  // Submit new version
  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionInput.trim()) {
      addToast('Version string is required (e.g. v1.0.0)', 'warning');
      return;
    }

    // Check duplicate
    const cleanVer = versionInput.trim();
    if (versions.some(v => v.version.toLowerCase() === cleanVer.toLowerCase())) {
      addToast(`Version ${cleanVer} already exists! Use a higher SemVer.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newVersion = await apiService.createCollectionVersion({
        workspaceId: collection.workspaceId,
        collectionId: collection.id,
        collectionName: collection.name,
        version: cleanVer,
        name: releaseTitle.trim() || `Release ${cleanVer}`,
        description: releaseNotes.trim() || undefined,
        author: user?.displayName || user?.email || 'Anonymous',
        folders: collection.folders || [],
        requests: collection.requests || [],
        mockConfig: collection.mockConfig,
        tags: selectedTags,
        diffSummary: {
          added: releaseDraftDiff.addedCount,
          removed: releaseDraftDiff.removedCount,
          modified: releaseDraftDiff.modifiedCount,
          breaking: releaseDraftDiff.breakingCount
        }
      });

      // Update local collection active version
      const updatedCol: ApiCollection = {
        ...collection,
        activeVersion: cleanVer
      };
      await apiService.updateCollection(collection.id, { activeVersion: cleanVer } as any);
      setCollections(collections.map(c => c.id === collection.id ? updatedCol : c));
      if (onCollectionUpdated) onCollectionUpdated(updatedCol);

      setVersions([newVersion, ...versions]);
      addToast(`Version snapshot ${cleanVer} created successfully!`, 'success');
      setActiveTab('history');
      // Reset form
      setReleaseTitle('');
      setReleaseNotes('');
      setVersionInput('');
    } catch (err: any) {
      console.error('Failed to create version:', err);
      addToast(err.message || 'Failed to create version', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rollback collection to historical snapshot
  const handleRollback = async (version: CollectionVersion) => {
    setIsSubmitting(true);
    try {
      const res = await apiService.rollbackCollectionToVersion(version.id);
      const updatedCol: ApiCollection = {
        ...collection,
        folders: version.folders || [],
        requests: version.requests || [],
        mockConfig: version.mockConfig,
        activeVersion: version.version
      };
      setCollections(collections.map(c => c.id === collection.id ? updatedCol : c));
      if (onCollectionUpdated) onCollectionUpdated(updatedCol);
      addToast(`Collection restored to ${version.version}!`, 'success');
      setConfirmRollbackVersion(null);
      onClose();
    } catch (err: any) {
      console.error('Rollback failed:', err);
      addToast(err.message || 'Failed to rollback collection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fork version into new collection
  const handleFork = async (version: CollectionVersion) => {
    const forkName = prompt(`Enter name for the new branched collection:`, `${collection.name} (${version.version})`);
    if (!forkName) return;

    try {
      const forked = await apiService.forkCollectionVersion(version.id, forkName);
      setCollections([...collections, forked]);
      addToast(`Created new collection branch: "${forkName}"`, 'success');
    } catch (err: any) {
      console.error('Fork failed:', err);
      addToast(err.message || 'Failed to branch collection', 'error');
    }
  };

  // Export version snapshot as a canonical Postman v2.1 collection
  // (shared builder, so it stays importable by newer Postman versions).
  const handleExport = (version: CollectionVersion) => {
    const exportData = exportSingleCollectionToPostman(
      { ...collection, requests: version.requests },
      `${collection.name} (${version.version})`,
      version.description || `Snapshot version ${version.version}`
    );

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '_').toLowerCase()}_${version.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${version.version} snapshot!`, 'info');
  };

  // Delete version
  const handleDeleteVersion = async (version: CollectionVersion) => {
    if (!confirm(`Are you sure you want to delete version ${version.version}? This action cannot be undone.`)) return;
    try {
      await apiService.deleteCollectionVersion(version.id, collection.id);
      setVersions(versions.filter(v => v.id !== version.id));
      addToast(`Version ${version.version} deleted`, 'info');
    } catch (err) {
      addToast('Failed to delete version', 'error');
    }
  };

  // Tag helper
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    const clean = tagInput.trim().toLowerCase();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
      setTagInput('');
    }
  };

  const toggleEndpointExpand = (id: string) => {
    const next = new Set(expandedEndpoints);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedEndpoints(next);
  };

  // Filtered diff endpoints
  const filteredEndpoints = useMemo(() => {
    return explorerDiffResult.endpoints.filter(e => {
      // Diff filter
      if (diffFilter === 'breaking' && !e.isBreaking) return false;
      if (diffFilter === 'added' && e.changeType !== 'added') return false;
      if (diffFilter === 'modified' && e.changeType !== 'modified') return false;
      if (diffFilter === 'removed' && e.changeType !== 'removed') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [explorerDiffResult.endpoints, diffFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60  animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded shadow-[var(--shadow-subtle)] flex flex-col max-h-[92vh] overflow-hidden text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-panel)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center ">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">{collection.name}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                  {collection.activeVersion || latestVersion?.version || 'Draft'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                API Collection Versioning, Endpoint Diffs & Changelog Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[var(--primary)] text-white '
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Version History ({versions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-[var(--primary)] text-white '
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Endpoint Diff & Compare</span>
              {explorerDiffResult.breakingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30">
                  {explorerDiffResult.breakingCount} breaking
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('release')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'release'
                  ? 'bg-[var(--primary)] text-white '
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Release New Version</span>
              {(releaseDraftDiff.addedCount > 0 || releaseDraftDiff.modifiedCount > 0 || releaseDraftDiff.removedCount > 0) && (
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              )}
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] font-medium hidden sm:block">
            {collection.requests?.length || 0} active endpoints
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: VERSION HISTORY & TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Released Snapshots & Changelogs</h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Audit, compare, or restore your endpoints to any previously released state.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('release')}
                  className="px-3 py-1.5 rounded bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors  cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Snapshot</span>
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-xs text-[var(--text-secondary)] animate-pulse">
                  Loading version history...
                </div>
              ) : versions.length === 0 ? (
                <div className="p-10 border border-dashed border-[var(--border-subtle)] rounded text-center space-y-3 bg-[var(--bg-surface)]/30">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">No Versions Released Yet</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                    Take your first snapshot (e.g. <span className="font-mono text-[var(--primary)]">v1.0.0</span>) to start tracking endpoint modifications, schema evolutions, and breaking changes.
                  </p>
                  <button
                    onClick={() => setActiveTab('release')}
                    className="px-4 py-2 rounded bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Version 1.0.0</span>
                  </button>
                </div>
              ) : (
                <div className="relative border-l-2 border-[var(--border-subtle)] ml-3 pl-6 space-y-6">
                  {versions.map((ver, idx) => {
                    const isLatest = ver.tags?.includes('latest') || idx === 0;
                    return (
                      <div 
                        key={ver.id} 
                        className="relative group bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded p-4.5 space-y-3  hover:border-[var(--primary)]/40 transition-colors"
                      >
                        {/* Timeline Node Dot */}
                        <div className={`absolute -left-[31px] top-5 w-4 h-4 rounded-full border-2 bg-[var(--bg-base)] ${
                          isLatest ? 'border-[var(--primary)] ' : 'border-[var(--text-tertiary)]'
                        }`} />

                        {/* Version Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-sm text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
                              {ver.version}
                            </span>
                            <span className="font-bold text-sm text-[var(--text-primary)]">
                              {ver.name || `Release ${ver.version}`}
                            </span>

                            {ver.tags?.map(t => (
                              <span 
                                key={t} 
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  t === 'latest' ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30' :
                                  t === 'production' ? 'bg-[var(--info)]/15 text-[var(--info)] border border-[var(--info)]/30' :
                                  t === 'deprecated' ? 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30' :
                                  'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                }`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Action Buttons */}
                            <button
                              onClick={() => {
                                setBaseVersionId(ver.id);
                                setTargetVersionId('draft');
                                setActiveTab('diff');
                              }}
                              className="px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-[var(--border-subtle)] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Compare with Current Working Draft"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                              <span>Compare</span>
                            </button>

                            <button
                              onClick={() => setConfirmRollbackVersion(ver)}
                              className="px-2.5 py-1 rounded bg-[var(--warning)]/10 hover:bg-[var(--warning)]/20 text-[var(--warning)] text-xs font-medium border border-[var(--warning)]/30 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Restore entire collection to this version"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Rollback</span>
                            </button>

                            <button
                              onClick={() => handleFork(ver)}
                              className="px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium border border-[var(--border-subtle)] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Branch into a new collection"
                            >
                              <GitBranch className="w-3.5 h-3.5 text-[var(--info)]" />
                              <span>Fork</span>
                            </button>

                            <button
                              onClick={() => handleExport(ver)}
                              className="p-1.5 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                              title="Export Snapshot JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteVersion(ver)}
                              className="p-1.5 rounded hover:bg-[var(--danger)]/10 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                              title="Delete Version"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
                          <span>Released by <strong className="text-[var(--text-primary)]">{ver.author || 'User'}</strong></span>
                          <span>{new Date(ver.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>{ver.requests?.length || 0} endpoints</span>

                          {ver.diffSummary && (
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              {ver.diffSummary.added > 0 && <span className="text-[var(--success)]">+{ver.diffSummary.added}</span>}
                              {ver.diffSummary.modified > 0 && <span className="text-[var(--warning)]">~{ver.diffSummary.modified}</span>}
                              {ver.diffSummary.removed > 0 && <span className="text-[var(--danger)]">-{ver.diffSummary.removed}</span>}
                              {ver.diffSummary.breaking > 0 && (
                                <span className="text-[var(--danger)] font-bold flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  {ver.diffSummary.breaking} breaking
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Changelog Description */}
                        {ver.description && (
                          <div className="bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {ver.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENDPOINT DIFF & COMPARE */}
          {activeTab === 'diff' && (
            <div className="space-y-5">
              {/* Compare Selectors Bar */}
              <div className="p-4 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Base Version (Original)
                    </label>
                    <select
                      value={baseVersionId}
                      onChange={(e) => setBaseVersionId(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    >
                      {versions.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.version} - {v.name || 'Release'} ({new Date(v.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                      <option value="draft">Current Working Draft</option>
                    </select>
                  </div>

                  <div className="shrink-0 pt-4 hidden sm:block">
                    <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  </div>

                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Target Version (Compare To)
                    </label>
                    <select
                      value={targetVersionId}
                      onChange={(e) => setTargetVersionId(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
                    >
                      <option value="draft">Current Working Draft ({collection.requests?.length || 0} endpoints)</option>
                      {versions.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.version} - {v.name || 'Release'} ({new Date(v.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Diff Statistics Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">Diff Summary:</span>
                    <span className="px-2 py-0.5 rounded bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 font-mono">
                      +{explorerDiffResult.addedCount} Added
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20 font-mono">
                      ~{explorerDiffResult.modifiedCount} Modified
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 font-mono">
                      -{explorerDiffResult.removedCount} Removed
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                      {explorerDiffResult.unchangedCount} Unchanged
                    </span>
                  </div>

                  {explorerDiffResult.breakingCount > 0 ? (
                    <div className="flex items-center gap-1.5 text-[var(--danger)] font-bold bg-[var(--danger)]/10 px-2.5 py-1 rounded border border-[var(--danger)]/30">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{explorerDiffResult.breakingCount} Breaking Change{explorerDiffResult.breakingCount > 1 ? 's' : ''} Detected!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[var(--success)] font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>100% Backward Compatible</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter and Search */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded border border-[var(--border-subtle)] text-xs">
                  <button
                    onClick={() => setDiffFilter('all')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      diffFilter === 'all' ? 'bg-[var(--primary)] text-white font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All ({explorerDiffResult.endpoints.length})
                  </button>
                  <button
                    onClick={() => setDiffFilter('breaking')}
                    className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                      diffFilter === 'breaking' ? 'bg-[var(--danger)] text-white font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--danger)]'
                    }`}
                  >
                    Breaking ({explorerDiffResult.breakingCount})
                  </button>
                  <button
                    onClick={() => setDiffFilter('added')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      diffFilter === 'added' ? 'bg-[var(--success)] text-white font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--success)]'
                    }`}
                  >
                    Added ({explorerDiffResult.addedCount})
                  </button>
                  <button
                    onClick={() => setDiffFilter('modified')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      diffFilter === 'modified' ? 'bg-[var(--warning)] text-white font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--warning)]'
                    }`}
                  >
                    Modified ({explorerDiffResult.modifiedCount})
                  </button>
                  <button
                    onClick={() => setDiffFilter('removed')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      diffFilter === 'removed' ? 'bg-[var(--danger)] text-white font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--danger)]'
                    }`}
                  >
                    Removed ({explorerDiffResult.removedCount})
                  </button>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search endpoints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Endpoint Diff Cards */}
              <div className="space-y-3">
                {filteredEndpoints.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded">
                    No endpoint changes found matching the current filter.
                  </div>
                ) : (
                  filteredEndpoints.map(item => {
                    const isExpanded = expandedEndpoints.has(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded transition-colors overflow-hidden ${
                          item.isBreaking 
                            ? 'border-[var(--danger)]/40 bg-[var(--danger)]/5' 
                            : item.changeType === 'added' 
                            ? 'border-[var(--success)]/30 bg-[var(--success)]/5' 
                            : item.changeType === 'modified' 
                            ? 'border-[var(--warning)]/30 bg-[var(--warning)]/5' 
                            : item.changeType === 'removed' 
                            ? 'border-[var(--danger)]/20 bg-[var(--danger)]/5' 
                            : 'border-[var(--border-subtle)] bg-[var(--bg-panel)]'
                        }`}
                      >
                        {/* Header Row */}
                        <div 
                          onClick={() => toggleEndpointExpand(item.id)}
                          className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--bg-hover)]/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              item.method === 'GET' ? 'bg-[var(--info)]/15 text-[var(--info)] border border-[var(--info)]/20' :
                              item.method === 'POST' ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20' :
                              item.method === 'PUT' ? 'bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/20' :
                              item.method === 'DELETE' ? 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/20' :
                              'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/20'
                            }`}>
                              {item.method}
                            </span>

                            <span className="font-mono text-xs font-semibold text-[var(--text-primary)] truncate">
                              {item.url}
                            </span>

                            <span className="text-xs text-[var(--text-secondary)] truncate hidden md:inline">
                              — {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.isBreaking && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30 uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" />
                                Breaking
                              </span>
                            )}

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              item.changeType === 'added' ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                              item.changeType === 'modified' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                              item.changeType === 'removed' ? 'bg-[var(--danger)]/20 text-[var(--danger)] line-through' :
                              'bg-[var(--text-tertiary)]/20 text-[var(--text-tertiary)]'
                            }`}>
                              {item.changeType}
                            </span>

                            {item.fieldDiffs.length > 0 && (
                              <button className="text-[var(--text-secondary)]">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Diff Breakdown */}
                        {isExpanded && item.fieldDiffs.length > 0 && (
                          <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] space-y-2 bg-[var(--bg-surface)]/50">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                              Field Modifications:
                            </h5>
                            {item.fieldDiffs.map((diff, fIdx) => (
                              <div key={fIdx} className="p-2.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                    {diff.isBreaking && <AlertTriangle className="w-3 h-3 text-[var(--danger)]" />}
                                    {diff.label}
                                  </span>
                                  {diff.isBreaking && (
                                    <span className="text-[10px] text-[var(--danger)] font-bold uppercase">Breaking Change</span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                                  {diff.oldValue !== null && (
                                    <div className="p-2 rounded bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)]">
                                      <div className="text-[9px] uppercase font-bold text-[var(--danger)] mb-0.5">Previous Value:</div>
                                      <div className="break-all">{String(diff.oldValue)}</div>
                                    </div>
                                  )}
                                  {diff.newValue !== null && (
                                    <div className="p-2 rounded bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)]">
                                      <div className="text-[9px] uppercase font-bold text-[var(--success)] mb-0.5">New Value:</div>
                                      <div className="break-all">{String(diff.newValue)}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RELEASE NEW VERSION */}
          {activeTab === 'release' && (
            <form onSubmit={handleCreateVersion} className="space-y-6">
              {/* Pre-Release Diff Detection Card */}
              <div className="p-4 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[var(--primary)]" />
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      Pending Changes Analysis (Draft vs {latestVersion ? latestVersion.version : 'Initial'})
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    releaseDraftDiff.breakingCount > 0 
                      ? 'bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30' 
                      : 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30'
                  }`}>
                    {releaseDraftDiff.suggestedBumpType.toUpperCase()} BUMP SUGGESTED
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-[var(--success)] font-mono">+{releaseDraftDiff.addedCount} new endpoints</span>
                  <span className="text-[var(--warning)] font-mono">~{releaseDraftDiff.modifiedCount} modified endpoints</span>
                  <span className="text-[var(--danger)] font-mono">-{releaseDraftDiff.removedCount} removed endpoints</span>
                  {releaseDraftDiff.breakingCount > 0 && (
                    <span className="text-[var(--danger)] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {releaseDraftDiff.breakingCount} breaking changes
                    </span>
                  )}
                </div>

                {/* Quick SemVer Buttons */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[var(--text-secondary)]">SemVer Recommendations:</span>
                  <button
                    type="button"
                    onClick={() => setVersionInput(releaseDraftDiff.suggestedSemVer)}
                    className="px-2.5 py-1 rounded bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    Recommended: {releaseDraftDiff.suggestedSemVer}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = (latestVersion?.version || 'v1.0.0').replace(/^v/i, '').split('.').map(Number);
                      setVersionInput(`v${clean[0]}.${clean[1]}.${(clean[2] || 0) + 1}`);
                    }}
                    className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-mono transition-colors cursor-pointer"
                  >
                    Patch (+0.0.1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = (latestVersion?.version || 'v1.0.0').replace(/^v/i, '').split('.').map(Number);
                      setVersionInput(`v${clean[0]}.${(clean[1] || 0) + 1}.0`);
                    }}
                    className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-mono transition-colors cursor-pointer"
                  >
                    Minor (+0.1.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = (latestVersion?.version || 'v1.0.0').replace(/^v/i, '').split('.').map(Number);
                      setVersionInput(`v${(clean[0] || 1) + 1}.0.0`);
                    }}
                    className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-mono transition-colors cursor-pointer"
                  >
                    Major (+1.0.0)
                  </button>
                </div>
              </div>

              {/* Version & Title Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Version Tag <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. v1.1.0 or v2.0.0"
                    value={versionInput}
                    onChange={(e) => setVersionInput(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)]"
                  />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Follows Semantic Versioning: MAJOR.MINOR.PATCH
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    Release Title / Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Authentication Overhaul & Webhooks"
                    value={releaseTitle}
                    onChange={(e) => setReleaseTitle(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)]"
                  />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Short summary title for documentation & changelog
                  </p>
                </div>
              </div>

              {/* Tags / Channels */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Release Tags & Channels
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {['latest', 'production', 'staging', 'beta', 'lts', 'deprecated'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        selectedTags.includes(tag)
                          ? 'bg-[var(--primary)] text-white '
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomTag();
                        }
                      }}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full px-3 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)] w-24"
                    />
                    <button
                      type="button"
                      onClick={addCustomTag}
                      className="p-1 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Release Notes / Changelog */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    Changelog & Release Notes (Markdown)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateChangelog}
                    className="px-2.5 py-1 rounded bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Auto-Generate from Diff</span>
                  </button>
                </div>
                <textarea
                  rows={7}
                  placeholder={`## Release Notes\n\n### New Features\n- Added endpoints\n\n### Changes\n- Updated parameters`}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded p-3 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-hidden focus:border-[var(--primary)] leading-relaxed resize-y"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-4 py-2 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !versionInput.trim()}
                  className="px-5 py-2 rounded bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-[var(--shadow-subtle)] shadow-[var(--primary)]/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating Snapshot...' : `Publish Version ${versionInput.trim() || ''}`}</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Rollback Confirmation Modal */}
        {confirmRollbackVersion && (
          <div className="absolute inset-0 bg-black/75  z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-base)] border border-[var(--danger)]/40 rounded p-6 max-w-md w-full space-y-4 shadow-[var(--shadow-subtle)]">
              <div className="w-12 h-12 rounded-full bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  Restore Collection to {confirmRollbackVersion.version}?
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  This will replace all current endpoints in <strong className="text-[var(--text-primary)]">{collection.name}</strong> with the snapshot from version <strong className="font-mono text-[var(--primary)]">{confirmRollbackVersion.version}</strong> ({confirmRollbackVersion.requests?.length || 0} endpoints).
                </p>
                <p className="text-[11px] text-[var(--warning)] bg-[var(--warning)]/10 p-2 rounded border border-[var(--warning)]/20">
                  Tip: A new version snapshot of your current draft can be taken before rolling back if you want to keep your draft changes.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRollbackVersion(null)}
                  className="px-4 py-2 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleRollback(confirmRollbackVersion)}
                  className="px-4 py-2 rounded bg-[var(--danger)] hover:bg-[var(--danger)] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-[var(--shadow-subtle)] shadow-rose-600/25"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isSubmitting ? 'Restoring...' : 'Confirm Rollback'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
