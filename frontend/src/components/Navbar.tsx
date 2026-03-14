import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Hackathons', path: '/hackathons' },
    { name: 'Teams', path: '/teams' },
    { name: 'My Dashboard', path: '/dashboard' },
];

const Navbar = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        const savedTheme = window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
        setTheme(savedTheme)
        document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }, [])

    const handleThemeToggle = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(nextTheme)
        document.documentElement.classList.toggle('dark', nextTheme === 'dark')
        window.localStorage.setItem('theme', nextTheme)
    }

    return (
        <nav className="mx-auto w-full max-w-7xl rounded-[1.4rem] border border-gray-200/80 bg-white/80 px-4 py-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 sm:px-5 sm:py-2.5 dark:border-[#1F1F22] dark:bg-[#121214]/80 dark:shadow-[0_24px_56px_rgba(0,0,0,0.45)]">

            {/* Top row: logo + desktop nav pill / mobile controls */}
            <div className="flex items-center justify-between">

                {/* Logo + brand */}
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.08)] dark:border-[#2A2A30] dark:bg-white/5 dark:shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
                        <img src="/HackDekhSVG.svg" alt="HackDekh Logo" className="h-9 w-9 object-contain" />
                    </div>
                    <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                        Hack
                        <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-500">Dekh</span>
                    </span>
                </div>

                {/* Desktop nav pill — hidden on mobile */}
                <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors duration-300 sm:flex dark:border-[#2A2A30] dark:bg-white/2 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) =>
                                `rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-gray-900 text-white shadow-md dark:bg-blue-500 dark:text-white dark:shadow-[0_10px_30px_rgba(79,140,255,0.35)]'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                                }`
                            }
                        >
                            {item.name}
                        </NavLink>
                    ))}
                    <button
                        type="button"
                        onClick={handleThemeToggle}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-100 hover:text-gray-900 dark:border-[#2A2A30] dark:bg-white/3 dark:text-gray-200 dark:hover:border-blue-400/40 dark:hover:bg-white/9 dark:hover:text-white"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? 'Light mode ☀️' : 'Dark mode 🌙'}
                    </button>
                </div>

                {/* Mobile controls: theme icon + hamburger — hidden on sm+ */}
                <div className="flex items-center gap-2 sm:hidden">
                    <button
                        type="button"
                        onClick={handleThemeToggle}
                        className="rounded-full border border-gray-200 bg-white px-3 py-2 text-base leading-none text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-[#2A2A30] dark:bg-white/3 dark:text-gray-200 dark:hover:bg-white/9"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(prev => !prev)}
                        className="rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-[#2A2A30] dark:bg-white/3 dark:text-gray-200 dark:hover:bg-white/9"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12h18M3 6h18M3 18h18" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {menuOpen && (
                <div className="mt-3 flex flex-col gap-1 border-t border-gray-200/80 pt-3 sm:hidden dark:border-[#1F1F22]">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) =>
                                `rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-gray-900 text-white dark:bg-blue-500 dark:text-white'
                                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
                                }`
                            }
                        >
                            {item.name}
                        </NavLink>
                    ))}
                </div>
            )}
        </nav>
    )
};

export default Navbar;
