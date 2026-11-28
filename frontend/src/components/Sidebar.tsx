import { useState } from 'react'
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom'
import { BarChart3, LogOut, Trophy, Users, Settings, Crosshair } from 'lucide-react'
import { usePageChrome } from '../context/pageChrome'
import { useAuth, useCache } from '../context'

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Hackathons', path: '/hackathons', icon: Trophy },
    { name: 'Tracker', path: '/tracker', icon: Crosshair },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
]

const Sidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { closeSidebar, pageActions } = usePageChrome()
    const [isDesktopHovered, setIsDesktopHovered] = useState(false)
    const { user, isAuthenticated, logout } = useAuth()
    const logoDestination = isAuthenticated ? '/dashboard' : '/hackathons'
    const { clearCache } = useCache()

    const handleLogout = async () => {
        try {
            await logout()
        } catch {
            // fallback
        } finally {
            clearCache()
            sessionStorage.removeItem("dismissedSignupFunnel")
            navigate('/login')
            closeSidebar()
        }
    }

    const isExpanded = isDesktopHovered
    const sidebarWidthClass = isExpanded ? 'lg:w-60 lg:shadow-xl' : 'lg:w-18 lg:shadow-none'
    const activeTabTitle =
        navItems.find((item) => location.pathname === item.path)?.name ||
        (location.pathname.startsWith('/hackathons/') ? 'Hackathon' : '')

    return (
        <>
            {/* Mobile compact top header - fixed at top, visible on mobile */}
            <div className="fixed inset-x-0 top-0 z-90 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/90 lg:hidden">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Link to={logoDestination} className="flex items-center gap-2 shrink-0 select-none">
                        <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-8 w-8 rounded-full object-contain shrink-0 drop-shadow-sm" />
                        <span className="text-base font-extrabold tracking-tight font-logo flex items-center">
                            <span className="text-zinc-900 dark:text-white">Hack</span>
                            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Dekh</span>
                        </span>
                    </Link>
                    {isAuthenticated && activeTabTitle && (
                        <>
                            <span className="text-zinc-300 dark:text-zinc-700 font-light select-none">/</span>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate select-none">
                                {activeTabTitle}
                            </span>
                        </>
                    )}
                </div>
                {!isAuthenticated && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                            to="/login"
                            className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                        >
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>

            {/* Desktop logo header - fixed at top, always visible */}
            <div className="hidden fixed inset-x-0 top-0 z-40 items-center gap-4 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:flex lg:h-16">
                <Link to={logoDestination} className="flex shrink-0 items-center gap-2.5">
                    <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-contain shrink-0 drop-shadow-md" />
                    <div>
                        <div className="text-base font-extrabold tracking-tight font-logo flex items-center">
                            <span className="text-zinc-900 dark:text-white">Hack</span>
                            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Dekh</span>
                        </div>
                    </div>
                </Link>

                <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5 overflow-visible">
                    {pageActions}
                </div>
            </div>

            {/* Desktop layout rail spacer so hover-expand never shifts page content */}
            <div className="hidden lg:block lg:w-18 lg:shrink-0" aria-hidden="true" />

            {/* Desktop Sidebar - starts below logo header; expands smoothly on hover */}
            <aside
                onMouseEnter={() => setIsDesktopHovered(true)}
                onMouseLeave={() => setIsDesktopHovered(false)}
                className={`hidden lg:flex fixed left-0 top-16 bottom-0 z-40 flex-col border-r border-zinc-200 bg-white/95 shadow-xl backdrop-blur-xl sidebar-transition max-h-[calc(100vh-64px)] dark:border-zinc-800 dark:bg-zinc-950/95 ${sidebarWidthClass}`}
                aria-label="Primary navigation"
            >
                <nav className="flex flex-1 flex-col gap-1 px-3 py-4 sm:px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = location.pathname === item.path

                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={() =>
                                    `flex items-center gap-3 whitespace-nowrap overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${active
                                        ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white'
                                    }`
                                }
                            >
                                {() => (
                                    <>
                                        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white stroke-white fill-none' : ''}`} />
                                        {isExpanded && (
                                            <span className={active ? 'text-white' : ''}>
                                                {item.name}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="space-y-2 border-t border-zinc-200 p-3 sm:p-2.5 dark:border-zinc-800">
                    {isAuthenticated && user && (
                        <div className="flex items-center gap-3 whitespace-nowrap overflow-hidden px-3 py-2 mb-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs dark:bg-blue-500 uppercase font-logo">
                                {user.fullName.slice(0, 2)}
                            </div>
                            {isExpanded && (
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.fullName}</p>
                                    <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 truncate">@{user.username}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {isAuthenticated ? (
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 whitespace-nowrap overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            {isExpanded && <span>Logout</span>}
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <NavLink
                                to="/login"
                                className="block whitespace-nowrap overflow-hidden rounded-lg border border-zinc-200 px-3 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                            >
                                {isExpanded ? 'Login' : 'In'}
                            </NavLink>
                            <NavLink
                                to="/signup"
                                className="block whitespace-nowrap overflow-hidden rounded-lg border border-blue-500/35 bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
                            >
                                {isExpanded ? 'Sign Up' : 'Up'}
                            </NavLink>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Bottom Navigation Bar */}
            <nav
                className="fixed inset-x-0 bottom-0 z-80 border-t border-zinc-200/80 bg-white/95 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
                aria-label="Mobile navigation"
            >
                <div className="grid grid-cols-5 h-15">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = location.pathname === item.path

                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                onClick={() => {
                                    if (active) {
                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                    }
                                }}
                                className={`relative flex flex-col items-center justify-center gap-1 select-none transition-transform active:scale-95 ${active
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                    }`}
                            >
                                {active && (
                                    <span className="absolute top-0 h-0.5 w-7 rounded-full bg-blue-600 dark:bg-blue-400" />
                                )}
                                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                                <span className={`text-[10px] leading-none tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
                                    {item.name}
                                </span>
                            </NavLink>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}

export default Sidebar