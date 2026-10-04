import Footer from './Footer'
﻿import { useEffect, useState } from 'react'
import React from 'react'
import Sidebar from './Sidebar'
import { PageChromeProvider } from '../context/pageChrome'
import { ArrowUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'
// import DarkModeToggle from './DarkModeToggle'

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

    const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-email';

    if (isAuthPage) {
        return (
            <div className="relative min-h-screen w-screen flex flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
                <div className="pointer-events-none absolute inset-0 -z-10 app-background-light dark:hidden" />
                <div className="pointer-events-none absolute inset-0 -z-10 hidden app-background-dark dark:block" />
                <main className="w-full flex-1 flex flex-col">
                    {children}
                </main>
            </div>
        )
    }

    const renderGuestNavbar = () => {
        return (
            <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/80 h-16 w-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Brand Logo and Title */}
                <Link to="/" className="flex items-center gap-2.5 transition opacity-95 hover:opacity-100">
                    <img src="/BrandImages/HackDekh.png" alt="HackDekh Logo" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-contain shrink-0 drop-shadow-md" />
                    <span className="text-xl font-extrabold tracking-tight font-logo flex items-center">
                        <span className="text-zinc-900 dark:text-white">Hack</span>
                        <span className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:via-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Dekh</span>
                    </span>
                </Link>

                {/* Direct Action Controls */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="btn-brand-secondary rounded-xl px-4 py-2 text-sm"
                    >
                        Login
                    </Link>
                    <Link
                        to="/signup"
                        className="btn-brand-primary rounded-xl px-4 py-2 text-sm"
                    >
                        Sign Up
                    </Link>
                </div>
            </header>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="relative flex min-h-screen flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
                <div className="pointer-events-none absolute inset-0 -z-10 app-background-light dark:hidden" />
                <div className="pointer-events-none absolute inset-0 -z-10 hidden app-background-dark dark:block" />

                {renderGuestNavbar()}

                <button
                    type="button"
                    onClick={handleBackToTop}
                    className={`fixed bottom-5 right-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full btn-brand-primary ${showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
                    aria-label="Back to top"
                    title="Back to top"
                >
                    <ArrowUp className="h-5 w-5" />
                </button>

                <div className="relative z-10 flex-1 pt-16 flex flex-col">
                    <main className={`mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 ${location.pathname === '/' ? 'pt-2 pb-12 sm:pt-3 lg:pt-3' : 'py-8'}`}>
                        {children}
                    </main>
                    <Footer />
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
                className={`fixed bottom-5 right-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full btn-brand-primary ${showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
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
