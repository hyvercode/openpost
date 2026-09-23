const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const oldMembersBlock = `{/* Mock Members */}
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
                      ))}`;

const newMembersBlock = `{isLoadingTeam ? (
                        <div className="text-sm text-[var(--text-secondary)] p-4 text-center">Loading team members...</div>
                      ) : (
                        <>
                          {members.filter(m => m.user?.uid !== user?.uid).map((member, i) => (
                            <div key={member.id || i} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-500 font-bold text-xs">
                                  {(member.user?.displayName || member.user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-sm font-medium">{member.user?.displayName || member.user?.email}</span>
                                  <span className="text-[10px] text-[var(--text-secondary)] block">{member.role}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveMember(member.user?.uid)}
                                className="text-[var(--text-secondary)] hover:text-red-500 p-1 transition-colors"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </>
                      )}`;

code = code.replace(oldMembersBlock, newMembersBlock);

const newInvitationsBlock = `
                    </div>
                  </div>

                  {invitations.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pending Invitations</h3>
                      <div className="space-y-2">
                        {invitations.map((inv, i) => (
                          <div key={inv.id || i} className="flex items-center justify-between p-3 bg-[var(--bg-hover)] rounded border border-[var(--border-subtle)]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-xs">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-sm font-medium">{inv.email}</span>
                                <span className="text-[10px] text-[var(--text-secondary)] block">Invited as {inv.role}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-orange-500 border border-orange-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">Pending</span>
                              <button 
                                onClick={() => handleCancelInvitation(inv.id)}
                                className="text-[var(--text-secondary)] hover:text-red-500 p-1 transition-colors"
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
`;

code = code.replace('                    </div>\n                  </div>\n                </div>\n              </div>\n            )}', newInvitationsBlock + '                </div>\n              </div>\n            )}');

fs.writeFileSync('src/components/SettingsView.tsx', code);
