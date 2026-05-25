import { useEffect, useState } from 'react'
import React from 'react'
import Sidebar from './Sidebar'
import { PageChromeProvider } from '../context/pageChrome'
import { ArrowUp, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Link, NavLink, useLocation } from 'react-router-dom'
import DarkModeToggle from './DarkModeToggle'

type MainLayoutProps = {
    children: React.ReactNode
}

const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <PageChromeProvider>
            <Shell>{children}</Shell>
        </PageChromeProvider>
    )
}

const Shell = ({ children }: MainLayoutProps) => {
    const { isAuthenticated } = useAuth()
    const location = useLocation()
    const [showBackToTop, setShowBackToTop] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        document.body.classList.add('overflow-x-hidden')

        return () => {
            document.body.classList.remove('overflow-x-hidden')
        }
    }, [])

    useEffect(() => {
        const updateVisibility = () => {
            setShowBackToTop(window.scrollY > 220)
        }

        updateVisibility()
        window.addEventListener('scroll', updateVisibility, { passive: true })

        return () => window.removeEventListener('scroll', updateVisibility)
    }, [])

    const handleBackToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const renderGuestNavbar = () => {
        const guestTabs = [
            { name: 'Hackathons', path: '/hackathons' },
            { name: 'Teams', path: '/teams' },
            { name: 'Dashboard', path: '/dashboard' }
        ]

        return (
            <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 h-16 w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3">
                    <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-9 w-9 rounded-xl object-contain" />
                    <div className="flex items-center">
                        <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">HackDekh</span>
                        <span className="ml-2 text-[0.68rem] font-bold uppercase tracking-wider text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded-md dark:text-blue-400">OS</span>
                    </div>
                </Link>

                {/* Desktop Tabs */}
                <nav className="hidden md:flex items-center gap-1.5">
                    {guestTabs.map((tab) => {
                        const isActive = location.pathname === tab.path || (tab.path === '/hackathons' && location.pathname === '/');
                        return (
                            <NavLink
                                key={tab.name}
                                to={tab.path}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    isActive
                                        ? 'bg-zinc-100 text-blue-600 dark:bg-zinc-900 dark:text-blue-400'
                                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
                                }`}
                            >
                                {tab.name}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Right controls */}
                <div className="hidden md:flex items-center gap-4">
                    <DarkModeToggle />
                    <Link
                        to="/login"
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                        Login
                    </Link>
                    <Link
                        to="/signup"
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 hover:-translate-y-0.5"
                    >
                        Sign Up
                    </Link>
                </div>

                {/* Mobile controls */}
                <div className="flex md:hidden items-center gap-3">
                    <DarkModeToggle />
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile overlay menu */}
                {mobileMenuOpen && (
                    <div className="absolute top-16 left-0 right-0 border-b border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-3 md:hidden z-30">
                        {guestTabs.map((tab) => {
                            const isActive = location.pathname === tab.path || (tab.path === '/hackathons' && location.pathname === '/');
                            return (
                                <NavLink
                                    key={tab.name}
                                    to={tab.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                                    }`}
                                >
                                    {tab.name}
                                </NavLink>
                            )
                        })}
                        <hr className="border-zinc-200 dark:border-zinc-800 my-1" />
                        <Link
                            to="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-full text-center rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                        >
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-full text-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                            Sign Up
                        </Link>
                    </div>
                )}
            </header>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="relative flex min-h-screen flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
                <div className="pointer-events-none absolute inset-0 -z-10 app-background-light dark:hidden" />
                <div className="pointer-events-none absolute inset-0 -z-10 hidden app-background-dark dark:block" />

                {renderGuestNavbar()}

                <div className="relative z-10 flex-1 pt-16">
                    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
                        {children}
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="pointer-events-none absolute inset-0 -z-10 app-background-light dark:hidden" />
            <div className="pointer-events-none absolute inset-0 -z-10 hidden app-background-dark dark:block" />

            <button
                type="button"
                onClick={handleBackToTop}
                className={`fixed bottom-5 right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl dark:border-blue-400/30 dark:bg-blue-500 dark:shadow-blue-500/20 dark:hover:bg-blue-400 lg:hidden ${showBackToTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
                aria-label="Back to top"
                title="Back to top"
            >
                <ArrowUp className="h-5 w-5" />
            </button>

            <div className="relative z-10 grid flex-1 pt-20 lg:grid-cols-[auto_1fr] lg:pt-16">
                <Sidebar />

                <div className="min-w-0 flex min-h-[calc(100vh-80px)] flex-col lg:min-h-[calc(100vh-64px)]">
                    <main className="flex w-full flex-1 flex-col px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
                        <div className="w-full">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    )
}

export default MainLayout;