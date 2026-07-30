import React, { useState, useEffect } from 'react';
import { X, Mail, Shield, UserMinus, ToggleLeft, ToggleRight, Check, Loader2, RefreshCcw, Trash2 } from 'lucide-react';
import { apiService } from '../lib/api';
import { useStore } from '../store/useStore';
import { cn } from '../utils';

interface WorkspaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function WorkspaceMembersModal({ isOpen, onClose, workspaceId }: WorkspaceMembersModalProps) {
  const { addToast, user } = useStore();
  const [members, setMembers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadMembers();
      loadInvitations();
    }
  }, [isOpen, workspaceId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await apiService.getMembers(workspaceId);
      setMembers(data);
    } catch (e) {
      console.error("Failed to load members:", e);
      addToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const data = await apiService.getPendingInvitations(workspaceId);
      setPendingInvitations(data);
    } catch (e) {
      console.error("Failed to load invitations:", e);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (!workspaceId) {
      addToast('No active workspace selected', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const invitation = await apiService.inviteMember(workspaceId, inviteEmail, inviteRole);
      const inviteLink = `${window.location.origin}${window.location.pathname}?invitation=${invitation.token}`;
      
      let clipboardSuccess = false;
      try {
        await navigator.clipboard.writeText(inviteLink);
        clipboardSuccess = true;
      } catch (err) {
        console.warn('Could not copy to clipboard:', err);
      }
      
      if (clipboardSuccess) {
        addToast(`Invitation email sent to ${inviteEmail}! Link also copied to clipboard.`, 'success', 5000);
      } else {
        addToast(`Invitation email sent to ${inviteEmail}!`, 'success', 5000);
      }
      setInviteEmail('');
      loadInvitations();
    } catch (e: any) {
      console.error("Failed to invite:", e);
      const errorMessage = e.response?.data?.error || e.message || 'Failed to send invitation';
      addToast(errorMessage, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvitation = async (invitation: any) => {
    setResendingId(invitation.id);
    try {
      const updated = await apiService.resendInvitation(invitation.id);
      const inviteLink = `${window.location.origin}${window.location.pathname}?invitation=${updated.token}`;
      let clipboardSuccess = false;
      try {
        await navigator.clipboard.writeText(inviteLink);
        clipboardSuccess = true;
      } catch (err) {
        console.warn('Could not copy to clipboard:', err);
      }
      
      if (clipboardSuccess) {
        addToast(`Invitation email resent to ${invitation.email}! Link also copied to clipboard.`, 'success', 5000);
      } else {
        addToast(`Invitation email resent to ${invitation.email}!`, 'success', 5000);
      }
      loadInvitations();
    } catch (e) {
      console.error("Failed to resend:", e);
      addToast('Failed to resend invitation', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvitation = async (invitation: any) => {
    if (!confirm(`Cancel invitation for ${invitation.email}?`)) return;
    try {
      await apiService.cancelInvitation(invitation.id);
      setPendingInvitations(pendingInvitations.filter(i => i.id !== invitation.id));
      addToast('Invitation cancelled', 'success');
    } catch (e) {
      console.error("Failed to cancel invitation:", e);
      addToast('Failed to cancel invitation', 'error');
    }
  };

  const handleToggleStatus = async (member: any) => {
    const newStatus = member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await apiService.updateMember(workspaceId, member.userId, { status: newStatus });
      setMembers(members.map(m => m.userId === member.userId ? { ...m, status: newStatus } : m));
      addToast(`Member access ${newStatus === 'ACTIVE' ? 'allowed' : 'disallowed'}`, 'success');
    } catch (e) {
      console.error("Failed to update status:", e);
      addToast('Failed to update member status', 'error');
    }
  };

  const handleRemoveMember = async (member: any) => {
    if (member.role === 'OWNER') {
        addToast('Cannot remove workspace owner', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to remove ${member.user?.displayName || member.user?.email}?`)) return;

    try {
      await apiService.removeMember(workspaceId, member.userId);
      setMembers(members.filter(m => m.userId !== member.userId));
      addToast('Member removed', 'success');
    } catch (e) {
      console.error("Failed to remove member:", e);
      addToast('Failed to remove member', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[var(--text-primary)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Manage Workspace Members</h2>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Invite Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Invite new member</h3>
            <form onSubmit={handleInvite} className="flex flex-wrap sm:flex-nowrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-[var(--bg-hover)]/40 border border-[var(--border-strong)] rounded-lg py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-[var(--bg-hover)]/40 border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 cursor-pointer transition-all"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={isInviting || !inviteEmail}
                className="bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 min-w-[100px]"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Inviting...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Invite</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Current Members</h3>
            <div className="border border-[var(--border-strong)] rounded-xl overflow-hidden bg-[var(--bg-hover)]/20">
              {loading ? (
                <div className="p-8 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                  <span>Loading members...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)] text-sm">
                  No members found in this workspace.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {members.map((member) => (
                    <div key={member.userId} className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)]/50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 flex items-center justify-center text-[var(--primary)] font-bold shadow-xs shrink-0 overflow-hidden text-sm">
                           {member.user?.photoURL ? (
                             <img src={member.user.photoURL} alt="" className="w-full h-full object-cover" />
                           ) : (
                             (member.user?.displayName || member.user?.email || '?').charAt(0).toUpperCase()
                           )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                            <span className="truncate">{member.user?.displayName || 'Unnamed User'}</span>
                            {member.userId === user?.uid && (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-full text-[var(--text-secondary)] shrink-0">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">{member.user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full uppercase tracking-tight">
                          <Shield className="w-3 h-3 text-[var(--primary)]" />
                          {member.role}
                        </div>
                        
                        {/* Access Control (Allow/Disallow) */}
                        <button
                          onClick={() => handleToggleStatus(member)}
                          disabled={member.role === 'OWNER'}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer",
                            member.status === 'ACTIVE' 
                              ? "text-emerald-500 hover:bg-emerald-500/10" 
                              : "text-rose-500 hover:bg-rose-500/10",
                            member.role === 'OWNER' && "opacity-50 cursor-not-allowed"
                          )}
                          title={member.status === 'ACTIVE' ? "Access Allowed (Click to Disallow)" : "Access Disallowed (Click to Allow)"}
                        >
                          {member.status === 'ACTIVE' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          <span className="w-14 text-center hidden sm:inline">{member.status === 'ACTIVE' ? 'ALLOWED' : 'BLOCKED'}</span>
                        </button>

                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={member.role === 'OWNER'}
                          className={cn(
                            "p-1.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer",
                            member.role === 'OWNER' && "opacity-0 cursor-default group-hover:opacity-0"
                          )}
                          title="Remove Member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          {(pendingInvitations.length > 0 || invitationsLoading) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Pending Invitations</h3>
              <div className="border border-[var(--border-strong)] rounded-xl overflow-hidden bg-[var(--bg-hover)]/20">
                {invitationsLoading ? (
                  <div className="p-8 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                    <span>Loading invitations...</span>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)]/50 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] border border-dashed border-[var(--border-strong)] shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{invitation.email}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">
                              Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full uppercase tracking-tight">
                            {invitation.role}
                          </div>
                          
                          <button
                            onClick={() => handleResendInvitation(invitation)}
                            disabled={resendingId === invitation.id}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                            title="Resend & Copy Link"
                          >
                            {resendingId === invitation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)]" />
                            ) : (
                              <RefreshCcw className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleCancelInvitation(invitation)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Cancel Invitation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/80 border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  )
}
