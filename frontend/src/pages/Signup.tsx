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
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-main">
            <form onSubmit={handleSubmit} className="bg-background-card p-8 rounded-lg shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                <div className="mb-4">
                    <label className="block mb-1 font-medium">Username</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background-elevated text-text-primary"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block mb-1 font-medium">Full Name</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background-elevated text-text-primary"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block mb-1 font-medium">Email</label>
                    <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-md bg-background-elevated text-text-primary"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block mb-1 font-medium">Password</label>
                    <input
                        type="password"
                        className="w-full px-3 py-2 border rounded-md bg-background-elevated text-text-primary"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-violet-brand text-white py-2 rounded-md font-semibold hover:bg-violet-accent transition"
                    disabled={loading}
                >
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
            <div className="mt-4 text-center">
                <span className="text-sm">Already have an account? </span>
                <a href="/login" className="text-violet-brand hover:underline">Login</a>
            </div>
        </div>
    );
};

export default SignupPage;
