import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, CacheProvider, ToastProvider } from './context';

// Code-split non-landing routes so the initial landing page bundle is lightweight
const HackathonsPage = lazy(() => import('./pages/Hackathons'));
const LoginPage = lazy(() => import('./pages/Login'));
const VerificationPage = lazy(() => import('./pages/VerifyEmail'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const TeamsPage = lazy(() => import('./pages/Teams'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitation'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const TrackerPage = lazy(() => import('./pages/Tracker'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const GithubCallbackPage = lazy(() => import('./pages/GithubCallback'));

function AppContent() {
  const location = useLocation();





  return (
    <MainLayout>
      <div className="w-full flex-1 flex flex-col">
        <Suspense fallback={null}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage />} />
            <Route path="/verify-email" element={<VerificationPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/hackathons" element={<HackathonsPage />} />
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
      </div>
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
