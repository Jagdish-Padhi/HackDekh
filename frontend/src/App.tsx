
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import HackathonsPage from './pages/Hackathons';
import HackathonDetailsPage from './pages/HackathonDetails';
import LoginPage from './pages/Login';
import TeamsPage from './pages/Teams';
import AcceptInvitationPage from './pages/AcceptInvitation';
import DashboardPage from './pages/Dashboard';
import TrackerPage from './pages/Tracker';
import SettingsPage from './pages/Settings';
import GithubCallbackPage from './pages/GithubCallback';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth, CacheProvider, ToastProvider } from './context';
import LogoTransition from './components/LogoAnimation';

function AppContent() {
  const { isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-300">
        <LogoTransition width={320} height={220} loop={true} />
        <p className="text-sm font-semibold text-zinc-550 dark:text-zinc-400 mt-2">
          Loading HackDekh Workspace...
        </p>
      </div>
    );
  }

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';
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
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage />} />
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
