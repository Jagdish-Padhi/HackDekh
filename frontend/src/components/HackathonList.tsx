import { useEffect, useState } from 'react'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'
import SearchBar from './SearchBar'
import FilterPanel from './FilterPanel'
import LoadingProgress from './LoadingProgress'

type Hackathon = {
    _id: string
    title: string
    platform: string
    coverImage?: string
    startDate?: string
    deadline?: string
    mode?: string
    prize?: string
    location?: string
}

const HackathonList = () => {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [progressTarget, setProgressTarget] = useState(0)
    const [progressDisplay, setProgressDisplay] = useState(0)
    const [showResults, setShowResults] = useState(false)
    const [search, setSearch] = useState('')
    const [platform, setPlatform] = useState('')
    const [mode, setMode] = useState('')

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setProgressDisplay(previous => {
                const nextStep = progressTarget - previous
                if (Math.abs(nextStep) <= 0.2) {
                    return progressTarget
                }

                const easedStep = Math.max(0.35, nextStep * 0.2)
                return Math.min(progressTarget, previous + easedStep)
            })
        }, 16)

        return () => window.clearInterval(intervalId)
    }, [progressTarget])

    useEffect(() => {
        if (loading) {
            setShowResults(false)
            return
        }

        const showDelay = window.setTimeout(() => setShowResults(true), 40)
        return () => window.clearTimeout(showDelay)
    }, [loading])

    useEffect(() => {
        let isMounted = true
        let finishTimeout: number | undefined

        const fallbackProgress = window.setInterval(() => {
            setProgressTarget(previous => Math.max(previous, Math.min(previous + Math.random() * 6, 92)))
        }, 220)

        axiosInstance.get('/hackathons', {
            onDownloadProgress: event => {
                if (!isMounted || !event.total) {
                    return
                }

                const networkProgress = (event.loaded / event.total) * 100
                setProgressTarget(previous => Math.max(previous, Math.min(networkProgress, 99)))
            },
        })
            .then(res => {
                if (!isMounted) {
                    return
                }

                window.clearInterval(fallbackProgress)
                setHackathons(res.data)
                setProgressTarget(100)
                finishTimeout = window.setTimeout(() => {
                    if (!isMounted) {
                        return
                    }
                    setLoading(false)
                }, 280)
            })
            .catch(() => {
                if (!isMounted) {
                    return
                }

                window.clearInterval(fallbackProgress)
                setProgressTarget(100)
                finishTimeout = window.setTimeout(() => {
                    if (!isMounted) {
                        return
                    }
                    setLoading(false)
                }, 280)
            })

        return () => {
            isMounted = false
            window.clearInterval(fallbackProgress)
            if (finishTimeout) {
                window.clearTimeout(finishTimeout)
            }
        }
    }, [])

    // Filter logic (frontend for now)
    const filtered = hackathons.filter(h =>
        h.title.toLowerCase().includes(search.toLowerCase()) &&
        (platform ? h.platform === platform : true) &&
        (mode ? h.mode === mode : true)
    )

    const handleManualRefresh = async () => {
        if (isRefreshing) {
            return
        }

        try {
            setIsRefreshing(true)
            await axiosInstance.post('/scrape/refresh')
            const refreshed = await axiosInstance.get('/hackathons')
            setHackathons(refreshed.data)
        } catch (error) {
            console.error('Failed to refresh hackathons manually', error)
        } finally {
            setIsRefreshing(false)
        }
    }


    return (
        <div className="space-y-6">
            <div className="sticky top-26 z-30 bg-white/95 pb-4 backdrop-blur-md dark:bg-zinc-950/95">
                <div className="rounded-[1.8rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition-all duration-200 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md">
                    <div className="flex flex-row gap-4 max-md:flex-col">
                        <SearchBar value={search} onChange={setSearch} />
                        <div className="flex flex-wrap items-center gap-3">
                            <FilterPanel platform={platform} setPlatform={setPlatform} mode={mode} setMode={setMode} />
                            <button
                                type="button"
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                className="inline-flex h-13 items-center justify-center rounded-2xl border border-blue-500/35 bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400"
                            >
                                {isRefreshing ? 'Refreshing...' : 'Re-fetch'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <LoadingProgress progress={progressDisplay} />
                ) : filtered.length ? (
                    <div className={`grid grid-cols-1 gap-6 transition-all duration-300 sm:grid-cols-2 xl:grid-cols-3 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {filtered.map(hack => (
                            <HackathonCard key={hack._id} hackathon={hack} />
                        ))}
                    </div>
                ) : (
                    <div className={`rounded-[1.8rem] border border-zinc-200/90 bg-white/90 px-6 py-16 text-center text-base text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 dark:shadow-md ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        No hackathons found...
                    </div>
                )}
            </div>

        </div>
    )
}

export default HackathonList