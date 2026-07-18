import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { User, Settings, Users, Lock, Save, Plus, Mail, Shield, Trash2, Globe, Laptop } from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { cn } from '../utils';

export const SettingsView: React.FC = () => {
  const { user, setUser, workspaces, currentWorkspace, setCurrentWorkspace, addToast } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'team' | 'security'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Team State
  const [inviteEmail, setInviteEmail] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL
      });
      setUser({
        ...user!,
        displayName,
        photoURL
      });
      addToast('Profile updated successfully', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password updated successfully', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail) return;

    setIsSaving(true);
    try {
      const updatedMembers = [...(currentWorkspace.members || []), inviteEmail];
      setCurrentWorkspace({ ...currentWorkspace, members: updatedMembers });
      addToast(`Invited ${inviteEmail} to workspace`, 'success');
      setInviteEmail('');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] flex flex-col p-4 gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4 px-2">Settings</h2>
          
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'profile' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          
          <button 
            onClick={() => setActiveTab('workspace')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'workspace' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Laptop className="w-4 h-4" />
            Workspace
          </button>
          
          <button 
            onClick={() => setActiveTab('team')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'team' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Users className="w-4 h-4" />
            Team & Members
          </button>
          
          <button 
            onClick={() => setActiveTab('security')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'security' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Lock className="w-4 h-4" />
            Security
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile Settings</h1>
                  <p className="text-[var(--text-secondary)]">Manage your public profile information</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 bg-[var(--bg-panel)] p-6 rounded-lg border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative group">
                      {photoURL ? (
                        <img src={photoURL} alt="" className="w-20 h-20 rounded-full border-2 border-[var(--border-strong)]" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-[var(--bg-hover)] flex items-center justify-center border-2 border-[var(--border-strong)]">
                          <User className="w-8 h-8 text-[var(--text-secondary)]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)]">{user?.email}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Your account email cannot be changed</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Avatar URL</label>
                    <input 
                      type="text" 
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workspace Settings</h1>
                  <p className="text-[var(--text-secondary)]">Manage your current workspace: <span className="text-[var(--text-primary)] font-semibold">{currentWorkspace?.name}</span></p>
                </div>

                <div className="bg-[var(--bg-panel)] p-6 rounded-lg border border-[var(--border-subtle)] space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      General Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Workspace ID</span>
                        <span className="text-xs font-mono truncate block">{currentWorkspace?.id}</span>
                      </div>
                      <div className="p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Role</span>
                        <span className="text-xs font-medium block">{currentWorkspace?.ownerId === user?.uid ? 'Owner' : 'Member'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Your Workspaces</h3>
                    <div className="space-y-2">
                      {workspaces.map(ws => (
                        <div key={ws.id} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-bold">
                              {ws.name.charAt(0)}
                            </div>
                            <div>
                              <span className="text-sm font-medium">{ws.name}</span>
                              <span className="text-[10px] text-[var(--text-secondary)] block">{ws.ownerId === user?.uid ? 'Personal Workspace' : 'Shared Workspace'}</span>
                            </div>
                          </div>
                          {ws.id === currentWorkspace?.id && (
                            <span className="text-[10px] bg-[var(--primary)] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Active</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team & Collaboration</h1>
                  <p className="text-[var(--text-secondary)]">Manage workspace members and team collaboration</p>
                </div>

                <div className="bg-[var(--bg-panel)] p-6 rounded-lg border border-[var(--border-subtle)] space-y-6">
                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Invite Member</h3>
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                        placeholder="colleague@example.com"
                      />
                      <button 
                        type="submit"
                        disabled={isSaving || !inviteEmail}
                        className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Invite
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Current Members</h3>
                    <div className="space-y-2">
                      {/* Owner */}
                      <div className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{user?.displayName || 'Owner'}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] block">{user?.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] border border-blue-500/30 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Owner</span>
                      </div>

                      {/* Mock Members */}
                      {currentWorkspace?.members?.map((member, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-500 font-bold text-xs">
                              {member.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-sm font-medium">{member}</span>
                              <span className="text-[10px] text-[var(--text-secondary)] block">Member</span>
                            </div>
                          </div>
                          <button className="text-[var(--text-secondary)] hover:text-red-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Security Settings</h1>
                  <p className="text-[var(--text-secondary)]">Secure your account and manage access</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="bg-[var(--bg-panel)] p-6 rounded-lg border border-[var(--border-subtle)] space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Change Password</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSaving || !newPassword}
                      className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      <Lock className="w-4 h-4" />
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-lg space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-500 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h3>
                  <p className="text-xs text-red-400">Once you delete your account, there is no going back. Please be certain.</p>
                  <button className="bg-red-500 text-white px-4 py-2 rounded text-sm font-bold hover:bg-red-600 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
