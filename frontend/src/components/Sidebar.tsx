import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Home, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, Trophy, Users, X } from 'lucide-react'
import axiosInstance from '../utils/axiosInstance'
import { usePageChrome } from '../context/pageChrome'

const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Hackathons', path: '/hackathons', icon: Trophy },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'My Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
]

const Sidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { sidebarExpanded, closeSidebar, toggleSidebar, pageActions } = usePageChrome()
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') {
            return false
        }

        return window.innerWidth < 1024
    })
    const isLoggedIn = Boolean(localStorage.getItem('accessToken'))
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const updateViewportMode = () => setIsMobile(window.innerWidth < 1024)

        updateViewportMode()
        window.addEventListener('resize', updateViewportMode)

        return () => window.removeEventListener('resize', updateViewportMode)
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const initialDark = window.localStorage.getItem('theme') === 'dark'
        setIsDark(initialDark)
        document.documentElement.classList.toggle('dark', initialDark)

        const onThemeSync = (event: Event) => {
            const detail = (event as CustomEvent<'light' | 'dark'>).detail
            setIsDark(detail === 'dark')
        }

        window.addEventListener('hackdekh-theme-change', onThemeSync)
        return () => window.removeEventListener('hackdekh-theme-change', onThemeSync)
    }, [])

    const toggleTheme = () => {
        const nextIsDark = !isDark
        setIsDark(nextIsDark)
        document.documentElement.classList.toggle('dark', nextIsDark)
        window.localStorage.setItem('theme', nextIsDark ? 'dark' : 'light')
        window.dispatchEvent(new CustomEvent('hackdekh-theme-change', { detail: nextIsDark ? 'dark' : 'light' }))
    }

    const handleLogout = async () => {
        try {
            if (isLoggedIn) {
                await axiosInstance.post('/users/logout')
            }
        } catch {
            // Clear local auth even if server logout fails.
        } finally {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            navigate('/login')
            closeSidebar()
        }
    }

    const sidebarWidthClass = sidebarExpanded ? 'lg:w-60' : 'lg:w-18'
    const mobileVisibilityClass = isMobile ? (sidebarExpanded ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'

    return (
        <>
            {/* Mobile logo header - fixed at top, visible on mobile */}
            <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
                <div className="flex items-center gap-3">
                    <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-10 w-10 rounded-2xl object-contain" />
                    <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">HackDekh</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-blue-400 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={closeSidebar}
                        className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        aria-label="Close sidebar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Desktop logo header - fixed at top, always visible */}
            <div className="hidden fixed inset-x-0 top-0 z-30 items-center gap-4 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:flex lg:h-16">
                <div className="flex shrink-0 items-center gap-3">
                    <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-10 w-10 rounded-2xl object-contain" />
                    <div>
                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">HackDekh</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Hackathon OS</p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-blue-400 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                        aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {sidebarExpanded ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />}
                    </button>
                </div>

                {pageActions && <div className="ml-auto flex min-w-0 flex-1 justify-end overflow-visible">{pageActions}</div>}
            </div>

            {/* Sidebar - starts below logo header */}
            <aside
                className={`fixed left-0 top-20 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white/95 shadow-xl backdrop-blur-xl sidebar-transition max-h-[calc(100vh-80px)] lg:sticky lg:top-16 lg:z-30 lg:max-h-[calc(100vh-64px)] lg:shadow-none dark:border-zinc-800 dark:bg-zinc-950/95 ${sidebarWidthClass} ${mobileVisibilityClass}`}
                aria-label="Primary navigation"
            >
                <nav className="flex flex-1 flex-col gap-1 px-2.5 py-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = location.pathname === item.path

                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                        isActive || active
                                            ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white'
                                    }`
                                }
                                onClick={() => {
                                    if (isMobile) {
                                        closeSidebar()
                                    }
                                }}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {sidebarExpanded && <span>{item.name}</span>}
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="space-y-2 border-t border-zinc-200 p-2.5 dark:border-zinc-800">
                    {isLoggedIn ? (
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            {sidebarExpanded && <span>Logout</span>}
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <NavLink
                                to="/login"
                                className="block rounded-2xl border border-zinc-200 px-3 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                            >
                                {sidebarExpanded ? 'Login' : 'In'}
                            </NavLink>
                            <NavLink
                                to="/signup"
                                className="block rounded-2xl border border-blue-500/35 bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
                            >
                                {sidebarExpanded ? 'Sign Up' : 'Up'}
                            </NavLink>
                        </div>
                    )}
                </div>
            </aside>

            {isMobile && sidebarExpanded && (
                <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden" onClick={closeSidebar} aria-hidden="true" />
            )}
        </>
    )
}

export default Sidebar