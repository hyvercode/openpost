const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

// Add useEffect
code = code.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';");

const stateVars = `  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'workspace' | 'team' | 'security' | 'proxy'>('profile');
  const [isSaving, setIsSaving] = useState(false);
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
`;

code = code.replace("  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'workspace' | 'team' | 'security' | 'proxy'>('profile');\n  const [isSaving, setIsSaving] = useState(false);", stateVars);

const handleInvite = `  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail) return;

    setIsSaving(true);
    try {
      await apiService.inviteMember(currentWorkspace.id, inviteEmail, 'MEMBER');
      addToast(\`Invitation email sent to \${inviteEmail}!\`, 'success');
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

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await apiService.cancelInvitation(invitationId);
      addToast('Invitation cancelled', 'success');
      loadTeam();
    } catch (error: any) {
      addToast(error.response?.data?.error || 'Failed to cancel invitation', 'error');
    }
  };
`;

const oldHandleInviteRegex = /  const handleInviteMember = async \(e: React\.FormEvent\) => \{[\s\S]*?  \};\n/m;
code = code.replace(oldHandleInviteRegex, handleInvite);

fs.writeFileSync('src/components/SettingsView.tsx', code);
