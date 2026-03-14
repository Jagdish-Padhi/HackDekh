import Header from './Header'
import Footer from './Footer'
import React from 'react'

type MainLayoutProps = {
    children: React.ReactNode
}


const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <div className="relative flex min-h-screen flex-col bg-white text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="pointer-events-none absolute inset-0 -z-10 app-background-light dark:hidden" />
            <div className="pointer-events-none absolute inset-0 -z-10 hidden app-background-dark dark:block" />
            <Header />
            <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
                <div className="w-full">{children}</div>
            </main>
            <Footer />
        </div>
    )
}

export default MainLayout;