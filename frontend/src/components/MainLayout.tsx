import Header from './Header'
import Footer from './Footer'
import React from 'react'

type MainLayoutProps = {
    children: React.ReactNode
}


const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <div className="theme-app-shell flex min-h-screen flex-col bg-background-main text-text-primary font-sans">
            <Header />
            <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
                <div className="w-full">{children}</div>
            </main>
            <Footer />
        </div>
    )
}

export default MainLayout;