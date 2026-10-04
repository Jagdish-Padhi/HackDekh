import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail, ArrowRight, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from '../components/DarkModeToggle';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'resend'>(
    token ? 'verifying' : 'resend'
  );
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Guard ref to ensure token verification runs strictly once
  const verificationRequested = useRef(false);

  useEffect(() => {
    if (!token || verificationRequested.current) return;
    verificationRequested.current = true;

    const verifyToken = async () => {
      try {
        const res = await axiosInstance.post('/users/verify-email', { token });

        if (res.data?.success && res.data?.data) {
          const { accessToken, refreshToken, user } = res.data.data;
          if (accessToken) localStorage.setItem('accessToken', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          if (user) updateUser(user);

          setStatus('success');
          setMessage('Your email address has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(res.data?.message || 'Verification link is invalid or has expired.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or has expired.');
      }
    };

    verifyToken();
  }, [token, updateUser]);

  // Countdown timer on successful verification
  useEffect(() => {
    if (status !== 'success') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/dashboard', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, navigate]);

  // Request new verification link
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    setResendSuccess('');
    setMessage('');

    try {
      const res = await axiosInstance.post('/users/resend-verification', {
        email: resendEmail,
      });
      setResendSuccess(res.data?.message || 'Verification link sent! Check your inbox.');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen overflow-hidden flex items-center justify-center p-4 bg-gradient-to-tr from-slate-100 via-sky-50 to-blue-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      
      {/* Absolute Header Controls */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-45">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition duration-200"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-45">
        <DarkModeToggle />
      </div>

      {/* Verification Card */}
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 sm:p-10 z-10 text-center">
        
        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-10 w-10 rounded-xl object-contain" />
          <span className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 font-logo">
            HackDekh
          </span>
        </div>

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="py-4">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Verifying Your Email
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Please hold on while we validate your confirmation link...
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="py-2">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">
              Email Verified!
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {message}
            </p>

            <button
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 text-sm shadow-md shadow-blue-500/25 transition cursor-pointer"
            >
              <span>Go to Dashboard ({countdown}s)</span>
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="py-2">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
              <XCircle className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              Verification Failed
            </h2>
            
            <div className="p-3 mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
              {message}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStatus('resend')}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-md shadow-blue-500/25 cursor-pointer"
              >
                Request a New Link
              </button>
              
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Resend Form State */}
        {status === 'resend' && (
          <div className="py-2">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
              Verify Your Email
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              Enter your account email to receive a fresh verification link.
            </p>

            {resendSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs">
                {resendSuccess}
              </div>
            )}

            {message && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs">
                {message}
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-3">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20 transition"
              />

              <button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Link'
                )}
              </button>
            </form>

            <div className="mt-5">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="mt-6 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secured by HackDekh Authentication</span>
        </div>

      </div>
    </div>
  );
}
