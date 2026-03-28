import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { teamApi } from '../services';
import type { GeneratedInvitationLink, Team, TeamInvitation, UserLite } from '../types';

const formatUser = (user: UserLite) => {
  const primary = user.fullName || user.username || user.email || user._id;
  return `${primary}`;
};

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newTeamName, setNewTeamName] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');

  const [generatedInvitation, setGeneratedInvitation] = useState<GeneratedInvitationLink | null>(null);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareMessage, setShareMessage] = useState('');

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

  useEffect(() => {
    if (!selectedTeamId) {
      return;
    }

    let isMounted = true;

    const loadInvitations = async () => {
      try {
        setLoadingInvitations(true);
        const invitations = await teamApi.getTeamInvitations(selectedTeamId);
        if (isMounted) {
          setTeamInvitations(invitations);
          setGeneratedInvitation(null);
        }
      } catch {
        if (isMounted) {
          setTeamInvitations([]);
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
      const createdTeam = await teamApi.createTeam({ name: newTeamName.trim() });
      upsertTeam(createdTeam);
      setNewTeamName('');
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

  const buildShareMessage = (teamName: string, link: string) => {
    return `Join my team "${teamName}" on HackDekh: ${link}`;
  };

  const refreshInvitations = async (teamId: string) => {
    const invitations = await teamApi.getTeamInvitations(teamId);
    setTeamInvitations(invitations);
  };

  const generateInviteForEmail = async () => {
    if (!selectedTeam) {
      return null;
    }

    if (!invitationEmail.trim()) {
      setError('Enter member email to send invitation');
      return null;
    }

    const generated = await teamApi.generateInvitationLink(selectedTeam._id, invitationEmail.trim());
    setGeneratedInvitation(generated);
    setShareLink(generated.invitationLink);
    setShareMessage(buildShareMessage(selectedTeam.name, generated.invitationLink));
    await refreshInvitations(selectedTeam._id);
    return generated;
  };

  const handleSendInviteEmail = async () => {
    try {
      setSaving(true);
      setError('');
      await generateInviteForEmail();
      setInvitationEmail('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send invitation email');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenShareOptions = async () => {
    try {
      setSaving(true);
      setError('');
      const generated = await generateInviteForEmail();
      if (generated) {
        setIsShareModalOpen(true);
      }
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
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const openShareUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSharePlatform = async (platform: 'whatsapp' | 'sms' | 'email' | 'facebook' | 'instagram' | 'native') => {
    if (!shareLink || !shareMessage) {
      return;
    }

    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedLink = encodeURIComponent(shareLink);

    if (platform === 'whatsapp') {
      openShareUrl(`https://wa.me/?text=${encodedMessage}`);
      return;
    }

    if (platform === 'sms') {
      openShareUrl(`sms:?&body=${encodedMessage}`);
      return;
    }

    if (platform === 'email') {
      openShareUrl(`mailto:?subject=${encodeURIComponent('Team invitation on HackDekh')}&body=${encodedMessage}`);
      return;
    }

    if (platform === 'facebook') {
      openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`);
      return;
    }

    if (platform === 'instagram') {
      await navigator.clipboard.writeText(shareMessage);
      openShareUrl('https://www.instagram.com/');
      setCopiedLinkId('instagram-copied');
      setTimeout(() => setCopiedLinkId(null), 2000);
      return;
    }

    if (platform === 'native' && navigator.share) {
      await navigator.share({
        title: 'Team Invitation',
        text: shareMessage,
        url: shareLink,
      });
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
          Invite by email, share invite links, and manage your team in one place.
        </p>

        <form onSubmit={handleCreateTeam} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={newTeamName}
            onChange={(event) => setNewTeamName(event.target.value)}
            placeholder="Team name"
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
                  className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                    team._id === selectedTeamId
                      ? 'border-blue-500/40 bg-blue-500/10 text-zinc-900 dark:text-zinc-100'
                      : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  <p className="font-semibold">{team.name}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{team.members.length} members</p>
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
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
                    >
                      Rename
                    </button>
                  </div>
                </form>

                <div className="rounded-2xl border border-blue-200/50 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
                  <div className="mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Invite Member</h3>
                  </div>
                  <p className="mb-3 text-xs text-blue-800 dark:text-blue-200">
                    Enter member email. We send a professional invite email with secure acceptance link.
                  </p>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                    <input
                      type="email"
                      value={invitationEmail}
                      onChange={(event) => setInvitationEmail(event.target.value)}
                      placeholder="member@example.com"
                      className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-blue-400/60 dark:border-blue-800 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={handleSendInviteEmail}
                      disabled={saving}
                      className="rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Send Invite
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenShareOptions}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <Share2 className="h-4 w-4" />
                      Invite
                    </button>
                  </div>

                  {generatedInvitation && (
                    <div className="mt-3 rounded-xl border border-blue-300/60 bg-white p-3 dark:border-blue-800/60 dark:bg-zinc-900">
                      <p className="mb-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                        Invitation link ready for {generatedInvitation.invitedEmail}
                      </p>
                      <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-2 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <span className="truncate">{generatedInvitation.invitationLink}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(generatedInvitation.invitationLink, generatedInvitation._id)}
                          className="flex-shrink-0 rounded-lg bg-blue-600 p-1.5 text-white transition hover:bg-blue-700"
                        >
                          {copiedLinkId === generatedInvitation._id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">{formatExpiryDate(generatedInvitation.expiresAt)}</p>
                    </div>
                  )}
                </div>

                {loadingInvitations ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    Loading invitations...
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Invitation Status
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {teamInvitations.filter((inv) => inv.status === 'pending').length === 0 ? (
                        <p className="rounded-xl border border-zinc-200 px-3 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          No pending invitations.
                        </p>
                      ) : (
                        teamInvitations
                          .filter((inv) => inv.status === 'pending')
                          .map((invitation) => (
                            <div
                              key={invitation._id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/40 bg-amber-50/30 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-900/20"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-amber-900 dark:text-amber-100">{invitation.invitedEmail}</p>
                                <p className="text-xs text-amber-700 dark:text-amber-200">{formatExpiryDate(invitation.expiresAt)}</p>
                              </div>
                              <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                                Pending
                              </span>
                            </div>
                          ))
                      )}
                    </div>

                    {teamInvitations.filter((inv) => inv.status === 'accepted').length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Accepted</p>
                        <div className="space-y-2">
                          {teamInvitations
                            .filter((inv) => inv.status === 'accepted')
                            .map((invitation) => (
                              <div
                                key={invitation._id}
                                className="flex items-center justify-between rounded-xl border border-green-200/40 bg-green-50/30 px-3 py-2 text-sm dark:border-green-900/40 dark:bg-green-900/20"
                              >
                                <div>
                                  <p className="font-medium text-green-900 dark:text-green-100">{invitation.invitedEmail}</p>
                                  <p className="text-xs text-green-700 dark:text-green-200">
                                    Accepted {invitation.acceptedAt ? new Date(invitation.acceptedAt).toLocaleDateString() : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Members</h3>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => {
                      const isOwner = member._id === selectedTeam.owner._id;
                      return (
                        <div
                          key={member._id}
                          className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                        >
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
              </div>
            )}
          </main>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Share Invitation</h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="rounded-full border border-zinc-300 p-2 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">Choose a platform to send the invitation link.</p>

            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => handleSharePlatform('whatsapp')} className="rounded-2xl border border-zinc-200 p-3 text-center text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <MessageCircle className="mx-auto mb-1 h-5 w-5" />WhatsApp
              </button>
              <button type="button" onClick={() => handleSharePlatform('sms')} className="rounded-2xl border border-zinc-200 p-3 text-center text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <MessageCircle className="mx-auto mb-1 h-5 w-5" />SMS
              </button>
              <button type="button" onClick={() => handleSharePlatform('email')} className="rounded-2xl border border-zinc-200 p-3 text-center text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <Mail className="mx-auto mb-1 h-5 w-5" />Email
              </button>
              <button type="button" onClick={() => handleSharePlatform('facebook')} className="rounded-2xl border border-zinc-200 p-3 text-center text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <Facebook className="mx-auto mb-1 h-5 w-5" />Facebook
              </button>
              <button type="button" onClick={() => handleSharePlatform('instagram')} className="rounded-2xl border border-zinc-200 p-3 text-center text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <Instagram className="mx-auto mb-1 h-5 w-5" />Instagram
              </button>
              <button
                type="button"
                onClick={() => generatedInvitation && handleCopyLink(generatedInvitation.invitationLink, generatedInvitation._id)}
                className="rounded-2xl border border-zinc-200 p-3 text-center text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <Copy className="mx-auto mb-1 h-5 w-5" />Copy
              </button>
            </div>

            {'share' in navigator && (
              <button
                type="button"
                onClick={() => handleSharePlatform('native')}
                className="mt-3 w-full rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Share via Device
              </button>
            )}

            {copiedLinkId === 'instagram-copied' && (
              <p className="mt-3 rounded-xl border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                Message copied. Paste it in Instagram DM.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default TeamsPage;
