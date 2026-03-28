import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ShieldCheck, Users } from 'lucide-react';
import { teamApi } from '../services';
import type { InvitationPreview, Team } from '../types';

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [redirectingToAuth, setRedirectingToAuth] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);
  const [error, setError] = useState('');

  const returnTo = useMemo(() => `/accept-invitation?token=${token || ''}`, [token]);

  const getAuthUrl = (path: '/login' | '/signup') => {
    const email = preview?.invitedEmail || '';
    return `${path}?returnTo=${encodeURIComponent(returnTo)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
  };

  const formatExpiry = (date: string) => new Date(date).toLocaleString();

  const acceptInvitation = async () => {
    if (!token || accepting || accepted) {
      return;
    }

    try {
      setAccepting(true);
      setError('');
      const acceptedTeam = await teamApi.acceptInvitationLink(token);
      setTeam(acceptedTeam);
      setAccepted(true);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setRedirectingToAuth(true);
        window.location.href = getAuthUrl('/login');
        return;
      }
      if (err?.response?.status === 400 && preview?.status === 'pending') {
        setError(
          `This invitation is for ${preview.invitedEmail}. Please login with this email to accept.`
        );
      } else {
        setError(err?.response?.data?.message || 'Unable to accept invitation. Please try again.');
      }
    } finally {
      setAccepting(false);
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = getAuthUrl('/login');
  };

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoadingPreview(false);
      return;
    }

    const loadPreview = async () => {
      try {
        setLoadingPreview(true);
        setError('');
        const invitationPreview = await teamApi.getInvitationPreview(token);
        setPreview(invitationPreview);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load invitation. It may be expired or invalid.');
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreview();
  }, [token]);

  useEffect(() => {
    if (!preview || preview.status !== 'pending' || accepted || accepting || autoAttempted) {
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      setRedirectingToAuth(true);
      window.location.href = getAuthUrl('/login');
      return;
    }

    setAutoAttempted(true);
    acceptInvitation();
  }, [preview, accepted, accepting, autoAttempted]);

  useEffect(() => {
    if (!accepted) {
      return;
    }

    const timer = window.setTimeout(() => {
      navigate('/teams');
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [accepted, navigate]);

  const showBusyState = loadingPreview || accepting || redirectingToAuth;

  return (
    <section className="relative flex min-h-[76vh] items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.14),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(234,88,12,0.12),transparent_40%)]" />

      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        {showBusyState ? (
          <div className="space-y-4 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {redirectingToAuth ? 'Redirecting to login...' : accepting ? 'Accepting invitation...' : 'Loading invitation details...'}
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-medium">Invitation Error</p>
              <p className="mt-1">{error}</p>
            </div>

            {preview?.status === 'pending' && (
              <div className="space-y-2">
                <button
                  onClick={acceptInvitation}
                  className="w-full rounded-full border border-blue-500/35 bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Try Again
                </button>
                <button
                  onClick={handleSwitchAccount}
                  className="w-full rounded-full border border-indigo-400/40 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 dark:bg-zinc-900 dark:text-indigo-300"
                >
                  Switch Account
                </button>
              </div>
            )}

            <button
              onClick={() => navigate('/teams')}
              className="w-full rounded-full border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Back to Teams
            </button>
          </div>
        ) : accepted && team ? (
          <div className="space-y-6 text-center">
            <div className="relative mx-auto h-20 w-20">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-400/25" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invitation Accepted!</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                You joined <span className="font-semibold">{team.name}</span>. Redirecting to Teams...
              </p>
            </div>

            <button
              onClick={() => navigate('/teams')}
              className="w-full rounded-full border border-blue-500/35 bg-blue-600 px-4 py-3 text-sm font-semibold text-white dark:border-blue-400/40 dark:bg-blue-500"
            >
              Go to Teams Now
            </button>
          </div>
        ) : preview ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invitation Status</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">This invitation is no longer pending.</p>
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
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Expires on {formatExpiry(preview.expiresAt)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={getAuthUrl('/login')}
                className="rounded-full border border-blue-500/35 bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Login
              </a>
              <button
                onClick={() => navigate('/teams')}
                className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-center text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Back to Teams
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AcceptInvitationPage;
