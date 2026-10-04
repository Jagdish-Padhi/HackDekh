import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Github, Mail, ExternalLink, RefreshCw, X } from 'lucide-react';
import { signInWithGooglePopup } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import LogoTransition from '../components/LogoAnimation';
import axiosInstance from '../utils/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, isBackendWarming, updateUser } = useAuth();

  // Mode state: login or signup, synced with location path
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [direction, setDirection] = useState(location.pathname === '/signup' ? 1 : -1);

  // Input states
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Focus refs
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Status states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Email verification modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const returnTo = useMemo(() => searchParams.get('returnTo') || '/', [searchParams]);

  // Sync mode with route changes
  useEffect(() => {
    const isSignup = location.pathname === '/signup';
    setIsLogin(!isSignup);
    setDirection(isSignup ? 1 : -1);
    setError('');
    setSuccessMessage('');
  }, [location.pathname]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  // Auto-focus first empty field on mode toggling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLogin) {
        if (!email) {
          emailRef.current?.focus();
        }
      } else {
        if (!username) {
          usernameRef.current?.focus();
        } else if (!email) {
          emailRef.current?.focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isLogin]);

  // Google OAuth flow
  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const idToken = await signInWithGooglePopup();
      const response = await axiosInstance.post('/users/auth/google', { idToken });
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      updateUser(user);

      navigate(returnTo, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // GitHub OAuth flow
  const handleGithubLogin = () => {
    setError('');
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    if (!clientId) {
      setError('GitHub login is not configured. Missing VITE_GITHUB_CLIENT_ID.');
      return;
    }

    sessionStorage.setItem('oauth_return_to', returnTo);

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'read:user user:email';
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);

    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}&state=${state}`;
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isLogin) {
      setLoading(true);

      try {
        await login(email, password);
        navigate(returnTo, { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Login failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Direct registration submission with instant modal feedback
      setLoading(true);

      try {
        await axiosInstance.post('/users/register', {
          username,
          email,
          fullName,
          password,
        });
        setRegisteredEmail(email);
        setShowVerifyModal(true);
        setIsLogin(true);
        setLoading(false);
        setSuccessMessage('Account created! Please check your email to verify.');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Signup failed');
        setLoading(false);
      }
    }
  };

  // Resend verification link
  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await axiosInstance.post('/users/resend-verification', {
        email: registeredEmail,
      });
      setResendStatus({
        type: 'success',
        message: res.data?.message || 'Verification email sent! Check your inbox.',
      });
    } catch (err: any) {
      setResendStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to resend verification email.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleToggleMode = (targetLogin: boolean) => {
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setDirection(targetLogin ? -1 : 1);
    setIsLogin(targetLogin);
    navigate(targetLogin ? `/login?returnTo=${encodeURIComponent(returnTo)}` : `/signup?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
  };

  const handleForgotPassword = () => {
    setError('Password reset instructions will be sent if an account with that email exists.');
  };

  return (
    <div className="relative min-h-screen w-screen overflow-hidden flex items-center justify-center p-4 bg-transparent">
      
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

      {/* <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-45">
        <DarkModeToggle />
      </div> */}

      {/* Main Container */}
      <div className="relative w-full max-w-4xl min-h-[560px] sm:min-h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl flex flex-col md:flex-row z-10">
        
        {/* Left Brand Side */}
        <div className="hidden md:flex md:w-1/2 relative bg-zinc-950 flex-col items-center justify-center p-10 text-white overflow-hidden border-r border-zinc-800/80">
          {/* Subtle ambient glow */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/12 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/12 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-5 select-none">
            {/* Logo — larger */}
            <img
              src="/BrandImages/HackDekh.png"
              alt="HackDekh Logo"
              className="h-20 w-20 rounded-full object-contain drop-shadow-2xl"
            />

            {/* Brand Name */}
            <span className="text-3xl font-black tracking-tight font-logo flex items-center">
              <span className="text-white">Hack</span>
              <span className="bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">Dekh</span>
            </span>

            {/* Tagline lockup */}
            <div className="flex flex-col items-center gap-1 mt-4 text-center">
              <span className="text-[2.6rem] font-extrabold tracking-[-0.03em] leading-none text-white whitespace-nowrap">
                Let&apos;s Win
              </span>
              <span className="relative inline-block whitespace-nowrap pb-5">
                <span className="text-[2.6rem] font-extrabold tracking-[-0.03em] leading-none bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                  Together!
                </span>
                {/* Handwritten pen scribble underline — matches hero section style */}
                <svg
                  viewBox="0 0 200 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute -bottom-0.5 left-0 w-full overflow-visible pointer-events-none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M 2 6 C 38 3, 100 3, 198 5 C 148 8.5, 68 11, 14 13 C 70 12, 142 10, 192 11"
                    stroke="url(#authScribbleGrad)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <defs>
                    <linearGradient id="authScribbleGrad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="50%" stopColor="#7dd3fc" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-10 py-6 sm:py-8 relative overflow-y-auto bg-white/40 dark:bg-zinc-900/40">
          <div className="w-full max-w-sm mx-auto">
            
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* Header title */}
                <div className="mb-4 text-center">
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                    {isLogin ? 'Welcome back' : 'Create an account'}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {isLogin
                      ? 'Enter your credentials to access your workspace'
                      : 'Join HackDekh to discover and manage hackathons'}
                  </p>
                </div>

                {/* Feedback banners */}
                {error && (
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/8 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {successMessage && !showVerifyModal && (
                  <div className="mt-3 rounded-xl border border-green-500/25 bg-green-500/8 px-3.5 py-2 text-xs font-semibold text-green-600 dark:text-green-400">
                    {successMessage}
                  </div>
                )}

                {isBackendWarming && (
                  <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2.5 shadow-sm">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="font-semibold tracking-tight">
                      Backend is waking up (cold start)... Requests might take up to ~30s.
                    </span>
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleSubmit} className="mt-3.5 space-y-2.5">
                  {!isLogin && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Username</label>
                        <input
                          ref={usernameRef}
                          type="text"
                          placeholder="johndoe"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Full Name</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          autoComplete="name"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Email address</label>
                    <input
                      ref={emailRef}
                      type="email"
                      placeholder="you@domain.com"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div>
                    <div className="mb-0.5 flex items-center justify-between gap-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Password</label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-3.5 pr-10 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition focus:outline-none cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-brand-primary rounded-xl w-full py-3 text-sm gap-2 mt-2"
                    disabled={loading || isBackendWarming}
                  >
                    {loading || isBackendWarming ? (
                      <>
                        <LogoTransition width={28} height={18} loop={true} />
                        {isBackendWarming ? 'Waking up server...' : 'Please wait...'}
                      </>
                    ) : (
                      <>
                        {isLogin ? 'Sign In to Workspace' : 'Create Free Account'}
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <span className="relative bg-white dark:bg-zinc-900 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">OR</span>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading || isBackendWarming}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={handleGithubLogin}
                    disabled={loading || isBackendWarming}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Github className="h-4 w-4 shrink-0 text-zinc-900 dark:text-white" />
                    GitHub
                  </button>
                </div>

                {/* Footer toggle link */}
                <div className="mt-3.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  {isLogin ? (
                    <>
                      Don’t have an account?{' '}
                      <button
                        onClick={() => handleToggleMode(false)}
                        className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition cursor-pointer"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => handleToggleMode(true)}
                        className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition cursor-pointer"
                      >
                        Log in
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

          </div>
        </div>

      </div>

      {/* Verification Email Sent Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative text-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowVerifyModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Glowing Icon */}
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                <Mail className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                Check Your Email
              </h3>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                We sent a verification link to:
              </p>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg py-1.5 px-3 mb-4 inline-block break-all">
                {registeredEmail}
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                Click the confirmation link in the email to activate your account.
                <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                  Don&apos;t see it? Please check your Spam or Promotions folder!
                </span>
              </p>

              {resendStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs mb-4 ${
                    resendStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                  }`}
                >
                  {resendStatus.message}
                </div>
              )}

              <div className="space-y-2.5">
                {registeredEmail.includes('@gmail.com') ? (
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-brand-primary rounded-xl w-full py-3 text-sm gap-2"
                  >
                    Open Gmail
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium transition disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Verification Link'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 pt-2 transition cursor-pointer"
                >
                  Proceed to Sign In
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LoginPage;
