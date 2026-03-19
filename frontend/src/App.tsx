
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import HackathonsPage from './pages/Hackathons';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import TeamsPage from './pages/Teams';
import DashboardPage from './pages/Dashboard';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/hackathons" element={<HackathonsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Add more routes here as you build more pages */}
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
