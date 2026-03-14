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
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[1.8rem] border border-gray-200/80 bg-white/85 p-7 shadow-[0_22px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-colors duration-300 sm:p-9 dark:border-[#1F1F22] dark:bg-[#121214]/82 dark:shadow-[0_26px_58px_rgba(0,0,0,0.45)]">
        <div className="mb-7 text-center">
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-gray-600 dark:border-[#2A2A30] dark:bg-white/3 dark:text-gray-400">Welcome Back</span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Login</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Access your dashboard and track every hackathon.</p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
          <input
            type="email"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-[#1F1F22] dark:bg-[#121214] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">Password</label>
          <input
            type="password"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-[#1F1F22] dark:bg-[#121214] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full border border-blue-500/35 bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-[0_14px_30px_rgba(59,130,246,0.35)] dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div className="mt-5 text-center text-sm text-gray-600 dark:text-gray-400">
        <span>Don't have an account? </span>
        <a href="/signup" className="font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200">Sign Up</a>
      </div>
    </div>
  );
};

export default LoginPage;
