import { RefreshCw } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'
import SearchBar from './SearchBar'
import FilterPanel from './FilterPanel'
import LoadingProgress from './LoadingProgress'
import { usePageChrome } from '../context/pageChrome'

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
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

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

const normalizePlatform = (value?: string) =>
    value?.trim().toLowerCase().replace(/\s+/g, ' ') || ''

const matchesPlatformFilter = (hackathonPlatform: string | undefined, selectedPlatform: string) => {
    if (!selectedPlatform) {
        return true
    }

    const normalizedSelected = normalizePlatform(selectedPlatform)
    const normalizedHackathonPlatform = normalizePlatform(hackathonPlatform)

    if (!normalizedHackathonPlatform) {
        return false
    }

    if (normalizedHackathonPlatform === normalizedSelected) {
        return true
    }

    // Be tolerant to minor API value variations such as "UnStop" / "unstop.com".
    if (normalizedSelected === 'unstop') {
        return normalizedHackathonPlatform.includes('unstop')
    }

    if (normalizedSelected === 'devfolio') {
        return normalizedHackathonPlatform.includes('devfolio')
    }

    return false
}

const HackathonList = () => {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [refreshNonce, setRefreshNonce] = useState(0)
    const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false)
    const [progressTarget, setProgressTarget] = useState(0)
    const [progressDisplay, setProgressDisplay] = useState(0)
    const [showResults, setShowResults] = useState(false)
    const [search, setSearch] = useState('')
    const [platform, setPlatform] = useState('')
    const [mode, setMode] = useState('')
    const [sortBy, setSortBy] = useState<SortBy>('')
    const [locationFilter, setLocationFilter] = useState('')
    const [isDesktopView, setIsDesktopView] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false
        }

        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    })
    const deferredSearch = useDeferredValue(search)
    const { setPageActions } = usePageChrome()

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }

        const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
        const updateViewMode = () => setIsDesktopView(mediaQuery.matches)

        updateViewMode()
        mediaQuery.addEventListener('change', updateViewMode)

        return () => mediaQuery.removeEventListener('change', updateViewMode)
    }, [])

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
        let retryTimeout: number | undefined
        let activeRequestAbort: AbortController | null = null
        let retryAttempt = 0

        const fallbackProgress = window.setInterval(() => {
            setProgressTarget(previous => Math.max(previous, Math.min(previous + Math.random() * 6, 92)))
        }, 220)

        const fetchHackathons = () => {
            activeRequestAbort = new AbortController()

            axiosInstance.get('/hackathons', {
                signal: activeRequestAbort.signal,
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

                    const responseData = Array.isArray(res.data) ? res.data : []
                    window.clearInterval(fallbackProgress)
                    setHackathons(responseData)
                    setHasLoadedFromServer(true)
                    setProgressTarget(100)
                    finishTimeout = window.setTimeout(() => {
                        if (!isMounted) {
                            return
                        }
                        setLoading(false)
                        setIsRefreshing(false)
                    }, 280)
                })
                .catch(() => {
                    if (!isMounted) {
                        return
                    }

                    // Keep loading visible during cold starts/transient failures and retry.
                    retryAttempt += 1
                    setProgressTarget(previous => Math.max(25, Math.min(previous, 85)))
                    retryTimeout = window.setTimeout(fetchHackathons, Math.min(2500 + retryAttempt * 1000, 10000))
                })
        }

        fetchHackathons()

        return () => {
            isMounted = false
            activeRequestAbort?.abort()
            window.clearInterval(fallbackProgress)
            if (retryTimeout) {
                window.clearTimeout(retryTimeout)
            }
            if (finishTimeout) {
                window.clearTimeout(finishTimeout)
            }
        }
    }, [refreshNonce])

    const isStillLoading = loading || !hasLoadedFromServer

    const handleRefresh = useCallback(() => {
        if (isStillLoading) {
            return
        }

        setIsRefreshing(true)
        setLoading(true)
        setHasLoadedFromServer(false)
        setShowResults(false)
        setProgressDisplay(0)
        setProgressTarget(8)
        setRefreshNonce(previous => previous + 1)
    }, [isStillLoading])

    const loadingLabel = hasLoadedFromServer
        ? 'Loading hackathons'
        : 'Connecting to server and loading hackathons'

    const filtered = useMemo(() => {
        const normalizedSearch = deferredSearch.trim().toLowerCase()

        return hackathons.filter(h =>
            !hasDeadlinePassed(h.deadline) &&
            h.title.toLowerCase().includes(normalizedSearch) &&
            matchesPlatformFilter(h.platform, platform) &&
            (mode ? h.mode === mode : true) &&
            matchesLocationFilter(h.location, locationFilter)
        )
    }, [hackathons, deferredSearch, platform, mode, locationFilter])

    const filteredAndSorted = useMemo(() => {
        if (!sortBy) {
            return filtered
        }

        return [...filtered].sort((a, b) => {
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
    }, [filtered, sortBy])

    const visibleHackathons = filteredAndSorted

    const emptyStateMessage = hackathons.length === 0
        ? 'No hackathons found...'
        : 'No hackathons found for current filters.'

    const pageActions = useMemo(() => {
        return (
            <div className="flex w-auto max-w-full min-w-0 items-center justify-end gap-2 overflow-visible">
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isStillLoading}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                    aria-label="Refresh hackathons"
                    title="Refresh hackathons"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="w-72 min-w-48 max-w-[20rem] shrink">
                    <SearchBar value={search} onChange={setSearch} />
                </div>
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
        )
    }, [
        search,
        platform,
        mode,
        sortBy,
        locationFilter,
        handleRefresh,
        isStillLoading,
        isRefreshing,
    ])

    useEffect(() => {
        setPageActions(pageActions)

        return () => setPageActions(null)
    }, [pageActions, setPageActions])


    return (
        <div className="space-y-4">
            <div className="relative z-50 isolate space-y-3 lg:hidden">
                <div className="relative z-50 isolate overflow-visible rounded-3xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/78 dark:shadow-md">
                    <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                            <SearchBar value={search} onChange={setSearch} />
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isStillLoading}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                            aria-label="Refresh hackathons"
                            title="Refresh hackathons"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="relative z-50 isolate overflow-visible rounded-3xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/78 dark:shadow-md">
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
            </div>

            <div className="space-y-4">
                {isStillLoading ? (
                    <div className="space-y-4">
                        <LoadingProgress progress={progressDisplay} label={loadingLabel} />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: isDesktopView ? 8 : 6 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-84 rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="h-full w-full rounded-2xl bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : filteredAndSorted.length ? (
                    <div className={`grid grid-cols-1 gap-4 transition-all duration-300 sm:grid-cols-2 xl:grid-cols-4 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {visibleHackathons.map((hack, index) => (
                            <HackathonCard key={hack._id} hackathon={hack} displayIndex={index} />
                        ))}
                    </div>
                ) : (
                    <div className={`rounded-[1.8rem] border border-zinc-200/90 bg-white/90 px-6 py-16 text-center text-base text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 dark:shadow-md ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {emptyStateMessage}
                    </div>
                )}
            </div>

        </div>
    )
}

export default HackathonList