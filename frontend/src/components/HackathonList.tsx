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

type SortBy = '' | 'deadline-asc' | 'deadline-desc' | 'prize-desc' | 'prize-asc'

const CITY_LOCATION_ALIASES: Record<string, string[]> = {
    bengaluru: ['bengaluru', 'bangalore', 'karnataka', 'mysuru', 'tumakuru', 'tumkur', 'hosur'],
    'delhi-ncr': ['delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'faridabad'],
    mumbai: ['mumbai', 'navi mumbai', 'thane', 'powai', 'maharashtra'],
    pune: ['pune', 'pimpri', 'chinchwad', 'maharashtra'],
    hyderabad: ['hyderabad', 'telangana', 'secunderabad', 'gachibowli'],
    chennai: ['chennai', 'tamil nadu', 'tambaram', 'chengalpattu'],
    kolkata: ['kolkata', 'calcutta', 'west bengal', 'howrah'],
    ahmedabad: ['ahmedabad', 'gujarat', 'gandhinagar'],
    jaipur: ['jaipur', 'rajasthan'],
    kochi: ['kochi', 'cochin', 'ernakulam', 'kerala'],
}

const SAFE_DEADLINE_BUFFER_DAYS = 3
const SAFE_DEADLINE_MIN_WINDOW_DAYS = 5

const isUnavailablePrize = (value: string) =>
    /^(?:tbd|na|n\/a|none|null|undefined|not\s*(?:announced|disclosed)|to\s*be\s*announced|--?)$/i.test(value.trim())

const getComparableDeadlineDate = (deadline?: string) => {
    if (!deadline?.trim()) {
        return null
    }

    const rawDeadline = deadline.trim()
    const parsed = new Date(rawDeadline)

    if (Number.isNaN(parsed.getTime())) {
        return null
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDeadline)) {
        parsed.setHours(23, 59, 59, 999)
    }

    const msPerDay = 1000 * 60 * 60 * 24
    const daysUntilActualDeadline = Math.ceil((parsed.getTime() - Date.now()) / msPerDay)

    if (daysUntilActualDeadline > SAFE_DEADLINE_MIN_WINDOW_DAYS) {
        parsed.setDate(parsed.getDate() - SAFE_DEADLINE_BUFFER_DAYS)
    }

    return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getPrizeAmount = (prize?: string) => {
    if (!prize?.trim()) {
        return null
    }

    const cleanedPrize = prize
        .replace(/^\s*(?:total\s+)?prize\s*pool\s*[:\-–]?\s*/i, '')
        .replace(/^\s*prizes?\s*[:\-–]?\s*/i, '')
        .trim()

    if (!cleanedPrize || isUnavailablePrize(cleanedPrize)) {
        return null
    }

    const amountRegex = /(\d[\d,]*(?:\.\d+)?)\s*(crore|cr|lakh|lac|k)?/gi
    let totalAmount = 0
    let hasValue = false

    for (const match of cleanedPrize.matchAll(amountRegex)) {
        const rawAmount = Number(match[1].replace(/,/g, ''))
        if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
            continue
        }

        const unit = (match[2] || '').toLowerCase()
        const multiplier = unit === 'crore' || unit === 'cr'
            ? 10000000
            : unit === 'lakh' || unit === 'lac'
                ? 100000
                : unit === 'k'
                    ? 1000
                    : 1

        totalAmount += rawAmount * multiplier
        hasValue = true
    }

    return hasValue ? totalAmount : null
}

const compareNullableNumbers = (a: number | null, b: number | null, direction: 'asc' | 'desc') => {
    if (a === null && b === null) {
        return 0
    }

    if (a === null) {
        return 1
    }

    if (b === null) {
        return -1
    }

    return direction === 'asc' ? a - b : b - a
}

const hasDeadlinePassed = (deadline?: string) => {
    const comparableDeadline = getComparableDeadlineDate(deadline)
    if (!comparableDeadline) {
        return false
    }

    return comparableDeadline.getTime() < Date.now()
}

const matchesLocationFilter = (location: string | undefined, selectedCity: string) => {
    if (!selectedCity) {
        return true
    }

    if (!location?.trim()) {
        return false
    }

    const normalizedLocation = location.toLowerCase()
    const aliases = CITY_LOCATION_ALIASES[selectedCity] || [selectedCity]

    return aliases.some(alias => normalizedLocation.includes(alias))
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
    const [sortBy, setSortBy] = useState<SortBy>('')
    const [locationFilter, setLocationFilter] = useState('')

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

    const filtered = hackathons.filter(h =>
        !hasDeadlinePassed(h.deadline) &&
        h.title.toLowerCase().includes(search.toLowerCase()) &&
        (platform ? h.platform === platform : true) &&
        (mode ? h.mode === mode : true) &&
        matchesLocationFilter(h.location, locationFilter)
    )

    const filteredAndSorted = sortBy
        ? [...filtered].sort((a, b) => {
            if (sortBy === 'deadline-asc') {
                return compareNullableNumbers(
                    getComparableDeadlineDate(a.deadline)?.getTime() ?? null,
                    getComparableDeadlineDate(b.deadline)?.getTime() ?? null,
                    'asc'
                )
            }

            if (sortBy === 'deadline-desc') {
                return compareNullableNumbers(
                    getComparableDeadlineDate(a.deadline)?.getTime() ?? null,
                    getComparableDeadlineDate(b.deadline)?.getTime() ?? null,
                    'desc'
                )
            }

            if (sortBy === 'prize-asc') {
                return compareNullableNumbers(getPrizeAmount(a.prize), getPrizeAmount(b.prize), 'asc')
            }

            if (sortBy === 'prize-desc') {
                return compareNullableNumbers(getPrizeAmount(a.prize), getPrizeAmount(b.prize), 'desc')
            }

            return 0
        })
        : filtered


    return (
        <div className="space-y-6">
            <div className="sticky top-26 z-30 bg-white/95 pb-4 backdrop-blur-md dark:bg-zinc-950/95">
                <div className="relative rounded-[1.8rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition-all duration-200 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md">
                    <div className="flex flex-wrap items-center gap-2 pr-10 sm:pr-12 lg:flex-nowrap">
                        <SearchBar value={search} onChange={setSearch} />
                        <FilterPanel
                            platform={platform}
                            setPlatform={setPlatform}
                            mode={mode}
                            setMode={setMode}
                            sortBy={sortBy}
                            setSortBy={value => setSortBy(value as SortBy)}
                            locationFilter={locationFilter}
                            setLocationFilter={setLocationFilter}
                        />
                    </div>

                    <div className="group absolute right-4 top-4 z-40">
                        <button
                            type="button"
                            aria-label="How deadlines and prize pool are shown"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                        >
                            <Info className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                        </button>

                        <div className="pointer-events-none absolute right-0 top-11 w-80 translate-y-1 rounded-xl border border-zinc-200 bg-white/95 px-3 py-3 text-xs leading-5 text-zinc-600 opacity-0 shadow-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-300">
                            <ul className="list-disc space-y-1.5 pl-4">
                                <li>Deadlines use a 3-day safety buffer only when the actual date is more than 5 days away.</li>
                                <li>When a deadline is within 5 days, the exact date is shown.</li>
                                <li>Prize values are normalized to a total amount when source data is track-wise.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <LoadingProgress progress={progressDisplay} />
                ) : filteredAndSorted.length ? (
                    <div className={`grid grid-cols-1 gap-6 transition-all duration-300 sm:grid-cols-2 xl:grid-cols-3 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {filteredAndSorted.map(hack => (
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