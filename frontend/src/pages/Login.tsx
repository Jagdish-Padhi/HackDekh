import { useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axiosInstance.post('/user/login', { email, password });
      // Save tokens to localStorage or cookies as needed
      localStorage.setItem('accessToken', res.data.data.accessToken);
      localStorage.setItem('refreshToken', res.data.data.refreshToken);
      // Redirect or update UI as needed
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[76vh] flex-col items-center justify-center py-6">
      <form onSubmit={handleSubmit} className="theme-panel w-full max-w-md rounded-[1.8rem] p-7 sm:p-9">
        <div className="mb-7 text-center">
          <span className="theme-pill rounded-full px-4 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em]">Welcome Back</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary">Login</h2>
          <p className="mt-2 text-sm text-text-secondary">Access your dashboard and track every hackathon.</p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
          <input
            type="email"
            className="theme-field rounded-2xl px-4 py-3"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Password</label>
          <input
            type="password"
            className="theme-field rounded-2xl px-4 py-3"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="theme-button-primary w-full px-5 py-3 text-sm font-semibold"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div className="mt-5 text-center text-sm text-text-secondary">
        <span>Don't have an account? </span>
        <a href="/signup" className="font-medium text-violet-accent transition hover:text-white">Sign Up</a>
      </div>
    </div>
  );
};

export default LoginPage;
