import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const returnTo = useMemo(() => searchParams.get('returnTo') || '/', [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  if (isLoading) {
    return (
      <div className="relative flex min-h-[78vh] items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,0.92))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,_rgba(9,9,11,1),_rgba(24,24,27,0.96))]" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.26)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Restoring your session</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking secure access…</p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full w-3/5 animate-pulse rounded-full bg-linear-to-r from-blue-600 via-cyan-500 to-blue-400" />
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_28%),radial-gradient(circle_at_right,_rgba(14,165,233,0.10),_transparent_26%),linear-gradient(180deg,_rgba(248,250,252,1),_rgba(241,245,249,0.94))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,_rgba(9,9,11,1),_rgba(24,24,27,0.96))]" />
      <div className="relative mx-auto grid min-h-[78vh] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <section className="rounded-[2.25rem] border border-zinc-200/80 bg-white/80 p-8 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75 sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/8 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Secure platform access
          </div>

          <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Sign in to keep your hackathon workflow moving.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Return to your dashboard, saved hackathons, teams, and submission flow without breaking context.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              'One session across dashboard, teams, and tracker',
              'Secure token-based sign-in with return path support',
              'Fast recovery after refresh or route changes',
              'Built for a clean, product-grade experience',
            ].map(feature => (
              <div key={feature} className="flex items-start gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">{feature}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Designed for continuity</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">We preserve your return destination after login and after refresh.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative rounded-[2.25rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/82 sm:p-8 lg:p-10">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Welcome back</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Login</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Access your dashboard, saved work, and the next action you were heading toward.
              </p>
            </div>
            <div className="hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-right dark:border-zinc-800 dark:bg-zinc-900/70 sm:block">
              <p className="text-[0.7rem] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">Return to</p>
              <p className="mt-1 max-w-32 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{returnTo}</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
              <input
                type="email"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
                <button type="button" className="text-sm font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-500/35 bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:shadow-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don’t have an account?{' '}
            <Link
              to={`/signup?returnTo=${encodeURIComponent(returnTo)}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
              className="font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
