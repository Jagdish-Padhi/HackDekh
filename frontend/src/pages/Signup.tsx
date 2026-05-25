import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LogoTransition from '../components/LogoAnimation';
import axiosInstance from '../utils/axiosInstance';

const SignupPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<string | null>(null);

    const returnTo = useMemo(() => searchParams.get('returnTo') || '/', [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axiosInstance.post('/users/register', {
                username,
                email,
                fullName,
                password,
            });
            setPendingDestination(`/login?returnTo=${encodeURIComponent(returnTo)}&email=${encodeURIComponent(email)}`);
            setTransitioning(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Signup failed');
            setLoading(false);
        } finally {
            if (pendingDestination === null) {
                setLoading(false);
            }
        }
    };

    const handleTransitionComplete = () => {
        if (pendingDestination) {
            navigate(pendingDestination, { replace: true });
        }
    };

    return (
        <div className="relative flex min-h-[76vh] flex-col items-center justify-center py-6">
            {transitioning && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-xl dark:bg-zinc-950/70">
                    <div className="flex flex-col items-center gap-5 rounded-[2rem] border border-zinc-200/80 bg-white/80 px-8 py-7 shadow-[0_22px_70px_-28px_rgba(15,23,42,0.24)] dark:border-zinc-800 dark:bg-zinc-950/80">
                        <LogoTransition width={300} height={180} onComplete={handleTransitionComplete} />
                        <div className="text-center">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Account created</p>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Redirecting you to sign in…</p>
                        </div>
                    </div>
                </div>
            )}
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
                    disabled={loading || transitioning}
                >
                    {loading || transitioning ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
            <div className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-400">
                <span>Already have an account? </span>
                <a href={`/login?returnTo=${encodeURIComponent(returnTo)}${email ? `&email=${encodeURIComponent(email)}` : ''}`} className="font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200">Login</a>
            </div>
        </div>
    );
};

export default SignupPage;
