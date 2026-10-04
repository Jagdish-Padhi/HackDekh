import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail, ArrowRight, RefreshCw, ArrowLeft } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import LogoTransition from '../components/LogoAnimation';

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

  // Verify token on mount if provided
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const res = await axiosInstance.post('/users/verify-email', { token });
        if (!isMounted) return;

        if (res.data?.success && res.data?.data) {
          const { accessToken, refreshToken, user } = res.data.data;
          if (accessToken) localStorage.setItem('accessToken', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          if (user) updateUser(user);

          setStatus('success');
          setMessage('Your email address has been verified successfully!');

          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2500);
        } else {
          setStatus('error');
          setMessage(res.data?.message || 'Verification link is invalid or expired.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or expired.');
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, navigate, updateUser]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex justify-center mb-6">
          <LogoTransition />
        </div>

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="text-center py-6">
            <RefreshCw className="w-12 h-12 text-primary-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
            <p className="text-slate-400 text-sm">
              Please wait while we validate your verification token.
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-slate-300 text-sm mb-6">{message}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Redirecting to your dashboard</span>
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-rose-300/90 text-sm bg-rose-950/40 border border-rose-900/50 rounded-lg p-3 mb-6">
              {message}
            </p>
            <button
              onClick={() => setStatus('resend')}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors text-sm mb-3"
            >
              Request a New Link
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        )}

        {/* Resend Form */}
        {status === 'resend' && (
          <div>
            <div className="w-14 h-14 bg-primary-500/10 border border-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-center text-white mb-1">
              Verify Your Email
            </h2>
            <p className="text-slate-400 text-center text-xs mb-6">
              Enter your registered email address to receive a new verification link.
            </p>

            {resendSuccess && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs text-center">
                {resendSuccess}
              </div>
            )}

            {message && (
              <div className="p-3 mb-4 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs text-center">
                {message}
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
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

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
