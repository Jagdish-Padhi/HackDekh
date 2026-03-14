import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
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

const SAFE_DEADLINE_BUFFER_DAYS = 3
const SAFE_DEADLINE_MIN_WINDOW_DAYS = 5

const hasDeadlinePassed = (deadline?: string) => {
    if (!deadline?.trim()) {
        return false
    }

    const rawDeadline = deadline.trim()
    const parsed = new Date(rawDeadline)

    if (Number.isNaN(parsed.getTime())) {
        return false
    }

    // Treat date-only values as valid until the end of that local day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDeadline)) {
        parsed.setHours(23, 59, 59, 999)
    }

    const msPerDay = 1000 * 60 * 60 * 24
    const daysUntilActualDeadline = Math.ceil((parsed.getTime() - Date.now()) / msPerDay)

    if (daysUntilActualDeadline > SAFE_DEADLINE_MIN_WINDOW_DAYS) {
        parsed.setDate(parsed.getDate() - SAFE_DEADLINE_BUFFER_DAYS)
    }

    return parsed.getTime() < Date.now()
}

const HackathonList = () => {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
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
        !hasDeadlinePassed(h.deadline) &&
        h.title.toLowerCase().includes(search.toLowerCase()) &&
        (platform ? h.platform === platform : true) &&
        (mode ? h.mode === mode : true)
    )


    return (
        <div className="space-y-6">
            <div className="sticky top-26 z-30 bg-white/95 pb-4 backdrop-blur-md dark:bg-zinc-950/95">
                <div className="relative rounded-[1.8rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition-all duration-200 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md">
                    <div className="flex flex-row gap-4 pr-10 max-md:flex-col sm:pr-12">
                        <SearchBar value={search} onChange={setSearch} />
                        <FilterPanel platform={platform} setPlatform={setPlatform} mode={mode} setMode={setMode} />
                    </div>

                    <div className="group absolute right-4 top-4 z-40">
                        <button
                            type="button"
                            aria-label="How deadlines and prize pool are shown"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                        >
                            <Info className="h-3.5 w-3.5" strokeWidth={2.3} aria-hidden="true" />
                        </button>

                        <div className="pointer-events-none absolute right-0 top-9 w-80 translate-y-1 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-xs leading-5 text-zinc-600 opacity-0 shadow-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-300">
                            To avoid missed applications, deadline tags use a 3-day safety buffer only when the actual deadline is more than 5 days away. For near deadlines (5 days or less), we show the exact deadline. Prize tags display normalized total prize pool when track-wise prizes are provided.
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