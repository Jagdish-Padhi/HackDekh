import { useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const SignupPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axiosInstance.post('/user/register', {
                username,
                email,
                fullName,
                password,
            });
            // Optionally auto-login or redirect
            window.location.href = '/login';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[76vh] flex-col items-center justify-center py-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[1.8rem] border border-zinc-200/90 bg-white p-7 shadow-sm backdrop-blur-md transition-all duration-200 sm:p-9 dark:border-zinc-800 dark:bg-zinc-900/85 dark:shadow-md">
                <div className="mb-7 text-center">
                    <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-400">Create Account</span>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sign Up</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Join HackDekh and start managing your hackathon journey.</p>
                </div>

                {error && <div className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
                <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Username</label>
                    <input
                        type="text"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Full Name</label>
                    <input
                        type="text"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Email</label>
                    <input
                        type="email"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-400">Password</label>
                    <input
                        type="password"
                        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm transition-all duration-200 placeholder:text-zinc-400 focus:border-blue-500/45 focus:outline-none focus:ring-4 focus:ring-blue-500/12 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400/50 dark:focus:ring-blue-400/20"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-full border border-blue-500/35 bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:shadow-md"
                    disabled={loading}
                >
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
            <div className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-400">
                <span>Already have an account? </span>
                <a href="/login" className="font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200">Login</a>
            </div>
        </div>
    );
};

export default SignupPage;
