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

    setIsInviting(true);
    try {
      const invitation = await apiService.inviteMember(workspaceId, inviteEmail, inviteRole);
      const inviteLink = `${window.location.origin}${window.location.pathname}?invitation=${invitation.token}`;
      
      // Copy to clipboard automatically for convenience
      await navigator.clipboard.writeText(inviteLink);
      
      addToast(`Invitation link copied to clipboard! Share it with ${inviteEmail}`, 'success', 5000);
      setInviteEmail('');
      loadInvitations();
    } catch (e) {
      console.error("Failed to invite:", e);
      addToast('Failed to send invitation', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvitation = async (invitation: any) => {
    try {
      const updated = await apiService.resendInvitation(invitation.id);
      const inviteLink = `${window.location.origin}${window.location.pathname}?invitation=${updated.token}`;
      await navigator.clipboard.writeText(inviteLink);
      addToast(`New invitation link copied for ${invitation.email}`, 'success', 5000);
      loadInvitations();
    } catch (e) {
      console.error("Failed to resend:", e);
      addToast('Failed to resend invitation', 'error');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manage Workspace Members</h2>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invite Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Invite new member</h3>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 transition-all"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={isInviting || !inviteEmail}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Invite
              </button>
            </form>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Current Members</h3>
            <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">
                  No members found in this workspace.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {members.map((member) => (
                    <div key={member.userId} className="p-4 flex items-center justify-between hover:bg-[var(--bg-primary)] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-bold shadow-lg shrink-0 overflow-hidden">
                           {member.user?.photoURL ? (
                             <img src={member.user.photoURL} alt="" className="w-full h-full object-cover" />
                           ) : (
                             (member.user?.displayName || member.user?.email || '?').charAt(0).toUpperCase()
                           )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {member.user?.displayName || 'Unnamed User'}
                            {member.userId === user?.uid && <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)]">You</span>}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">{member.user?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded-full uppercase tracking-tight">
                          <Shield className="w-3 h-3" />
                          {member.role}
                        </div>
                        
                        {/* Access Control (Allow/Disallow) */}
                        <button
                          onClick={() => handleToggleStatus(member)}
                          disabled={member.role === 'OWNER'}
                          className={cn(
                            "flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-lg transition-all",
                            member.status === 'ACTIVE' 
                              ? "text-emerald-500 hover:bg-emerald-500/10" 
                              : "text-rose-500 hover:bg-rose-500/10",
                            member.role === 'OWNER' && "opacity-50 cursor-not-allowed"
                          )}
                          title={member.status === 'ACTIVE' ? "Access Allowed (Click to Disallow)" : "Access Disallowed (Click to Allow)"}
                        >
                          {member.status === 'ACTIVE' ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          <span className="w-14 text-center">{member.status === 'ACTIVE' ? 'ALLOWED' : 'BLOCKED'}</span>
                        </button>

                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={member.role === 'OWNER'}
                          className={cn(
                            "p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all",
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
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Pending Invitations</h3>
              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
                {invitationsLoading ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="p-4 flex items-center justify-between hover:bg-[var(--bg-primary)] transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] border border-dashed border-[var(--border-strong)] shrink-0">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{invitation.email}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">
                              Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full uppercase tracking-tight">
                            {invitation.role}
                          </div>
                          
                          <button
                            onClick={() => handleResendInvitation(invitation)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
                            title="Resend & Copy Link"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCancelInvitation(invitation)}
                            className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
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
        
        <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
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
