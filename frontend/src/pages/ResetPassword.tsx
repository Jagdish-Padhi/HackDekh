import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Lock, AlertTriangle, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

function getPasswordStrength(pw: string) {
  if (!pw) return { label: "", pct: 0, color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", pct: 20, color: "bg-rose-500" };
  if (score === 2) return { label: "Fair", pct: 45, color: "bg-amber-400" };
  if (score === 3) return { label: "Good", pct: 65, color: "bg-yellow-400" };
  if (score === 4) return { label: "Strong", pct: 82, color: "bg-emerald-500" };
  return { label: "Very Strong", pct: 100, color: "bg-emerald-600" };
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState<'form' | 'submitting' | 'success' | 'error'>(token ? 'form' : 'error');
  const [errorMessage, setErrorMessage] = useState(token ? '' : 'No password reset token was found in the link.');
  const [countdown, setCountdown] = useState(3);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  // Countdown timer on success
  useEffect(() => {
    if (status !== 'success') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setStatus('submitting');
    try {
      await axiosInstance.post('/users/reset-password', {
        token,
        newPassword,
      });
      setStatus('success');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Password reset link is invalid or has expired. Please request a new one.'
      );
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 dark:bg-black/85 backdrop-blur-2xl overflow-y-auto">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-gradient-to-b from-blue-600/20 via-indigo-500/10 to-transparent blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-gradient-to-t from-blue-600/15 via-sky-500/10 to-transparent blur-3xl rounded-full" />

      {/* Clean Modal Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px] rounded-xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-xl p-6 sm:p-7 text-center z-10"
      >
        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <img
            src="/BrandImages/HackDekh.png"
            alt="HackDekh Logo"
            className="h-10 w-10 rounded-full object-contain shrink-0 drop-shadow-md"
          />
          <span className="text-xl font-black tracking-tight font-logo flex items-center">
            <span className="text-zinc-900 dark:text-white">Hack</span>
            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Dekh
            </span>
          </span>
        </div>

        {/* 1. Form State */}
        {(status === 'form' || status === 'submitting') && (
          <div className="text-left">
            <h2 className="text-lg font-bold text-center text-zinc-900 dark:text-white mb-1">
              Choose New Password
            </h2>
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mb-5">
              Enter a secure password to update your HackDekh account.
            </p>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs text-center">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={status === 'submitting'}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-3.5 pr-10 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Strength</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    required
                    disabled={status === 'submitting'}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 pl-3.5 pr-10 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-brand-primary rounded-lg w-full py-2.5 px-4 text-sm font-semibold gap-2 mt-2 cursor-pointer"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                &larr; Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* 2. Success State */}
        {status === 'success' && (
          <div className="py-2">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-3.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white mb-1.5">
              Password Reset!
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
              Your password has been securely updated. You can now log in with your new credentials.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="btn-brand-primary rounded-lg w-full py-2.5 text-sm font-semibold gap-2 cursor-pointer"
            >
              <span>Sign In to Workspace ({countdown}s)</span>
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </button>
          </div>
        )}

        {/* 3. Error State */}
        {status === 'error' && (
          <div className="py-2">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center mx-auto mb-3.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1.5">
              Reset Link Invalid
            </h2>
            <div className="p-3 mb-5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
              {errorMessage || 'This password reset link is invalid or has expired.'}
            </div>

            <div className="space-y-3">
              <Link
                to="/login"
                className="btn-brand-primary rounded-lg w-full py-2.5 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Request a New Reset Link</span>
              </Link>
            </div>
          </div>
        )}

        {/* Footer Security Badge */}
        <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secured by HackDekh</span>
        </div>
      </motion.div>
    </div>
  );
}
