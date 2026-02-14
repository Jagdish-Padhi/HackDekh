import Header from './Header'
import Footer from './Footer'
import React from 'react'

type MainLayoutProps = {
    children: React.ReactNode
}


const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <div className="flex flex-col min-h-screen bg-background-main text-text-primary font-sans">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
            <Footer />
        </div>
    )
}

export default MainLayout;