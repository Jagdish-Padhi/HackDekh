import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import LogoTransition from './components/LogoAnimation';
import { AuthProvider, CacheProvider, ToastProvider } from './context';

// Code-split non-landing routes so the initial landing page bundle is lightweight
const loadHackathons = () => import('./pages/Hackathons');
const loadDashboard = () => import('./pages/Dashboard');
const loadTracker = () => import('./pages/Tracker');
const loadTeams = () => import('./pages/Teams');
const loadSettings = () => import('./pages/Settings');

const HackathonsPage = lazy(loadHackathons);
const HackathonDetailPage = lazy(() => import('./pages/HackathonDetail'));
const LoginPage = lazy(() => import('./pages/Login'));
const VerificationPage = lazy(() => import('./pages/VerifyEmail'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const TeamsPage = lazy(loadTeams);
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitation'));
const DashboardPage = lazy(loadDashboard);
const TrackerPage = lazy(loadTracker);
const SettingsPage = lazy(loadSettings);
const GithubCallbackPage = lazy(() => import('./pages/GithubCallback'));
const PublicSquadPage = lazy(() => import('./pages/PublicSquad'));

const RouteFallback = () => (
  <div className="flex flex-1 items-center justify-center py-16">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-700 dark:border-t-blue-400" />
  </div>
);

function AppContent() {
  const location = useLocation();
  const [showMobileSplash, setShowMobileSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth >= 1024) return false;
    try {
      if (sessionStorage.getItem('hackdekh_splash_shown')) return false;
      sessionStorage.setItem('hackdekh_splash_shown', '1');
      return true;
    } catch {
      return false;
    }
  });
  const [splashFading, setSplashFading] = useState(false);

  // Dismiss mobile startup splash after ~1.8s while background work runs underneath
  useEffect(() => {
    if (!showMobileSplash) return;
    const fadeTimer = globalThis.setTimeout(() => setSplashFading(true), 1650);
    const hideTimer = globalThis.setTimeout(() => setShowMobileSplash(false), 1950);
    return () => {
      globalThis.clearTimeout(fadeTimer);
      globalThis.clearTimeout(hideTimer);
    };
  }, [showMobileSplash]);

  // Prefetch core navigation chunks during idle time for instant tab switches on mobile/desktop
  useEffect(() => {
    const prefetchCoreTabs = () => {
      void loadHackathons();
      void loadDashboard();
      void loadTracker();
      void loadTeams();
      void loadSettings();
    };
    if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
      const id = (window as any).requestIdleCallback(prefetchCoreTabs, { timeout: 2500 });
      return () => (window as any).cancelIdleCallback(id);
    }
    const timer = globalThis.setTimeout(prefetchCoreTabs, 600);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return (
    <>
      {showMobileSplash && (
        <div
          className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-opacity duration-300 lg:hidden ${
            splashFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden="true"
        >
          <LogoTransition autoPlay width={280} height={170} />
          <div className="-mt-2 text-xl font-extrabold tracking-tight font-logo flex items-center">
            <span className="text-zinc-900 dark:text-white">Hack</span>
            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Dekh</span>
          </div>
        </div>
      )}
      <MainLayout>
      <div className="w-full flex-1 flex flex-col">
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerificationPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/hackathons" element={<HackathonsPage />} />
            <Route path="/hackathons/:slug" element={<HackathonDetailPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route path="/auth/github/callback" element={<GithubCallbackPage />} />
            <Route path="/squad/:code" element={<PublicSquadPage />} />
            
            {/* Protected Routes */}
            <Route 
              path="/teams" 
              element={
                <ProtectedRoute>
                  <TeamsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tracker" 
              element={
                <ProtectedRoute>
                  <TrackerPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </div>
    </MainLayout>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CacheProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </CacheProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
