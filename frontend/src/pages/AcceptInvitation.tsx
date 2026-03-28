import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Users, ShieldCheck, Clock3 } from 'lucide-react';
import { teamApi } from '../services';
import type { InvitationPreview, Team } from '../types';

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    const loadPreview = async () => {
      try {
        setLoading(true);
        setError('');
        const invitationPreview = await teamApi.getInvitationPreview(token);
        setPreview(invitationPreview);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load invitation. It may be expired or invalid.');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      return;
    }

    try {
      setAccepting(true);
      setError('');
      const acceptedTeam = await teamApi.acceptInvitationLink(token);
      setTeam(acceptedTeam);
      setAccepted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to accept invitation. Please login with invited email.');
    } finally {
      setAccepting(false);
    }
  };

  const formatExpiry = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  return (
    <section className="relative flex min-h-[76vh] items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.14),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(234,88,12,0.12),transparent_40%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        {loading ? (
          <div className="space-y-4 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading invitation details...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-medium">Invitation Error</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              onClick={() => navigate('/teams')}
              className="w-full rounded-full border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Back to Teams
            </button>
          </div>
        ) : accepted && team ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invitation Accepted!</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">You have successfully joined the team.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Team Details</p>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{team.name}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {team.members.length} members • Owner: {team.owner.fullName || team.owner.username}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/teams`)}
              className="w-full rounded-full border border-blue-500/35 bg-blue-600 px-4 py-3 text-sm font-semibold text-white dark:border-blue-400/40 dark:bg-blue-500"
            >
              Go to Teams
            </button>
          </div>
        ) : preview ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Team Invitation</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Review the details and accept your invitation.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-zinc-200/90 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Team</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{preview.team.name}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Owner</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {preview.team.owner.fullName || preview.team.owner.username || preview.team.owner.email}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Current Members</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{preview.team.memberCount} members</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Expires on {formatExpiry(preview.expiresAt)}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleAcceptInvitation}
              disabled={accepting || preview.status !== 'pending'}
              className="w-full rounded-full border border-blue-500/35 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400/40 dark:bg-blue-500"
            >
              {accepting ? 'Accepting Invitation...' : preview.status !== 'pending' ? `Invitation ${preview.status}` : 'Accept Invitation'}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AcceptInvitationPage;
