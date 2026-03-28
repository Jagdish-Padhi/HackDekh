import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { teamApi } from '../services';
import type { Team } from '../types';

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [team, setTeam] = useState<Team | null>(null);
  const [accepted, setAccepted] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    const acceptInvitation = async () => {
      try {
        setLoading(true);
        setError('');
        const acceptedTeam = await teamApi.acceptInvitationLink(token);
        setTeam(acceptedTeam);
        setAccepted(true);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to accept invitation. It may be expired or invalid.');
      } finally {
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [token]);

  return (
    <section className="flex min-h-[76vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/90 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85">
        {loading ? (
          <div className="space-y-4 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Processing your invitation...</p>
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
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invitation Accepted!</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">You've successfully joined the team</p>
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
        ) : null}
      </div>
    </section>
  );
};

export default AcceptInvitationPage;
