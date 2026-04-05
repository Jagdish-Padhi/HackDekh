import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
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
const DESKTOP_ITEMS_PER_PAGE = 3
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

const HackathonList = () => {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false)
    const [progressTarget, setProgressTarget] = useState(0)
    const [progressDisplay, setProgressDisplay] = useState(0)
    const [showResults, setShowResults] = useState(false)
    const [search, setSearch] = useState('')
    const [platform, setPlatform] = useState('')
    const [mode, setMode] = useState('')
    const [sortBy, setSortBy] = useState<SortBy>('')
    const [locationFilter, setLocationFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [isEditingPageTag, setIsEditingPageTag] = useState(false)
    const [pageInputValue, setPageInputValue] = useState('1')
    const [isDesktopView, setIsDesktopView] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false
        }

        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    })
    const deferredSearch = useDeferredValue(search)

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
    }, [])

    const loadingLabel = hasLoadedFromServer
        ? 'Loading hackathons'
        : 'Connecting to server and loading hackathons'

    const filtered = useMemo(() => {
        const normalizedSearch = deferredSearch.trim().toLowerCase()

        return hackathons.filter(h =>
            !hasDeadlinePassed(h.deadline) &&
            h.title.toLowerCase().includes(normalizedSearch) &&
            (platform ? h.platform === platform : true) &&
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

    const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / DESKTOP_ITEMS_PER_PAGE))

    useEffect(() => {
        setCurrentPage(1)
    }, [deferredSearch, platform, mode, sortBy, locationFilter])

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    const pageStart = (currentPage - 1) * DESKTOP_ITEMS_PER_PAGE
    const paginatedHackathons = filteredAndSorted.slice(pageStart, pageStart + DESKTOP_ITEMS_PER_PAGE)
    const visibleHackathons = isDesktopView ? paginatedHackathons : filteredAndSorted

    const isStillLoading = loading || !hasLoadedFromServer

    const emptyStateMessage = hackathons.length === 0
        ? 'No hackathons found...'
        : 'No hackathons found for current filters.'

    const activatePageTagEdit = () => {
        setPageInputValue(String(currentPage))
        setIsEditingPageTag(true)
    }

    const cancelPageTagEdit = () => {
        setPageInputValue(String(currentPage))
        setIsEditingPageTag(false)
    }

    const commitPageTagEdit = () => {
        const parsedPage = Number.parseInt(pageInputValue, 10)
        if (Number.isFinite(parsedPage)) {
            const clampedPage = Math.max(1, Math.min(totalPages, parsedPage))
            setCurrentPage(clampedPage)
        }

        setIsEditingPageTag(false)
    }


    return (
        <div className="space-y-6">
            <div className="sticky top-26 z-30 bg-white/95 pb-4 backdrop-blur-md dark:bg-zinc-950/95">
                <div className="relative rounded-[1.8rem] border border-zinc-200 bg-zinc-50 p-4 pt-13 shadow-sm transition-all duration-200 sm:p-5 sm:pt-14 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md">
                    <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
                            <SearchBar value={search} onChange={setSearch} />
                            {!isStillLoading && isDesktopView && filteredAndSorted.length > 0 && (
                                <div className="hidden items-center gap-2 lg:flex">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(previous => Math.max(1, previous - 1))}
                                        disabled={currentPage <= 1}
                                        aria-label="Go to previous page"
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                                    >
                                        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                    </button>
                                    {isEditingPageTag ? (
                                        <input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            value={pageInputValue}
                                            autoFocus
                                            onChange={(event) => setPageInputValue(event.target.value)}
                                            onBlur={commitPageTagEdit}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault()
                                                    commitPageTagEdit()
                                                }

                                                if (event.key === 'Escape') {
                                                    event.preventDefault()
                                                    cancelPageTagEdit()
                                                }
                                            }}
                                            className="h-10 w-30 rounded-full border border-blue-300 bg-blue-50 px-3 py-2 text-center text-xs font-semibold text-blue-700 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-blue-400/35 dark:bg-blue-500/12 dark:text-blue-300"
                                            aria-label="Enter page number"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={activatePageTagEdit}
                                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-[0_0_0_1px_rgba(59,130,246,0.12)] transition-colors hover:border-blue-400 dark:border-blue-400/35 dark:bg-blue-500/12 dark:text-blue-300 dark:hover:border-blue-300"
                                            aria-label="Edit page number"
                                        >
                                            Page {currentPage} / {totalPages}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(previous => Math.min(totalPages, previous + 1))}
                                        disabled={currentPage >= totalPages}
                                        aria-label="Go to next page"
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                                    >
                                        <ChevronRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-full lg:min-w-0 lg:flex-1">
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

                    <div className="group absolute right-4 top-4 z-40 sm:right-5 sm:top-5">
                        <button
                            type="button"
                            aria-label="How deadlines and prize pool are shown"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25 dark:border-blue-500/35 dark:bg-blue-500/12 dark:text-blue-300 dark:hover:border-blue-400 dark:hover:text-blue-200"
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
                {isStillLoading ? (
                    <div className="space-y-6">
                        <LoadingProgress progress={progressDisplay} label={loadingLabel} />
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: isDesktopView ? DESKTOP_ITEMS_PER_PAGE : 6 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-92 rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="h-full w-full rounded-2xl bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : filteredAndSorted.length ? (
                    <div className={`grid grid-cols-1 gap-6 transition-all duration-300 sm:grid-cols-2 xl:grid-cols-3 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {visibleHackathons.map(hack => (
                            <HackathonCard key={hack._id} hackathon={hack} />
                        ))}
                    </div>
                ) : (
                    <div className={`rounded-[1.8rem] border border-zinc-200/90 bg-white/90 px-6 py-16 text-center text-base text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 dark:shadow-md ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {emptyStateMessage}
                    </div>
                )}
            </div>

            {!isStillLoading && filteredAndSorted.length > 0 && isDesktopView && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white/90 px-4 py-3 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/85 dark:text-zinc-300">
                    <p className="font-medium">
                        Showing {pageStart + 1}-{Math.min(pageStart + DESKTOP_ITEMS_PER_PAGE, filteredAndSorted.length)} of {filteredAndSorted.length}
                    </p>
                    {isEditingPageTag ? (
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageInputValue}
                            onChange={(event) => setPageInputValue(event.target.value)}
                            onBlur={commitPageTagEdit}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault()
                                    commitPageTagEdit()
                                }

                                if (event.key === 'Escape') {
                                    event.preventDefault()
                                    cancelPageTagEdit()
                                }
                            }}
                            className="h-9 w-28 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-center text-xs font-semibold text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                            aria-label="Enter page number"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={activatePageTagEdit}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-blue-400"
                            aria-label="Edit page number"
                        >
                            Page {currentPage} / {totalPages}
                        </button>
                    )}
                </div>
            )}

        </div>
    )
}

export default HackathonList