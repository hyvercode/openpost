import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { apiService } from '../lib/api';
import { User, Download, BookOpen, FileCode, Folder, Settings, Users, Lock, Save, Plus, Mail, Shield, Trash2, Globe, Laptop, Eye, EyeOff, Sun, Moon, Check, RotateCcw, Monitor } from 'lucide-react';
import { cn } from '../utils';
import { exportWorkspaceJSON, exportAllPostmanJSON } from '../utils/exportUtils';

export const SettingsView: React.FC = () => {
  const { 
    user, 
    setUser, 
    workspaces, 
    currentWorkspace, 
    setCurrentWorkspace,
    collections,
    environments, 
    addToast, 
    proxyConfig, 
    setProxyConfig,
    theme,
    setTheme
  } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'workspace' | 'team' | 'security' | 'proxy'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'team' && currentWorkspace) {
      loadTeam();
    }
  }, [activeTab, currentWorkspace]);

  const loadTeam = async () => {
    if (!currentWorkspace) return;
    setIsLoadingTeam(true);
    try {
      const [m, i] = await Promise.all([
        apiService.getMembers(currentWorkspace.id),
        apiService.getPendingInvitations(currentWorkspace.id)
      ]);
      setMembers(m);
      setInvitations(i);
    } catch (error) {
      console.error('Failed to load team data', error);
    } finally {
      setIsLoadingTeam(false);
    }
  };


  // Proxy State
  const [proxyEnabled, setProxyEnabled] = useState(proxyConfig.enabled);
  const [proxyUrl, setProxyUrl] = useState(proxyConfig.url);
  const [proxyProtocol, setProxyProtocol] = useState(proxyConfig.protocol);
  const [proxyUseAuth, setProxyUseAuth] = useState(proxyConfig.useAuth);
  const [proxyUsername, setProxyUsername] = useState(proxyConfig.username || '');
  const [proxyPassword, setProxyPassword] = useState(proxyConfig.password || '');

  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Team State
  const [inviteEmail, setInviteEmail] = useState('');

  const handleUpdateProxy = (e: React.FormEvent) => {
    e.preventDefault();
    setProxyConfig({
      enabled: proxyEnabled,
      url: proxyUrl,
      protocol: proxyProtocol as any,
      useAuth: proxyUseAuth,
      username: proxyUsername,
      password: proxyPassword
    });
    addToast('Proxy settings saved', 'success');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const updatedUser = await apiService.saveUser({
        uid: user.uid,
        email: user.email,
        displayName,
        photoURL
      });
      setUser(updatedUser);
      addToast('Profile updated successfully.', 'success');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await apiService.changePassword(currentPassword, newPassword);
      addToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to update password.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail) return;

    setIsSaving(true);
    try {
      await apiService.inviteMember(currentWorkspace.id, inviteEmail, 'MEMBER');
      addToast(`Invitation email sent to ${inviteEmail}!`, 'success');
      setInviteEmail('');
      loadTeam();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to send invitation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return;
    try {
      await apiService.removeMember(currentWorkspace.id, userId);
      addToast('Member removed', 'success');
      loadTeam();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to remove member', 'error');
    }
  };

    const handleResendInvitation = async (invitationId: string) => {
    setResendingId(invitationId);
    try {
      await apiService.resendInvitation(invitationId);
      addToast('Invitation resent successfully', 'success');
      loadTeam();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to resend invitation', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await apiService.cancelInvitation(invitationId);
      addToast('Invitation cancelled', 'success');
      loadTeam();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to cancel invitation', 'error');
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
            onClick={() => setActiveTab('appearance')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'appearance' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Monitor className="w-4 h-4" />
            Theme & Appearance
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

          <button 
            onClick={() => setActiveTab('proxy')}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === 'proxy' ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Globe className="w-4 h-4" />
            Proxy Settings
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

                <form onSubmit={handleUpdateProfile} className="space-y-4 bg-[var(--bg-panel)] p-6 rounded border border-[var(--border-subtle)]">
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
                      <h3 className="font-medium text-[var(--text-primary)] text-lg">{user?.displayName || 'User'}</h3>
                      <p className="text-sm font-medium text-[var(--text-secondary)]">{user?.email}</p>
                      <p className="text-xs text-[var(--text-secondary)]/70 mt-1">Your account email cannot be changed</p>
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
                      className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">Appearance</h1>
                  <p className="text-sm text-[var(--text-secondary)]">Ubuntu professional theme. Accent color is fixed Ubuntu Orange.</p>
                </div>

                {/* Theme selection: Ubuntu Light / Ubuntu Dark */}
                <div className="bg-[var(--bg-surface)] p-4 rounded border border-[var(--border-subtle)] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Color Mode
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme('light');
                        addToast('Theme set to Ubuntu Light', 'info');
                      }}
                      className={cn(
                        "p-4 rounded border flex items-center gap-3 text-left cursor-pointer",
                        theme === 'light'
                          ? "border-[var(--primary)] bg-[var(--bg-base)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <span className="w-8 h-8 rounded border border-[var(--border-subtle)] bg-white flex items-center justify-center shrink-0">
                        <Sun className="w-4 h-4 text-[#5d5d5d]" />
                      </span>
                      <span>
                        <span className="text-sm font-bold text-[var(--text-primary)] block">Ubuntu Light</span>
                        <span className="text-xs text-[var(--text-secondary)] block">White workspace</span>
                      </span>
                      {theme === 'light' && (
                        <Check className="w-4 h-4 text-[var(--primary)] ml-auto shrink-0" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTheme('dark');
                        addToast('Theme set to Ubuntu Dark', 'info');
                      }}
                      className={cn(
                        "p-4 rounded border flex items-center gap-3 text-left cursor-pointer",
                        theme === 'dark'
                          ? "border-[var(--primary)] bg-[var(--bg-base)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-strong)]"
                      )}
                    >
                      <span className="w-8 h-8 rounded border border-[#3a3633] bg-[#1a1a1a] flex items-center justify-center shrink-0">
                        <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                      </span>
                      <span>
                        <span className="text-sm font-bold text-[var(--text-primary)] block">Ubuntu Dark</span>
                        <span className="text-xs text-[var(--text-secondary)] block">Dark workspace</span>
                      </span>
                      {theme === 'dark' && (
                        <Check className="w-4 h-4 text-[var(--primary)] ml-auto shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Pending invitations */}
                <div className="bg-[var(--bg-surface)] p-4 rounded border border-[var(--border-subtle)] space-y-3">
                  {invitations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pending Invitations</h3>
                      <div className="space-y-2">
                        {invitations.map((inv, i) => (
                          <div key={inv.id || i} className="flex items-center justify-between p-3 bg-[var(--bg-base)] rounded border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-[var(--bg-panel)] flex items-center justify-center font-bold text-xs">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-sm font-medium">{inv.email}</span>
                                <span className="text-xs text-[var(--text-secondary)] block">Invited as {inv.role}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--warning)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded font-bold uppercase">Pending</span>
                              <button
                                onClick={() => handleResendInvitation(inv.id)}
                                disabled={resendingId === inv.id}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 disabled:opacity-50 cursor-pointer"
                                title="Resend Invitation"
                              >
                                <RotateCcw className={cn("w-3.5 h-3.5", resendingId === inv.id && "animate-spin text-[var(--primary)]")} />
                              </button>
                              <button
                                onClick={() => handleCancelInvitation(inv.id)}
                                disabled={resendingId === inv.id}
                                className="text-[var(--text-secondary)] hover:text-[var(--danger)] p-1 disabled:opacity-50 cursor-pointer"
                                title="Cancel Invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workspace Settings</h1>
                  <p className="text-[var(--text-secondary)]">Manage your current workspace: <span className="text-[var(--text-primary)] font-semibold">{currentWorkspace?.name}</span></p>
                </div>

                <div className="bg-[var(--bg-panel)] p-6 rounded border border-[var(--border-subtle)] space-y-6">
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

                  {/* Data Export & Workspace Backup Section */}
                  <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                      <Download className="w-4 h-4 text-[var(--primary)]" />
                      Data Export & Workspace Backup
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Download a full JSON backup of your current workspace including all collections, folders, requests, and environment variables.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentWorkspace) {
                            exportWorkspaceJSON(currentWorkspace.id, collections, environments, currentWorkspace.name);
                            addToast('Workspace backup exported successfully as JSON', 'success', 2500);
                          }
                        }}
                        className="flex items-center justify-center gap-2.5 p-3 bg-[var(--primary)] text-white rounded text-xs font-bold hover:opacity-90 transition-colors  cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Export Workspace (JSON Backup)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (currentWorkspace) {
                            exportAllPostmanJSON(collections, currentWorkspace.name);
                            addToast('Postman collection v2.1 exported', 'success', 2500);
                          }
                        }}
                        className="flex items-center justify-center gap-2.5 p-3 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded text-xs font-bold hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-[var(--warning)]" />
                        Export Collections (Postman v2.1)
                      </button>
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

                <div className="bg-[var(--bg-panel)] p-6 rounded border border-[var(--border-subtle)] space-y-6">
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
                        className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-colors min-w-[100px] justify-center"
                      >
                        {isSaving ? (
                          <>
                            <RotateCcw className="w-4 h-4 animate-spin" />
                            Inviting...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Invite
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Current Members</h3>
                    <div className="space-y-2">
                      {/* Owner */}
                      <div className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--info)]/20 flex items-center justify-center text-[var(--info)] font-bold">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{user?.displayName || 'Owner'}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] block">{user?.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] border border-[var(--info)]/30 text-[var(--info)] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Owner</span>
                      </div>

                      {isLoadingTeam ? (
                        <div className="text-sm text-[var(--text-secondary)] p-4 text-center">Loading team members...</div>
                      ) : (
                        <>
                          {members.filter(m => m.user?.uid !== user?.uid).map((member, i) => (
                            <div key={member.id || i} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--text-tertiary)]/20 flex items-center justify-center text-[var(--text-tertiary)] font-bold text-xs">
                                  {(member.user?.displayName || member.user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-sm font-medium">{member.user?.displayName || member.user?.email}</span>
                                  <span className="text-[10px] text-[var(--text-secondary)] block">{member.role}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveMember(member.user?.uid)}
                                className="text-[var(--text-secondary)] hover:text-[var(--danger)] p-1 transition-colors"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
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

                <form onSubmit={handleUpdatePassword} className="bg-[var(--bg-panel)] p-6 rounded border border-[var(--border-subtle)] space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Change Password</h3>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Current Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)] pr-10"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">New Password (min 12 chars, upper + lower + number)</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)] pr-10"
                        placeholder="••••••••"
                        minLength={6}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)] pr-10"
                        placeholder="••••••••"
                        minLength={6}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSaving || !newPassword}
                      className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-6 rounded space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--danger)] flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h3>
                  <p className="text-xs text-[var(--danger)]">Once you delete your account, there is no going back. Please be certain.</p>
                  <button className="bg-[var(--danger)] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[var(--danger)] transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'proxy' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--text-primary)]">Proxy Configuration</h1>
                  <p className="text-[var(--text-secondary)]">Route your API requests through a custom proxy server or tunnel</p>
                </div>

                <form onSubmit={handleUpdateProxy} className="space-y-6 bg-[var(--bg-panel)] p-6 rounded border border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between p-4 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Enable Custom Proxy</h3>
                      <p className="text-xs text-[var(--text-secondary)]">When enabled, all requests will be routed via the configured server</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProxyEnabled(!proxyEnabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        proxyEnabled ? "bg-[var(--primary)]" : "bg-[var(--bg-input)]"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          proxyEnabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className={cn("space-y-4 transition-opacity", !proxyEnabled && "opacity-50 pointer-events-none")}>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 space-y-2">
                        <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Protocol</label>
                        <select
                          value={proxyProtocol}
                          onChange={(e) => setProxyProtocol(e.target.value as any)}
                          className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                        >
                          <option value="http">HTTP</option>
                          <option value="https">HTTPS</option>
                          <option value="socks5">SOCKS5</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Proxy URL / Host</label>
                        <input
                          type="text"
                          value={proxyUrl}
                          onChange={(e) => setProxyUrl(e.target.value)}
                          className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                          placeholder="e.g. 127.0.0.1:8080 or proxy.example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="proxyAuth"
                          checked={proxyUseAuth}
                          onChange={(e) => setProxyUseAuth(e.target.checked)}
                          className="rounded border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <label htmlFor="proxyAuth" className="text-xs font-bold uppercase text-[var(--text-secondary)] cursor-pointer">Use Authentication</label>
                      </div>

                      {proxyUseAuth && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Username</label>
                            <input
                              type="text"
                              value={proxyUsername}
                              onChange={(e) => setProxyUsername(e.target.value)}
                              className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                              placeholder="Username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Password</label>
                            <input
                              type="password"
                              value={proxyPassword}
                              onChange={(e) => setProxyPassword(e.target.value)}
                              className="w-full bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                              placeholder="Password"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="bg-[var(--primary)] text-white px-6 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-colors shadow-[var(--shadow-subtle)] shadow-[var(--primary)]/20"
                    >
                      <Save className="w-4 h-4" />
                      Save Proxy Settings
                    </button>
                  </div>
                </form>

                <div className="bg-[var(--bg-panel)] p-6 rounded border border-[var(--border-subtle)] space-y-3">
                   <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                     <Shield className="w-4 h-4 text-[var(--info)]" />
                     Security & Privacy Note
                   </h3>
                   <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                     Configuring a proxy routes all your outgoing API requests through that server. 
                     Make sure you trust the proxy provider as they may be able to inspect the traffic. 
                     For local development, tools like <strong>ngrok</strong> or <strong>localflare</strong> can be used as tunnels.
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
