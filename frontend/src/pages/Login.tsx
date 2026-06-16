import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Eye, EyeOff, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LogoTransition from '../components/LogoAnimation';
import axiosInstance from '../utils/axiosInstance';
import ProductStoryAnimation from '../components/productStory/ProductStoryAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import DarkModeToggle from '../components/DarkModeToggle';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();

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
  const [transitioning, setTransitioning] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [apiCompleted, setApiCompleted] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);

  const returnTo = useMemo(() => searchParams.get('returnTo') || '/', [searchParams]);

  // Sync mode with route changes
  useEffect(() => {
    const isSignup = location.pathname === '/signup';
    setIsLogin(!isSignup);
    setDirection(isSignup ? 1 : -1);
    setError('');
    setSuccessMessage('');
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !transitioning && !loading) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo, transitioning, loading]);

  // Sync animation + API parallel completions for seamless page landing
  useEffect(() => {
    if (apiCompleted && animationCompleted) {
      if (pendingDestination === 'login-mode') {
        setTransitioning(false);
        setPendingDestination(null);
        setIsLogin(true);
        setDirection(-1);
        setSuccessMessage('Account created successfully! Please sign in.');
        setLoading(false);
        setApiCompleted(false);
        setAnimationCompleted(false);
        navigate('/login', { replace: true });
      } else {
        const destination = pendingDestination || returnTo;
        setTransitioning(false);
        setPendingDestination(null);
        setLoading(false);
        setApiCompleted(false);
        setAnimationCompleted(false);
        navigate(destination, { replace: true });
      }
    }
  }, [apiCompleted, animationCompleted, pendingDestination, returnTo, navigate]);

  // Auto-focus first empty field on mode toggling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLogin) {
        emailRef.current?.focus();
      } else {
        usernameRef.current?.focus();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isLogin]);

  const handleForgotPassword = () => {
    setError('');
    setSuccessMessage('');
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setSuccessMessage(`A password reset link has been sent to ${email} (mocked).`);
  };

  const handleGoogleLogin = () => {
    setError('');
    setSuccessMessage('Google authentication process initialized (mocked).');
  };

  const handleGithubLogin = () => {
    setError('');
    setSuccessMessage('');
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'mock_client_id';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/github/callback');
    
    if (clientId === 'mock_client_id') {
      setSuccessMessage('Mock GitHub login initialized. Redirecting...');
      setTimeout(() => {
        navigate(`/auth/github/callback?code=mock_code_dev_${Math.floor(Math.random() * 1000)}`);
      }, 800);
    } else {
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    }
  };

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden px-4 py-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="relative w-full max-w-md rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/85 sm:p-8">
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

  if (isAuthenticated && !transitioning) {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    setApiCompleted(false);
    setAnimationCompleted(false);

    if (isLogin) {
      setPendingDestination(returnTo);
      setTransitioning(true);
      try {
        await login(email, password);
        setApiCompleted(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Login failed');
        setLoading(false);
        setTransitioning(false);
        setPendingDestination(null);
      }
    } else {
      setPendingDestination('login-mode');
      setTransitioning(true);
      try {
        await axiosInstance.post('/users/register', {
          username,
          email,
          fullName,
          password,
        });
        setApiCompleted(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Signup failed');
        setLoading(false);
        setTransitioning(false);
        setPendingDestination(null);
      }
    }
  };

  const handleTransitionComplete = () => {
    setAnimationCompleted(true);
  };

  const handleToggleMode = (targetLogin: boolean) => {
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setDirection(targetLogin ? -1 : 1);
    setIsLogin(targetLogin);
    navigate(targetLogin ? `/login?returnTo=${encodeURIComponent(returnTo)}` : `/signup?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex items-center justify-center p-4 bg-gradient-to-tr from-slate-100 via-sky-50 to-blue-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      
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

      {/* Success Redirect Transitions */}
      {transitioning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl">
          <LogoTransition width={550} height={330} onComplete={handleTransitionComplete} />
          <div className="text-center mt-6 flex flex-col items-center gap-2">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">
              {apiCompleted 
                ? (pendingDestination === 'login-mode' ? 'Account Created' : "You're signed in")
                : (isLogin ? 'Authenticating' : 'Creating Account')
              }
            </p>
            <div className="flex items-center gap-2 mt-1.5 justify-center">
              <p className="text-sm font-medium text-zinc-650 dark:text-zinc-400">
                {apiCompleted
                  ? (pendingDestination === 'login-mode' ? 'Taking you to sign in…' : 'Preparing your workspace…')
                  : (isLogin ? 'Verifying secure credentials…' : 'Setting up your profile…')
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Centered Auth Modal Card */}
      <div className="relative w-full max-w-6xl h-[90vh] max-h-[640px] rounded-[2.5rem] overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shadow-[0_32px_96px_-24px_rgba(15,23,42,0.22)] dark:shadow-[0_32px_96px_-24px_rgba(0,0,0,0.55)] flex flex-col lg:flex-row">
        
        {/* Left side: Premium theme-aware marketing panel (Product Story Only) */}
        <div className="hidden lg:flex lg:w-[48%] relative bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-white flex-col items-center justify-center p-8 xl:p-10 overflow-hidden border-r border-zinc-200/60 dark:border-zinc-800/20 gap-8">
          {/* Ambient Glows - theme adaptive opacity */}
          <div className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-500/6 dark:bg-blue-600/12 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-500/6 dark:bg-indigo-600/12 blur-[120px]" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-sky-500/4 dark:bg-sky-500/8 blur-[130px]" />

          {/* Centered Logo Branding Header */}
          <div className="w-full relative z-10 flex flex-col items-center justify-center gap-2">
            <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-10 w-10 rounded-2xl object-contain shadow-lg border border-zinc-200/50 dark:border-white/10" />
            <div className="flex items-center">
              <span className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white font-logo">HackDekh</span>
            </div>
          </div>

          {/* Product Story Animation Display - Direct layout, no nested border container */}
          <div className="relative z-10 w-full max-w-[420px] mx-auto flex items-center justify-center">
            <ProductStoryAnimation />
          </div>
        </div>

        {/* Right side: White/zinc form panel */}
        <div className="w-full lg:w-[52%] bg-white dark:bg-zinc-900 flex flex-col justify-center p-6 sm:px-10 sm:py-8 lg:px-8 lg:py-6 xl:px-10 xl:py-8 overflow-hidden relative">
          <div className="mx-auto w-full max-w-[390px]">
            
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: direction === 1 ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction === 1 ? -50 : 50 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="w-full"
              >
                {/* Form header */}
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shadow-xs animate-pulse-blink mb-2">
                    100% Free • Built for us! ❤️
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
                    {isLogin ? 'Welcome back' : 'Create free account'}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                    {isLogin 
                      ? 'Sign in to your HackDekh dashboard workspace'
                      : 'Join now to start managing your hackathon lifecycle'}
                  </p>
                </div>

                {/* Feedback banners */}
                {error && (
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/8 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="mt-3 rounded-xl border border-green-500/25 bg-green-500/8 px-3.5 py-2 text-xs font-semibold text-green-600 dark:text-green-400">
                    {successMessage}
                  </div>
                )}

                {/* Form elements */}
                <form onSubmit={handleSubmit} className={`mt-4 ${isLogin ? 'space-y-3.5' : 'space-y-2'}`}>
                  {!isLogin && (
                    <>
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Username</label>
                        <input
                          type="text"
                          ref={usernameRef}
                          placeholder="dev_runner"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Full Name</label>
                        <input
                          type="text"
                          placeholder="Alex Johnson"
                          className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900 dark:focus:ring-blue-500/20"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      ref={emailRef}
                      placeholder="you@example.com"
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-sm font-bold text-white py-2.5 shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 mt-1.5 cursor-pointer"
                    disabled={loading || transitioning}
                  >
                    {loading || transitioning ? (
                      <>
                        <LogoTransition width={28} height={18} loop={true} />
                        Please wait...
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
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition duration-200 cursor-pointer"
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
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition duration-200 cursor-pointer"
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
                        className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => handleToggleMode(true)}
                        className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition"
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
    </div>
  );
};

export default LoginPage;
