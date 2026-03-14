import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Hackathons', path: '/hackathons' },
    { name: 'Teams', path: '/teams' },
    { name: 'My Dashboard', path: '/dashboard' },
];

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <nav className="mx-auto w-full max-w-7xl rounded-[1.4rem] border-b border-zinc-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md transition-all duration-200 sm:px-5 sm:py-2.5 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-md">

            {/* Top row: logo + desktop nav pill / mobile controls */}
            <div className="flex items-center justify-between">

                {/* Logo + brand */}
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-sm">
                        <img src="/HackDekhSVG.svg" alt="HackDekh Logo" className="h-9 w-9 object-contain" />
                    </div>
                    <span className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Hack
                        <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-500">Dekh</span>
                    </span>
                </div>

                {/* Desktop nav pill — hidden on mobile */}
                <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/80 p-1.5 shadow-sm transition-all duration-200 sm:flex dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-sm">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) =>
                                `rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-zinc-900 text-white shadow-sm dark:bg-blue-500 dark:text-white dark:shadow-sm'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white'
                                }`
                            }
                        >
                            {item.name}
                        </NavLink>
                    ))}
                    <DarkModeToggle />
                </div>

                {/* Mobile controls: theme icon + hamburger — hidden on sm+ */}
                <div className="flex items-center gap-2 sm:hidden">
                    <DarkModeToggle />
                    <button
                        type="button"
                        onClick={() => setMenuOpen(prev => !prev)}
                        className="rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition-all duration-200 hover:bg-zinc-100 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:shadow-md"
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
                <div className="mt-3 flex flex-col gap-1 border-t border-zinc-200/90 pt-3 sm:hidden dark:border-zinc-800">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) =>
                                `rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-zinc-900 text-white dark:bg-blue-500 dark:text-white'
                                    : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white'
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
