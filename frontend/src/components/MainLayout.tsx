import { useEffect, useState } from 'react'
import Footer from './Footer'
import React from 'react'
import Sidebar from './Sidebar'
import { PageChromeProvider } from '../context/pageChrome'
import { ArrowUp } from 'lucide-react'

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
                    <Footer />
                </div>
            </div>
        </div>
    )
}

export default MainLayout;