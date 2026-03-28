import { useEffect, useMemo, useState } from 'react';
import { teamApi } from '../services';
import type { Team, UserLite, GeneratedInvitationLink, TeamInvitation } from '../types';
import { Copy, Check, Mail, Users } from 'lucide-react';

const parseIds = (value: string) =>
  [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))];

const formatUser = (user: UserLite) => {
  const primary = user.fullName || user.username || user.email || user._id;
  return `${primary} (${user._id})`;
};

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamInvites, setNewTeamInvites] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [saving, setSaving] = useState(false);

  // New state for invitation links
  const [invitationEmail, setInvitationEmail] = useState('');
  const [generatedInvitation, setGeneratedInvitation] = useState<GeneratedInvitationLink | null>(null);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => team._id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const upsertTeam = (updatedTeam: Team) => {
    setTeams((previous) => {
      const exists = previous.some((team) => team._id === updatedTeam._id);
      if (!exists) {
        return [updatedTeam, ...previous];
      }
      return previous.map((team) => (team._id === updatedTeam._id ? updatedTeam : team));
    });
    setSelectedTeamId(updatedTeam._id);
    setEditTeamName(updatedTeam.name);
  };

  useEffect(() => {
    let isMounted = true;

    const loadTeams = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await teamApi.getUserTeams();
        if (!isMounted) {
          return;
        }

        setTeams(data);
        if (data.length) {
          setSelectedTeamId(data[0]._id);
          setEditTeamName(data[0].name);
        }
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setError(err?.response?.data?.message || 'Failed to load teams');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTeams();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load invitations when team is selected
  useEffect(() => {
    if (!selectedTeamId) return;

    let isMounted = true;

    const loadInvitations = async () => {
      try {
        setLoadingInvitations(true);
        const invitations = await teamApi.getTeamInvitations(selectedTeamId);
        if (isMounted) {
          setTeamInvitations(invitations);
          setGeneratedInvitation(null);
        }
      } catch (err: any) {
        if (isMounted) {
          // Silently fail for now, show error in section
        }
      } finally {
        if (isMounted) {
          setLoadingInvitations(false);
        }
      }
    };

    loadInvitations();
    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  const handleCreateTeam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const createdTeam = await teamApi.createTeam({
        name: newTeamName.trim(),
        invites: parseIds(newTeamInvites),
      });
      upsertTeam(createdTeam);
      setNewTeamName('');
      setNewTeamInvites('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeam) {
      return;
    }
    if (!editTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const updated = await teamApi.updateTeam(selectedTeam._id, { name: editTeamName.trim() });
      upsertTeam(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInvites = async () => {
    if (!selectedTeam) {
      return;
    }
    const ids = parseIds(inviteInput);
    if (!ids.length) {
      setError('Enter at least one user ID for invite');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const updated = await teamApi.addInvites(selectedTeam._id, ids);
      upsertTeam(updated);
      setInviteInput('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add invites');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedTeam) {
      return;
    }
    const ids = parseIds(memberInput);
    if (!ids.length) {
      setError('Enter at least one user ID to add member');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const updated = await teamApi.addMembers(selectedTeam._id, ids);
      upsertTeam(updated);
      setMemberInput('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveInvite = async (userId: string) => {
    if (!selectedTeam) {
      return;
    }
    try {
      setSaving(true);
      setError('');
      const updated = await teamApi.removeInvite(selectedTeam._id, userId);
      upsertTeam(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to remove invite');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) {
      return;
    }
    try {
      setSaving(true);
      setError('');
      const updated = await teamApi.removeMember(selectedTeam._id, userId);
      upsertTeam(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvitationLink = async () => {
    if (!selectedTeam) {
      return;
    }
    if (!invitationEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const generated = await teamApi.generateInvitationLink(selectedTeam._id, invitationEmail.trim());
      setGeneratedInvitation(generated);
      setInvitationEmail('');
      // Refresh invitations list
      const invitations = await teamApi.getTeamInvitations(selectedTeam._id);
      setTeamInvitations(invitations);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate invitation link');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async (link: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const formatExpiryDate = (date: string) => {
    const expiryDate = new Date(date);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <section className="space-y-6 pb-8">
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Team Management</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create teams, add invites, and move invited users into active members.
        </p>

        <form onSubmit={handleCreateTeam} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            value={newTeamName}
            onChange={(event) => setNewTeamName(event.target.value)}
            placeholder="Team name"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <input
            type="text"
            value={newTeamInvites}
            onChange={(event) => setNewTeamInvites(event.target.value)}
            placeholder="Invite user IDs (comma separated)"
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border border-blue-500/35 bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Create Team
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-zinc-200/90 bg-white p-8 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/85 dark:text-zinc-400">
          Loading teams...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Your Teams</h2>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team._id}
                  type="button"
                  onClick={() => {
                    setSelectedTeamId(team._id);
                    setEditTeamName(team.name);
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${team._id === selectedTeamId
                    ? 'border-blue-500/40 bg-blue-500/10 text-zinc-900 dark:text-zinc-100'
                    : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                >
                  <p className="font-semibold">{team.name}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{team.members.length} members • {team.invites.length} invites</p>
                </button>
              ))}
              {!teams.length && (
                <p className="rounded-2xl border border-zinc-200 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No teams yet. Create your first team above.
                </p>
              )}
            </div>
          </aside>

          <main className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85">
            {!selectedTeam ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Select a team to manage details.</p>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleRename} className="space-y-2">
                  <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Team Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editTeamName}
                      onChange={(event) => setEditTeamName(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button type="submit" disabled={saving} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">
                      Rename
                    </button>
                  </div>
                </form>

                {/* New Invitation Link Section */}
                <div className="rounded-2xl border border-blue-200/50 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
                  <div className="mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Generate Invitation Link</h3>
                  </div>
                  <p className="mb-3 text-xs text-blue-800 dark:text-blue-200">
                    Share personalized invitation links with team members via email or messaging.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={invitationEmail}
                      onChange={(event) => setInvitationEmail(event.target.value)}
                      placeholder="member@example.com"
                      className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-blue-400/60 dark:border-blue-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateInvitationLink}
                      disabled={saving}
                      className="rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Generate
                    </button>
                  </div>

                  {/* Display generated invitation link */}
                  {generatedInvitation && (
                    <div className="mt-3 rounded-xl border border-blue-300/60 bg-white p-3 dark:border-blue-800/60 dark:bg-zinc-900">
                      <p className="mb-2 text-xs font-medium text-blue-700 dark:text-blue-300">✓ Invitation link generated</p>
                      <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-2 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <span className="truncate">{generatedInvitation.invitationLink}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(generatedInvitation.invitationLink, generatedInvitation._id)}
                          className="flex-shrink-0 rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition"
                        >
                          {copiedLinkId === generatedInvitation._id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                        {formatExpiryDate(generatedInvitation.expiresAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pending Invitations List */}
                {loadingInvitations ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    Loading invitations...
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Pending Invitations
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {teamInvitations.filter(inv => inv.status === 'pending').length === 0 ? (
                        <p className="rounded-xl border border-zinc-200 px-3 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          No pending invitations.
                        </p>
                      ) : (
                        teamInvitations
                          .filter(inv => inv.status === 'pending')
                          .map((invitation) => (
                            <div
                              key={invitation._id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/40 bg-amber-50/30 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-900/20"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-amber-900 dark:text-amber-100">{invitation.invitedEmail}</p>
                                <p className="text-xs text-amber-700 dark:text-amber-200">
                                  {formatExpiryDate(invitation.expiresAt)}
                                </p>
                              </div>
                              <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                                Pending
                              </span>
                            </div>
                          ))
                      )}
                    </div>

                    {/* Accepted Invitations */}
                    {teamInvitations.filter(inv => inv.status === 'accepted').length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          Accepted
                        </p>
                        <div className="space-y-2">
                          {teamInvitations
                            .filter(inv => inv.status === 'accepted')
                            .map((invitation) => (
                              <div
                                key={invitation._id}
                                className="flex items-center justify-between rounded-xl border border-green-200/40 bg-green-50/30 px-3 py-2 text-sm dark:border-green-900/40 dark:bg-green-900/20"
                              >
                                <div>
                                  <p className="font-medium text-green-900 dark:text-green-100">{invitation.invitedEmail}</p>
                                  <p className="text-xs text-green-700 dark:text-green-200">
                                    Accepted {new Date(invitation.acceptedAt!).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Add Invites (user IDs)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteInput}
                        onChange={(event) => setInviteInput(event.target.value)}
                        placeholder="id1,id2"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <button type="button" onClick={handleAddInvites} disabled={saving} className="rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Add Members (user IDs)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={memberInput}
                        onChange={(event) => setMemberInput(event.target.value)}
                        placeholder="id1,id2"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <button type="button" onClick={handleAddMembers} disabled={saving} className="rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Members</h3>
                    <div className="space-y-2">
                      {selectedTeam.members.map((member) => {
                        const isOwner = member._id === selectedTeam.owner._id;
                        return (
                          <div key={member._id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                            <span>{formatUser(member)}{isOwner ? ' • Owner' : ''}</span>
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member._id)}
                                disabled={saving}
                                className="text-xs font-semibold text-red-600 dark:text-red-300"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Invites</h3>
                    <div className="space-y-2">
                      {selectedTeam.invites.map((invite) => (
                        <div key={invite._id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                          <span>{formatUser(invite)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveInvite(invite._id)}
                            disabled={saving}
                            className="text-xs font-semibold text-red-600 dark:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      {!selectedTeam.invites.length && (
                        <p className="rounded-xl border border-zinc-200 px-3 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          No pending invites.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </section>
  );
};

export default TeamsPage;
