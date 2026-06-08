import { RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'
import SearchBar from './SearchBar'
import FilterPanel from './FilterPanel'
import LoadingProgress from './LoadingProgress'
import { usePageChrome } from '../context/pageChrome'
import { useAuth, useCache, useToast } from '../context'
import { teamApi } from '../services'

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



const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'

const HackathonList = () => {
    const navigate = useNavigate()
    const { hackathons: cachedHackathons, setHackathons: setCachedHackathons, hackathonsFilters, setHackathonsFilters } = useCache()
    const isInitialMountRef = useRef(true)
    const initialCacheRef = useRef(cachedHackathons)

    const [hackathons, setHackathons] = useState<Hackathon[]>(cachedHackathons || [])
    const [loading, setLoading] = useState(!cachedHackathons)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [refreshNonce, setRefreshNonce] = useState(0)
    const [hasLoadedFromServer, setHasLoadedFromServer] = useState(!!cachedHackathons)
    const [progressTarget, setProgressTarget] = useState(cachedHackathons ? 100 : 0)
    const [progressDisplay, setProgressDisplay] = useState(cachedHackathons ? 100 : 0)
    const [showResults, setShowResults] = useState(!!cachedHackathons)
    const [search, setSearch] = useState(hackathonsFilters.search)
    const [platform, setPlatform] = useState(hackathonsFilters.platform)
    const [mode, setMode] = useState(hackathonsFilters.mode)
    const [sortBy, setSortBy] = useState<SortBy>(hackathonsFilters.sortBy as SortBy)
    const [locationFilter, setLocationFilter] = useState(hackathonsFilters.locationFilter)
    const [showExpired, setShowExpired] = useState(hackathonsFilters.showExpired)
    const { isAuthenticated } = useAuth()
    const { showToast } = useToast()
    const [isDesktopView, setIsDesktopView] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false
        }

        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    })
    const deferredSearch = useDeferredValue(search)
    const { setPageActions } = usePageChrome()

    const [showFunnelModal, setShowFunnelModal] = useState(false)
    const [trackedHackathons, setTrackedHackathons] = useState<Record<string, {
        teamId: string;
        participationId: string;
        status: 'tracking' | 'active' | 'eliminated' | 'finalist' | 'won';
    }>>({})
    const [teams, setTeams] = useState<any[]>([])
    const [selectedHackathonToTrack, setSelectedHackathonToTrack] = useState<string | null>(null)
    const [selectedTeamIdToTrack, setSelectedTeamIdToTrack] = useState<string>('')
    const [showTrackModal, setShowTrackModal] = useState(false)
    const [isTrackingSubmitting, setIsTrackingSubmitting] = useState(false)
    const [showUntrackConfirmModal, setShowUntrackConfirmModal] = useState(false)
    const [hackathonIdToUntrack, setHackathonIdToUntrack] = useState<string | null>(null)
    const [isUntrackingSubmitting, setIsUntrackingSubmitting] = useState(false)

    const loadTrackedHackathons = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const userTeams = await teamApi.getUserTeams();
            setTeams(userTeams);
            const mapping: Record<string, {
                teamId: string;
                participationId: string;
                status: 'tracking' | 'active' | 'eliminated' | 'finalist' | 'won';
            }> = {};
            for (const t of userTeams) {
                const ths = await teamApi.getTeamHackathons(t._id);
                ths.forEach(th => {
                    mapping[th.hackathon._id] = {
                        teamId: t._id,
                        participationId: th._id,
                        status: th.status as any,
                    };
                });
            }
            setTrackedHackathons(mapping);
        } catch (error) {
            console.error('Failed to load tracking data', error);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        loadTrackedHackathons();
    }, [loadTrackedHackathons]);

    const handleInitiateTrack = (hackathonId: string) => {
        if (!isAuthenticated) {
            navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
            return;
        }
        setSelectedHackathonToTrack(hackathonId);
        if (teams.length > 0) {
            setSelectedTeamIdToTrack(teams[0]._id);
        }
        setShowTrackModal(true);
    };

    const handleConfirmTrack = async () => {
        if (!selectedHackathonToTrack || !selectedTeamIdToTrack) return;
        setIsTrackingSubmitting(true);
        try {
            await teamApi.linkHackathon(selectedTeamIdToTrack, selectedHackathonToTrack);
            await loadTrackedHackathons();
            setShowTrackModal(false);
            setSelectedHackathonToTrack(null);
        } catch (error: any) {
            showToast(error.response?.data?.message || error.message || "Failed to start tracking", "error");
        } finally {
            setIsTrackingSubmitting(false);
        }
    };

    const handleInitiateUntrack = (hackathonId: string) => {
        setHackathonIdToUntrack(hackathonId);
        setShowUntrackConfirmModal(true);
    };

    const handleConfirmUntrack = async () => {
        if (!hackathonIdToUntrack) return;
        const trackingInfo = trackedHackathons[hackathonIdToUntrack];
        if (!trackingInfo) return;
        setIsUntrackingSubmitting(true);
        try {
            await teamApi.unlinkHackathon(trackingInfo.teamId, hackathonIdToUntrack);
            showToast("Hackathon untracked successfully", "success");
            await loadTrackedHackathons();
            setShowUntrackConfirmModal(false);
            setHackathonIdToUntrack(null);
        } catch (error: any) {
            showToast(error.response?.data?.message || error.message || "Failed to untrack hackathon", "error");
        } finally {
            setIsUntrackingSubmitting(false);
        }
    };


    useEffect(() => {
        if (isAuthenticated) return;
        const dismissed = sessionStorage.getItem("dismissedSignupFunnel") === "true";
        if (dismissed) return;

        const timer = setTimeout(() => {
            setShowFunnelModal(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, [isAuthenticated]);

    const handleDismissFunnel = () => {
        setShowFunnelModal(false);
        sessionStorage.setItem("dismissedSignupFunnel", "true");
    }

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
        setHackathonsFilters({
            search: deferredSearch,
            platform,
            mode,
            locationFilter,
            sortBy,
            showExpired,
        });
    }, [deferredSearch, platform, mode, locationFilter, sortBy, showExpired, setHackathonsFilters]);

    useEffect(() => {
        let isMounted = true
        let finishTimeout: number | undefined
        let retryTimeout: number | undefined
        let activeRequestAbort: AbortController | null = null
        let retryAttempt = 0

        const isInitialMount = isInitialMountRef.current;
        isInitialMountRef.current = false;

        const hadCachedData = initialCacheRef.current;
        initialCacheRef.current = null;
        const isSilentRevalidation = isInitialMount && !!hadCachedData;

        if (!isSilentRevalidation) {
            setLoading(true)
        }

        const fallbackProgress = window.setInterval(() => {
            setProgressTarget(previous => Math.max(previous, Math.min(previous + Math.random() * 6, 92)))
        }, 220)

        const fetchHackathons = () => {
            activeRequestAbort = new AbortController()

            axiosInstance.get('/hackathons', {
                signal: activeRequestAbort.signal,
                params: {
                    search: deferredSearch,
                    platform,
                    mode,
                    location: locationFilter,
                    sortBy,
                    showExpired: showExpired ? "true" : "false"
                },
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

                    const responseData = Array.isArray(res.data?.data)
                        ? res.data.data
                        : Array.isArray(res.data)
                            ? res.data
                            : []
                    window.clearInterval(fallbackProgress)
                    setHackathons(responseData)
                    setCachedHackathons(responseData)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshNonce, deferredSearch, platform, mode, locationFilter, sortBy, showExpired, setCachedHackathons])

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

    const visibleHackathons = hackathons

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
                    showExpired={showExpired}
                    setShowExpired={setShowExpired}
                />
            </div>
        )
    }, [
        search,
        platform,
        mode,
        sortBy,
        locationFilter,
        showExpired,
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
                        showExpired={showExpired}
                        setShowExpired={setShowExpired}
                    />
                </div>
            </div>

            <div className="relative space-y-4">
                {isStillLoading && (
                    <div className="absolute inset-0 z-20 flex justify-center items-start pt-20 sm:items-center sm:pt-0 bg-zinc-950/5 dark:bg-black/10 backdrop-blur-[2.5px] p-4 rounded-3xl">
                        <div className="w-full max-w-sm shrink-0">
                            <LoadingProgress progress={progressDisplay} label={loadingLabel} />
                        </div>
                    </div>
                )}

                {isStillLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 opacity-40 select-none pointer-events-none">
                        {Array.from({ length: isDesktopView ? 8 : 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-84 rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="h-full w-full rounded-2xl bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
                            </div>
                        ))}
                    </div>
                ) : visibleHackathons.length ? (
                    <div className={`grid grid-cols-1 gap-4 transition-all duration-300 sm:grid-cols-2 xl:grid-cols-4 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {visibleHackathons.map((hack, index) => {
                            const trackingInfo = trackedHackathons[hack._id];
                            const isTracked = !!trackingInfo;
                            return (
                                <HackathonCard
                                    key={hack._id}
                                    hackathon={hack}
                                    displayIndex={index}
                                    trackingStatus={trackingInfo?.status}
                                    onUntrack={() => handleInitiateUntrack(hack._id)}
                                    extraActions={[
                                        { label: isTracked ? "TRACKED_TRUE" : "TRACKED_FALSE", onClick: () => {} },
                                        { label: "TRACK_HANDLER", onClick: () => handleInitiateTrack(hack._id) }
                                    ]}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className={`rounded-[1.8rem] border border-zinc-200/90 bg-white/90 px-6 py-16 text-center text-base text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 dark:shadow-md ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {emptyStateMessage}
                    </div>
                )}
            </div>

            {/* Guest funnel signup prompt popup modal */}
            <AnimatePresence>
                {showFunnelModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[4px] px-4 py-8"
                    >
                        <motion.div
                            initial={{ y: 24, scale: 0.96, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: 20, scale: 0.96, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-[2.25rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 relative overflow-hidden"
                        >

                            <div className="flex flex-col items-center text-center space-y-4 pt-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/20 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shadow-xs animate-pulse-blink mb-2">
                                    100% Free • Built for us! ❤️
                                </span>

                                <div className="space-y-4 w-full">
                                    <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                                        Ready to Win Your Next Hackathon?
                                    </h3>
                                    
                                    <div className="space-y-3.5 text-left bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">What you get instantly:</p>
                                        {[
                                            { title: 'Advanced Discover Filters', desc: 'Devfolio, Unstop, Devpost & more in one place.' },
                                            { title: 'Collaborative Team Workspace', desc: 'Manage rosters, invite partners, and build together.' },
                                            { title: 'Milestone Timeline Tracker', desc: 'Monitor stage deadlines and qualified states.' },
                                            { title: 'Async Reflection Logs', desc: 'Turn rejections into winning insights and portfolios.' }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2.5 text-sm">
                                                <svg className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <div>
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs leading-normal">{item.title}</span>
                                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col w-full gap-2.5 pt-2">
                                    <button
                                        onClick={() => {
                                            handleDismissFunnel();
                                            navigate("/signup?returnTo=/hackathons");
                                        }}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-500 hover:-translate-y-0.5 cursor-pointer"
                                    >
                                        Create Free Account
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDismissFunnel();
                                            navigate("/login?returnTo=/hackathons");
                                        }}
                                        className="w-full text-center rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                                    >
                                        Log In to Workspace
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {showTrackModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[4px] px-4 py-8"
                    >
                        <motion.div
                            initial={{ y: 24, scale: 0.96, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: 20, scale: 0.96, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Track Hackathon</h3>
                            <p className="mt-1 text-xs text-zinc-550 dark:text-zinc-400">Select which of your developer teams will compete in this hackathon to start tracking.</p>

                            {teams.length === 0 ? (
                                <div className="mt-4 text-center py-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">You don't have any teams yet.</p>
                                    <button
                                        onClick={() => {
                                            setShowTrackModal(false);
                                            navigate("/teams");
                                        }}
                                        className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500 cursor-pointer"
                                    >
                                        Create a Team
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block mb-1">Select Team</label>
                                        <select
                                            value={selectedTeamIdToTrack}
                                            onChange={(e) => setSelectedTeamIdToTrack(e.target.value)}
                                            className="select-field"
                                        >
                                            {teams.map(t => (
                                                <option key={t._id} value={t._id} className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">{t.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            onClick={() => setShowTrackModal(false)}
                                            className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmTrack}
                                            disabled={isTrackingSubmitting}
                                            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            {isTrackingSubmitting ? "Tracking..." : "Confirm"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
                {showUntrackConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[4px] px-4 py-8"
                    >
                        <motion.div
                            initial={{ y: 24, scale: 0.96, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: 20, scale: 0.96, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm rounded-[2.25rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-center"
                        >
                            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-455 mb-4 shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Untrack Hackathon?</h3>
                            <p className="mt-2 text-xs text-zinc-550 dark:text-zinc-400 leading-normal">
                                Are you sure you want to stop tracking this hackathon? This will permanently delete your timeline stages and reflections for this team's participation.
                            </p>

                            <div className="flex gap-2.5 pt-4">
                                <button
                                    onClick={() => {
                                        setShowUntrackConfirmModal(false);
                                        setHackathonIdToUntrack(null);
                                    }}
                                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmUntrack}
                                    disabled={isUntrackingSubmitting}
                                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isUntrackingSubmitting ? "Untracking..." : "Untrack"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}

export default HackathonList;