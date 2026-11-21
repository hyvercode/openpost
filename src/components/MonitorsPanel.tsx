import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../lib/api';
import { Activity, Play, Trash2, Plus, X, Check } from 'lucide-react';
import { cn } from '../utils';

/**
 * Monitors view (PRD #52): scheduled collection checks with alerting.
 * Lists monitors for the current workspace, create/toggle/run/delete,
 * and recent run history per monitor.
 */
export const MonitorsPanel: React.FC = () => {
  const { currentWorkspace, collections, addToast } = useStore();
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState({ collectionId: '', name: '', intervalMinutes: 60, alertEmail: '', slackWebhookUrl: '', scheduleMode: 'interval', cronExpr: '*/15 * * * *', activeStart: '', activeEnd: '' });
  const emptyForm = { collectionId: '', name: '', intervalMinutes: 60, alertEmail: '', slackWebhookUrl: '', scheduleMode: 'interval', cronExpr: '*/15 * * * *', activeStart: '', activeEnd: '' };
  const [schedEdits, setSchedEdits] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      setMonitors(await apiService.getMonitors(currentWorkspace.id));
    } catch {
      addToast('Failed to load monitors', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !form.collectionId || !form.name.trim()) {
      addToast('Collection and name are required', 'error');
      return;
    }
    try {
      await apiService.createMonitor(currentWorkspace.id, {
        collectionId: form.collectionId,
        name: form.name.trim(),
        intervalMinutes: Number(form.intervalMinutes) || 60,
        alertEmail: form.alertEmail.trim() || undefined,
        slackWebhookUrl: form.slackWebhookUrl.trim() || undefined,
        scheduleMode: form.scheduleMode,
        cronExpr: form.scheduleMode === 'cron' ? form.cronExpr.trim() || undefined : undefined,
        activeStart: form.activeStart || undefined,
        activeEnd: form.activeEnd || undefined,
      });
      setShowCreate(false);
      setForm({ ...emptyForm });
      addToast('Monitor created', 'success');
      load();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to create monitor', 'error');
    }
  };

  const toggleEnabled = async (m: any) => {
    try {
      await apiService.updateMonitor(m.id, { enabled: !m.enabled });
      load();
    } catch {
      addToast('Failed to update monitor', 'error');
    }
  };

  const runNow = async (m: any) => {
    try {
      addToast(`Running monitor "${m.name}"...`, 'info');
      const result = await apiService.runMonitorNow(m.id);
      addToast(`Monitor ${result.status}: ${result.passed} passed, ${result.failed} failed`, result.failed ? 'error' : 'success');
      load();
      if (expandedId === m.id) {
        setRuns((prev) => ({ ...prev }));
        loadRuns(m.id);
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Monitor run failed', 'error');
    }
  };

  const pauseMonitor = async (m: any, hours: number | null) => {
    try {
      await apiService.updateMonitor(m.id, {
        pausedUntil: hours === null ? null : new Date(Date.now() + hours * 3600 * 1000).toISOString(),
      });
      addToast(hours === null ? 'Monitor resumed' : `Monitor paused for ${hours}h`, 'success');
      load();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to update pause', 'error');
    }
  };

  const saveSchedule = async (m: any) => {
    const ed = schedEdits[m.id] ?? {
      scheduleMode: m.scheduleMode ?? 'interval',
      cronExpr: m.cronExpr ?? '',
      activeStart: m.activeStart ?? '',
      activeEnd: m.activeEnd ?? '',
    };
    try {
      const payload: any = { scheduleMode: ed.scheduleMode };
      if (ed.scheduleMode === 'cron') payload.cronExpr = (ed.cronExpr || '').trim();
      payload.activeStart = ed.activeStart || null;
      payload.activeEnd = ed.activeEnd || null;
      await apiService.updateMonitor(m.id, payload);
      setSchedEdits((prev) => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      addToast('Schedule updated', 'success');
      load();
    } catch (err: any) {
      addToast(err.response?.data?.error || err.response?.data?.details || 'Failed to update schedule', 'error');
    }
  };

  const isPaused = (m: any) => !!m.pausedUntil && new Date(m.pausedUntil).getTime() > Date.now();

  const scheduleLabel = (m: any) => {
    if (m.scheduleMode === 'cron') return `cron ${m.cronExpr || ''}`;
    return `every ${m.intervalMinutes}m`;
  };

  const remove = async (m: any) => {
    if (!window.confirm(`Delete monitor "${m.name}"?`)) return;
    try {
      await apiService.deleteMonitor(m.id);
      addToast('Monitor deleted', 'success');
      load();
    } catch {
      addToast('Failed to delete monitor', 'error');
    }
  };

  const loadRuns = async (id: string) => {
    try {
      const r = await apiService.getMonitorRuns(id);
      setRuns((prev) => ({ ...prev, [id]: r }));
    } catch {
      // ignore
    }
  };

  const toggleExpand = (m: any) => {
    if (expandedId === m.id) {
      setExpandedId(null);
    } else {
      setExpandedId(m.id);
      loadRuns(m.id);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">
        Select a workspace to manage monitors.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-base)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--icon-color)]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Monitors</h2>
          <span className="text-xs text-[var(--text-secondary)]">{monitors.length} configured</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded text-xs font-bold cursor-pointer"
        >
          {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showCreate ? 'Cancel' : 'New Monitor'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-[var(--text-secondary)]">
            Collection
            <select
              value={form.collectionId}
              onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
              required
            >
              <option value="">Select collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Monitor name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
              placeholder="Production API health"
              required
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Interval (minutes, min 5)
            <input
              type="number"
              min={5}
              max={1440}
              value={form.intervalMinutes}
              onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Schedule mode
            <select
              value={form.scheduleMode}
              onChange={(e) => setForm({ ...form, scheduleMode: e.target.value })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
            >
              <option value="interval">Interval</option>
              <option value="cron">Cron</option>
            </select>
          </label>
          {form.scheduleMode === 'cron' && (
            <label className="text-xs text-[var(--text-secondary)]">
              Cron (min hour dom mon dow)
              <input
                value={form.cronExpr}
                onChange={(e) => setForm({ ...form, cronExpr: e.target.value })}
                className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] font-mono"
                placeholder="*/15 * * * *"
              />
            </label>
          )}
          <label className="text-xs text-[var(--text-secondary)]">
            Active hours start (optional)
            <input
              type="time"
              value={form.activeStart}
              onChange={(e) => setForm({ ...form, activeStart: e.target.value })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Active hours end (optional)
            <input
              type="time"
              value={form.activeEnd}
              onChange={(e) => setForm({ ...form, activeEnd: e.target.value })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
            />
          </label>
          <label className="text-xs text-[var(--text-secondary)]">
            Alert email (optional)
            <input
              value={form.alertEmail}
              onChange={(e) => setForm({ ...form, alertEmail: e.target.value })}
              className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
              placeholder="ops@example.com"
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded text-xs font-bold cursor-pointer">
              Create Monitor
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <div className="text-xs text-[var(--text-secondary)]">Loading monitors...</div>}
        {!loading && monitors.length === 0 && (
          <div className="text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded p-6 text-center bg-[var(--bg-surface)]">
            No monitors yet. Create one to run a collection on a schedule and get alerted when it fails.
          </div>
        )}
        {monitors.map((m) => (
          <div key={m.id} className="border border-[var(--border-subtle)] rounded bg-[var(--bg-surface)]">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  !m.enabled ? 'bg-[var(--text-tertiary)]' : m.lastStatus === 'down' ? 'bg-[var(--danger)]' : m.lastStatus === 'up' ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                )}
                title={m.enabled ? (m.lastStatus || 'never run') : 'disabled'}
              />
              <button onClick={() => toggleExpand(m)} className="flex-1 text-left min-w-0 cursor-pointer">
                <div className="text-sm font-bold text-[var(--text-primary)] truncate">{m.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {scheduleLabel(m)}
                  {(m.activeStart || m.activeEnd) && ` · active ${m.activeStart || '…'}–${m.activeEnd || '…'}`}
                  {isPaused(m) && ` · paused until ${new Date(m.pausedUntil).toLocaleString()}`}
                  {m.lastRunAt ? ` · last run ${new Date(m.lastRunAt).toLocaleString()}` : ' · never run'}
                  {m.consecutiveFailures > 0 && ` · ${m.consecutiveFailures} consecutive failures`}
                </div>
              </button>
              <button
                onClick={() => toggleEnabled(m)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 cursor-pointer"
                title={m.enabled ? 'Disable' : 'Enable'}
              >
                {m.enabled ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => runNow(m)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] cursor-pointer"
                title="Run now"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={() => remove(m)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                title="Delete monitor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {expandedId === m.id && (
              <div className="border-t border-[var(--border-subtle)] px-3 py-2 space-y-3">
                <div>
                  <div className="text-xs font-bold text-[var(--text-secondary)] mb-1.5">Schedule</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="text-xs text-[var(--text-secondary)]">
                      Mode
                      <select
                        value={(schedEdits[m.id]?.scheduleMode) ?? m.scheduleMode ?? 'interval'}
                        onChange={(e) => setSchedEdits((prev) => ({
                          ...prev,
                          [m.id]: {
                            scheduleMode: e.target.value,
                            cronExpr: prev[m.id]?.cronExpr ?? m.cronExpr ?? '',
                            activeStart: prev[m.id]?.activeStart ?? m.activeStart ?? '',
                            activeEnd: prev[m.id]?.activeEnd ?? m.activeEnd ?? '',
                          },
                        }))}
                        className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
                      >
                        <option value="interval">Interval</option>
                        <option value="cron">Cron</option>
                      </select>
                    </label>
                    <label className="text-xs text-[var(--text-secondary)]">
                      Cron
                      <input
                        value={(schedEdits[m.id]?.cronExpr) ?? m.cronExpr ?? ''}
                        onChange={(e) => setSchedEdits((prev) => ({
                          ...prev,
                          [m.id]: { scheduleMode: prev[m.id]?.scheduleMode ?? m.scheduleMode ?? 'interval', cronExpr: e.target.value, activeStart: prev[m.id]?.activeStart ?? m.activeStart ?? '', activeEnd: prev[m.id]?.activeEnd ?? m.activeEnd ?? '' },
                        }))}
                        placeholder="*/15 * * * *"
                        className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] font-mono"
                      />
                    </label>
                    <label className="text-xs text-[var(--text-secondary)]">
                      Active from
                      <input
                        type="time"
                        value={(schedEdits[m.id]?.activeStart) ?? m.activeStart ?? ''}
                        onChange={(e) => setSchedEdits((prev) => ({
                          ...prev,
                          [m.id]: { scheduleMode: prev[m.id]?.scheduleMode ?? m.scheduleMode ?? 'interval', cronExpr: prev[m.id]?.cronExpr ?? m.cronExpr ?? '', activeStart: e.target.value, activeEnd: prev[m.id]?.activeEnd ?? m.activeEnd ?? '' },
                        }))}
                        className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                    </label>
                    <label className="text-xs text-[var(--text-secondary)]">
                      Active until
                      <input
                        type="time"
                        value={(schedEdits[m.id]?.activeEnd) ?? m.activeEnd ?? ''}
                        onChange={(e) => setSchedEdits((prev) => ({
                          ...prev,
                          [m.id]: { scheduleMode: prev[m.id]?.scheduleMode ?? m.scheduleMode ?? 'interval', cronExpr: prev[m.id]?.cronExpr ?? m.cronExpr ?? '', activeStart: prev[m.id]?.activeStart ?? m.activeStart ?? '', activeEnd: e.target.value },
                        }))}
                        className="mt-1 w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => saveSchedule(m)}
                      className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 cursor-pointer"
                    >
                      Save schedule
                    </button>
                    {isPaused(m) ? (
                      <button
                        onClick={() => pauseMonitor(m, null)}
                        className="text-xs font-bold text-[var(--success)] hover:opacity-80 border border-[var(--border-subtle)] rounded px-2 py-1 cursor-pointer"
                      >
                        Resume now
                      </button>
                    ) : (
                      <>
                        {[1, 8, 24].map((h) => (
                          <button
                            key={h}
                            onClick={() => pauseMonitor(m, h)}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 cursor-pointer"
                            title={`Pause for ${h}h (maintenance)`}
                          >
                            Pause {h}h
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div>
                <div className="text-xs font-bold text-[var(--text-secondary)] mb-1.5">Recent runs</div>
                {(runs[m.id] || []).length === 0 && (
                  <div className="text-xs text-[var(--text-tertiary)]">No runs yet.</div>
                )}
                {(runs[m.id] || []).map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs py-1 border-b border-[var(--border-subtle)] last:border-0">
                    {r.status === 'up'
                      ? <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                      : <X className="w-3.5 h-3.5 text-[var(--danger)] shrink-0" />}
                    <span className="text-[var(--text-primary)] font-semibold">{r.status}</span>
                    <span className="text-[var(--text-secondary)]">{r.passed} passed / {r.failed} failed · {r.timeMs}ms</span>
                    <span className="text-[var(--text-tertiary)] ml-auto">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
