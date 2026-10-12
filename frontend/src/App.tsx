import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth, CacheProvider, ToastProvider } from './context';
import LogoTransition from './components/LogoAnimation';

// Code-split non-landing routes so the initial landing page bundle is lightweight
const HackathonsPage = lazy(() => import('./pages/Hackathons'));
const HackathonDetailsPage = lazy(() => import('./pages/HackathonDetails'));
const LoginPage = lazy(() => import('./pages/Login'));
const VerificationPage = lazy(() => import('./pages/VerifyEmail'));
const TeamsPage = lazy(() => import('./pages/Teams'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitation'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const TrackerPage = lazy(() => import('./pages/Tracker'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const GithubCallbackPage = lazy(() => import('./pages/GithubCallback'));

function AppContent() {
  const { isLoading } = useAuth();
  const location = useLocation();

  const isLandingPage = location.pathname === '/';

  // Landing page loads instantly and reveals sleekly without the custom app loader
  if (isLoading && !isLandingPage) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-300">
        <LogoTransition width={330} height={225} loop={true} />
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mt-2">
          Loading HackDekh Workspace...
        </p>
      </div>
    );
  }

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-email';
  const pageTransitionKey = isAuthRoute ? '/auth' : location.pathname;

  return (
    <MainLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={pageTransitionKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="w-full flex-1 flex flex-col"
        >
          <Suspense fallback={null}>
            <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerificationPage />} />
            <Route path="/hackathons" element={<HackathonsPage />} />
            <Route path="/hackathons/:id" element={<HackathonDetailsPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            <Route path="/auth/github/callback" element={<GithubCallbackPage />} />
            
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
        </motion.div>
      </AnimatePresence>
    </MainLayout>
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
