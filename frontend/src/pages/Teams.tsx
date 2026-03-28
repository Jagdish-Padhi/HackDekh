import { useEffect, useMemo, useState } from 'react';
import { teamApi } from '../services';
import type { Team, UserLite } from '../types';

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
