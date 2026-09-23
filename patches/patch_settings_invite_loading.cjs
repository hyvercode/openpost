const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// 1. Add resendingId state
if (!code.includes('const [resendingId, setResendingId]')) {
  code = code.replace(
    "const [isSaving, setIsSaving] = useState(false);",
    "const [isSaving, setIsSaving] = useState(false);\n  const [resendingId, setResendingId] = useState<string | null>(null);"
  );
}

// 2. Add handleResendInvitation
const handleResend = `  const handleResendInvitation = async (invitationId: string) => {
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
`;
if (!code.includes('handleResendInvitation')) {
  code = code.replace("const handleCancelInvitation = async (invitationId: string) => {", handleResend + "\n  const handleCancelInvitation = async (invitationId: string) => {");
}

// 3. Update Invite button
const oldInviteButton = `<button 
                        type="submit"
                        disabled={isSaving || !inviteEmail}
                        className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Invite
                      </button>`;
const newInviteButton = `<button 
                        type="submit"
                        disabled={isSaving || !inviteEmail}
                        className="bg-[var(--primary)] text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all min-w-[100px] justify-center"
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
                      </button>`;
code = code.replace(oldInviteButton, newInviteButton);

// 4. Update Pending Invitation list to add a resend button and loading state
const oldPendingInvitationButtons = `<div className="flex items-center gap-2">
                              <span className="text-[10px] text-orange-500 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Pending</span>
                              <button 
                                onClick={() => handleCancelInvitation(inv.id)}
                                className="text-[var(--text-secondary)] hover:text-red-500 p-1 transition-colors"
                                title="Cancel Invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>`;

const newPendingInvitationButtons = `<div className="flex items-center gap-2">
                              <span className="text-[10px] text-orange-500 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Pending</span>
                              <button
                                onClick={() => handleResendInvitation(inv.id)}
                                disabled={resendingId === inv.id}
                                className="text-[var(--text-secondary)] hover:text-[var(--primary)] p-1 transition-colors disabled:opacity-50"
                                title="Resend Invitation"
                              >
                                <RotateCcw className={cn("w-3.5 h-3.5", resendingId === inv.id && "animate-spin text-[var(--primary)]")} />
                              </button>
                              <button 
                                onClick={() => handleCancelInvitation(inv.id)}
                                disabled={resendingId === inv.id}
                                className="text-[var(--text-secondary)] hover:text-red-500 p-1 transition-colors disabled:opacity-50"
                                title="Cancel Invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>`;

code = code.replace(oldPendingInvitationButtons, newPendingInvitationButtons);

fs.writeFileSync('src/components/SettingsView.tsx', code);
