
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import HomePage from './pages/Home';
import HackathonsPage from './pages/Hackathons';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/Hackathons" element={<HackathonsPage />} />
          {/* Add more routes here as you build more pages */}
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
