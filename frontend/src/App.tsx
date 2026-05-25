
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import HackathonsPage from './pages/Hackathons';
import HackathonDetailsPage from './pages/HackathonDetails';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import TeamsPage from './pages/Teams';
import AcceptInvitationPage from './pages/AcceptInvitation';
import DashboardPage from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import LogoTransition from './components/LogoAnimation';

function AppContent() {
  const { isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <LogoTransition width={350} height={200} autoPlay={true} />
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 animate-pulse">
            Loading HackDekh Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="w-full flex-1 flex flex-col"
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/hackathons" element={<HackathonsPage />} />
            <Route path="/hackathons/:id" element={<HackathonDetailsPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            
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
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
