import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type PageChromeContextValue = {
    sidebarExpanded: boolean
    toggleSidebar: () => void
    closeSidebar: () => void
    pageActions: ReactNode
    setPageActions: (actions: ReactNode) => void
}

const PageChromeContext = createContext<PageChromeContextValue | null>(null)

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

export const PageChromeProvider = ({ children }: { children: ReactNode }) => {
    const [sidebarExpanded, setSidebarExpanded] = useState(() => {
        if (typeof window === 'undefined') {
            return true
        }

        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    })
    const [pageActions, setPageActions] = useState<ReactNode>(null)

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
        setSidebarExpanded(mediaQuery.matches)
    }, [])

    const value = useMemo<PageChromeContextValue>(() => ({
        sidebarExpanded,
        toggleSidebar: () => setSidebarExpanded(previous => !previous),
        closeSidebar: () => setSidebarExpanded(false),
        pageActions,
        setPageActions,
    }), [sidebarExpanded, pageActions])

    return (
        <PageChromeContext.Provider value={value}>
            {children}
        </PageChromeContext.Provider>
    )
}

export const usePageChrome = () => {
    const context = useContext(PageChromeContext)

    if (!context) {
        throw new Error('usePageChrome must be used within PageChromeProvider')
    }

    return context
}