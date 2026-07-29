import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Plus, Edit2, Shield, ShieldOff, Save, X, Cookie } from 'lucide-react';
import { cn } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export const CookieManager: React.FC = () => {
  const { cookies, setCookies, addCookie, updateCookie, deleteCookie, currentWorkspace, addToast } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ domain: '', name: '', value: '', path: '/', secure: true, httpOnly: false });

  if (!currentWorkspace) return null;

  const workspaceCookies = cookies.filter(c => c.workspaceId === currentWorkspace.id);

  const handleAddNew = () => {
    const id = uuidv4();
    addCookie({
      id,
      workspaceId: currentWorkspace.id,
      domain: 'example.com',
      name: 'new_cookie',
      value: 'value',
      path: '/',
      secure: true,
      httpOnly: false
    });
    setEditingId(id);
    setEditForm({ domain: 'example.com', name: 'new_cookie', value: 'value', path: '/', secure: true, httpOnly: false });
  };

  const handleSave = (id: string) => {
    updateCookie(id, editForm);
    setEditingId(null);
    addToast('Cookie saved successfully', 'success');
  };

  const handleDelete = (id: string) => {
    deleteCookie(id);
    if (editingId === id) setEditingId(null);
  };

  const handleClearAll = () => {
    const remaining = cookies.filter(c => c.workspaceId !== currentWorkspace.id);
    setCookies(remaining);
    addToast('All cookies cleared', 'success');
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Cookie className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Cookies Manager</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage cookies that will be automatically attached to proxy requests</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAll}
                disabled={workspaceCookies.length === 0}
                className="px-4 py-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
              >
                Clear All
              </button>
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[#e65a2d] text-white rounded font-bold text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Cookie
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-strong)] overflow-hidden shadow-sm">
            {workspaceCookies.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-secondary)]">
                <Cookie className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-lg">No Cookies Found</p>
                <p className="text-sm mt-1">Add a cookie to have it automatically sent with matching proxy requests.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                      <th className="px-4 py-3 font-semibold">Domain</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Value</th>
                      <th className="px-4 py-3 font-semibold">Path</th>
                      <th className="px-4 py-3 font-semibold">Flags</th>
                      <th className="px-4 py-3 font-semibold w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                    {workspaceCookies.map(cookie => (
                      <tr key={cookie.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                        {editingId === cookie.id ? (
                          <>
                            <td className="p-2"><input type="text" value={editForm.domain} onChange={e => setEditForm({...editForm, domain: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-1 text-xs" /></td>
                            <td className="p-2"><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-1 text-xs" /></td>
                            <td className="p-2"><input type="text" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-1 text-xs" /></td>
                            <td className="p-2"><input type="text" value={editForm.path} onChange={e => setEditForm({...editForm, path: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-2 py-1 text-xs" /></td>
                            <td className="p-2">
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                  <input type="checkbox" checked={editForm.secure} onChange={e => setEditForm({...editForm, secure: e.target.checked})} className="rounded text-[var(--primary)] focus:ring-[var(--primary)]" />
                                  Secure
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                                  <input type="checkbox" checked={editForm.httpOnly} onChange={e => setEditForm({...editForm, httpOnly: e.target.checked})} className="rounded text-[var(--primary)] focus:ring-[var(--primary)]" />
                                  HttpOnly
                                </label>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleSave(cookie.id)} className="p-1.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" title="Save"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-mono text-xs">{cookie.domain}</td>
                            <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">{cookie.name}</td>
                            <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]" title={cookie.value}>{cookie.value}</td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{cookie.path}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {cookie.secure ? <span title="Secure"><Shield className="w-3.5 h-3.5 text-emerald-500" /></span> : <span title="Not Secure"><ShieldOff className="w-3.5 h-3.5 text-red-500 opacity-50" /></span>}
                                {cookie.httpOnly && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">HTTP</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingId(cookie.id);
                                    setEditForm({ ...cookie });
                                  }}
                                  className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(cookie.id)}
                                  className="p-1.5 rounded text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
