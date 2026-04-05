import { useEffect } from 'react'
import Footer from './Footer'
import React from 'react'
import Sidebar from './Sidebar'
import { PageChromeProvider } from '../context/pageChrome'

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
    useEffect(() => {
        document.body.classList.add('overflow-x-hidden')

        return () => {
            document.body.classList.remove('overflow-x-hidden')
        }
    }, [])

    return (
        <div className="relative flex min-h-screen flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="pointer-events-none absolute inset-0 -z-10 app-background-light dark:hidden" />
            <div className="pointer-events-none absolute inset-0 -z-10 hidden app-background-dark dark:block" />

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