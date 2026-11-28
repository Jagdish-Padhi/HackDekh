import { RefreshCw, ArrowRight, AlertTriangle, X, SlidersHorizontal } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import HackathonCard from './HackathonCard'
import axiosInstance from '../utils/axiosInstance'
import SearchBar from './SearchBar'
import FilterPanel from './FilterPanel'
import LoadingProgress from './LoadingProgress'
import AppDropdown from './AppDropdown'
import { usePageChrome } from '../context/pageChrome'
import { useAuth, useCache, useToast } from '../context'
import type { UserPreferences } from '../context/AuthContext'
import { teamApi, userApi } from '../services'
import FitCheckModal from './FitCheckModal'
import {
    evaluateHackathonFit,
    hasConfiguredPreferences,
    loadLocalPreferences,
    saveLocalPreferences,
} from '../utils/fitEngine'
import posthog, { isPostHogEnabled, posthogLog } from '../posthog'

type Hackathon = {
    _id: string
    slug?: string
    title: string
    platform: string
    coverImage?: string
    startDate?: string
    deadline?: string
    mode?: string
    prize?: string
    location?: string
    teamSize?: string
}

function matchesTeamSizeFilter(teamSize?: string, filter?: string): boolean {
    if (!filter) return true
    if (!teamSize?.trim()) return false

    const raw = teamSize.trim().toLowerCase()
    let min = 0
    let max = 0

    if (/solo|individual/i.test(raw)) {
        min = 1
        max = 1
    } else {
        const nums = raw.match(/\d+/g)?.map(Number).filter((n) => !Number.isNaN(n)) || []
        if (nums.length === 0) return false
        min = Math.min(...nums)
        max = Math.max(...nums)
    }

    if (filter === '1') return min <= 1 && max >= 1
    if (filter === '2-3') return min <= 3 && max >= 2
    if (filter === '4-5') return min <= 5 && max >= 4
    if (filter === '6+') return max >= 6
    return true
}

type SortBy = '' | 'best-fit' | 'deadline-asc' | 'deadline-desc' | 'prize-desc' | 'prize-asc'



const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)'
const FRONTEND_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const HackathonList = () => {
    const navigate = useNavigate()
    const {
        hackathons: cachedHackathons,
        setHackathons: setCachedHackathons,
        hackathonsCacheMeta,
        setHackathonsCacheMeta,
        hackathonsFilters,
        setHackathonsFilters,
        invalidateUserCaches,
    } = useCache()
    const isInitialMountRef = useRef(true)
    const initialCacheRef = useRef(cachedHackathons)

    const [hackathons, setHackathons] = useState<Hackathon[]>(cachedHackathons || [])
    const [loading, setLoading] = useState(!cachedHackathons)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [refreshNonce, setRefreshNonce] = useState(0)
    const [hasLoadedFromServer, setHasLoadedFromServer] = useState(!!cachedHackathons)
    const isStillLoading = loading || !hasLoadedFromServer
    const [showResults, setShowResults] = useState(!!cachedHackathons)
    const [search, setSearch] = useState(hackathonsFilters.search)
    const [platform, setPlatform] = useState(hackathonsFilters.platform)
    const [mode, setMode] = useState(hackathonsFilters.mode)
    const [sortBy, setSortBy] = useState<SortBy>(hackathonsFilters.sortBy as SortBy)
    const [locationFilter, setLocationFilter] = useState(hackathonsFilters.locationFilter)
    const [teamSizeFilter, setTeamSizeFilter] = useState(hackathonsFilters.teamSizeFilter)
    const { isAuthenticated, user, updateUser } = useAuth()
    const { showToast } = useToast()
    const [fitModalHackathon, setFitModalHackathon] = useState<Hackathon | null>(null)
    const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(() => loadLocalPreferences())
    const activePreferences = useMemo(() => {
        if (user?.preferences && hasConfiguredPreferences(user.preferences)) {
            return user.preferences
        }
        return localPreferences
    }, [user?.preferences, localPreferences])

    const handleSavePreferences = useCallback(async (prefs: UserPreferences) => {
        setLocalPreferences(prefs)
        saveLocalPreferences(prefs)
        if (isAuthenticated && user) {
            try {
                const updatedUser = await userApi.updatePreferences(prefs)
                updateUser({ ...user, ...updatedUser, preferences: updatedUser?.preferences || prefs })
                showToast('Participation preferences saved.', 'success')
            } catch {
                showToast('Saved locally. Could not sync to profile.', 'error')
            }
        } else {
            showToast('Preferences saved for this browser.', 'success')
        }
    }, [isAuthenticated, user, updateUser, showToast])
    const [isDesktopView, setIsDesktopView] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false
        }

        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    })
    const deferredSearch = useDeferredValue(search)
    const { sidebarExpanded, closeSidebar, toggleSidebar, setPageActions } = usePageChrome()
    const [sidebarWasExpanded, setSidebarWasExpanded] = useState(false)
    const sidebarWasExpandedRef = useRef(false)
    const toggleSidebarRef = useRef(toggleSidebar)

    useEffect(() => {
        sidebarWasExpandedRef.current = sidebarWasExpanded
    }, [sidebarWasExpanded])

    useEffect(() => {
        toggleSidebarRef.current = toggleSidebar
    }, [toggleSidebar])

    const hasCollapsedSidebarRef = useRef(false)

    // Reset when loading starts
    useEffect(() => {
        if (isStillLoading) {
            hasCollapsedSidebarRef.current = false
        }
    }, [isStillLoading])

    // Collapse sidebar to give full width to hackathons grid after loading finishes
    useEffect(() => {
        if (!isStillLoading && !hasCollapsedSidebarRef.current) {
            hasCollapsedSidebarRef.current = true
            if (sidebarExpanded) {
                setSidebarWasExpanded(true)
                closeSidebar()
            }
        }
    }, [isStillLoading, sidebarExpanded, closeSidebar])

    // Restore sidebar on unmount if it was expanded before this page collapsed it
    useEffect(() => {
        return () => {
            if (sidebarWasExpandedRef.current) {
                toggleSidebarRef.current()
            }
        }
    }, [])

    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const activeFilterCount = [
        platform !== 'all',
        mode !== 'all',
        sortBy !== '',
        locationFilter !== 'all',
        teamSizeFilter !== 'all',
    ].filter(Boolean).length
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

            // Fetch all team hackathons in parallel
            await Promise.all(
                userTeams.map(async (t) => {
                    try {
                        const ths = await teamApi.getTeamHackathons(t._id);
                        ths.forEach(th => {
                            mapping[th.hackathon._id] = {
                                teamId: t._id,
                                participationId: th._id,
                                status: th.status as any,
                            };
                        });
                    } catch (err) {
                        console.error(`Failed to load hackathons for team ${t._id}`, err);
                    }
                })
            );

            setTrackedHackathons(mapping);
        } catch (error) {
            console.error('Failed to load tracking data', error);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        loadTrackedHackathons();
    }, [loadTrackedHackathons]);

    const trackOnTeam = async (hackathonId: string, teamId: string, teamName?: string) => {
        const hackathon = hackathons.find((item) => item._id === hackathonId);
        const tempId = `optimistic_${Date.now()}`;
        setTrackedHackathons(prev => ({
            ...prev,
            [hackathonId]: {
                teamId,
                participationId: tempId,
                status: 'tracking'
            }
        }));

        try {
            const response = await teamApi.linkHackathon(teamId, hackathonId);
            setTrackedHackathons(prev => {
                if (prev[hackathonId]?.participationId === tempId) {
                    return {
                        ...prev,
                        [hackathonId]: {
                            teamId,
                            participationId: response._id,
                            status: response.status as any
                        }
                    };
                }
                return prev;
            });
            invalidateUserCaches();
            if (isPostHogEnabled) {
                const trackingAttributes = {
                    platform: hackathon?.platform || 'unknown',
                    mode: hackathon?.mode || 'unknown',
                };
                posthog.capture('hackathon_tracked', trackingAttributes);
                posthogLog.info('hackathon tracking started', trackingAttributes);
            }
            showToast(teamName ? `Tracked under "${teamName}".` : "Hackathon tracked successfully.", "success");
        } catch (error: any) {
            console.error("Failed to track hackathon in background", error);
            setTrackedHackathons(prev => {
                if (prev[hackathonId]?.participationId === tempId) {
                    const next = { ...prev };
                    delete next[hackathonId];
                    return next;
                }
                return prev;
            });
            showToast(error.response?.data?.message || error.message || "Failed to start tracking", "error");
        }
    };

    const handleInitiateTrack = async (hackathonId: string) => {
        if (!isAuthenticated) {
            setShowFunnelModal(true);
            return;
        }
        if (teams.length === 0) {
            try {
                const personalTeam = await teamApi.createTeam({ name: "Personal" });
                setTeams([personalTeam]);
                invalidateUserCaches();
                await trackOnTeam(hackathonId, personalTeam._id, personalTeam.name);
            } catch (error: any) {
                showToast(error.response?.data?.message || "Failed to track hackathon", "error");
            }
            return;
        }
        if (teams.length === 1) {
            await trackOnTeam(hackathonId, teams[0]._id, teams[0].name);
            return;
        }
        setSelectedHackathonToTrack(hackathonId);
        setSelectedTeamIdToTrack(teams[0]._id);
        setShowTrackModal(true);
    };

    const handleConfirmTrack = async () => {
        if (!selectedHackathonToTrack || !selectedTeamIdToTrack) return;
        const hackathonId = selectedHackathonToTrack;
        const teamId = selectedTeamIdToTrack;

        setShowTrackModal(false);
        setSelectedHackathonToTrack(null);
        setIsTrackingSubmitting(false);

        await trackOnTeam(hackathonId, teamId);
    };

    const handleInitiateUntrack = (hackathonId: string) => {
        setHackathonIdToUntrack(hackathonId);
        setShowUntrackConfirmModal(true);
    };

    const handleConfirmUntrack = async () => {
        if (!hackathonIdToUntrack) return;
        const hackathonId = hackathonIdToUntrack;
        const trackingInfo = trackedHackathons[hackathonId];
        if (!trackingInfo) return;

        // 1. Save original info in case of rollback
        const originalInfo = { ...trackingInfo };

        // 2. Optimistically remove from tracking mapping
        setTrackedHackathons(prev => {
            const next = { ...prev };
            delete next[hackathonId];
            return next;
        });

        // 3. Close modal instantly
        setShowUntrackConfirmModal(false);
        setHackathonIdToUntrack(null);
        setIsUntrackingSubmitting(false);

        try {
            // 4. Fire API in background
            await teamApi.unlinkHackathon(trackingInfo.teamId, hackathonId);
            if (isPostHogEnabled) {
                posthog.capture('hackathon_untracked');
            }
            showToast("Hackathon untracked successfully", "success");
        } catch (error: any) {
            console.error("Failed to untrack in background", error);

            // 5. Revert optimistic removal on failure
            setTrackedHackathons(prev => ({
                ...prev,
                [hackathonId]: originalInfo
            }));
            showToast(error.response?.data?.message || error.message || "Failed to untrack hackathon", "error");
        }
    };


    const handleDismissFunnel = () => {
        setShowFunnelModal(false);
    };

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
            teamSizeFilter,
        });
    }, [deferredSearch, platform, mode, locationFilter, sortBy, teamSizeFilter, setHackathonsFilters]);

    useEffect(() => {
        let isMounted = true
        let finishTimeout: number | undefined
        let activeRequestAbort: AbortController | null = null

        const isInitialMount = isInitialMountRef.current;
        isInitialMountRef.current = false;

        const hadCachedData = initialCacheRef.current;
        initialCacheRef.current = null;
        const serverSortBy = sortBy === 'best-fit' ? '' : sortBy;
        const requestCacheKey = JSON.stringify({
            search: deferredSearch,
            platform,
            mode,
            locationFilter,
            sortBy: serverSortBy,
        });

        const isCacheFresh =
            refreshNonce === 0 &&
            !!cachedHackathons &&
            hackathonsCacheMeta?.key === requestCacheKey &&
            Date.now() - hackathonsCacheMeta.fetchedAt < FRONTEND_CACHE_TTL_MS;

        if (isCacheFresh) {
            setHackathons(cachedHackathons);
            setHasLoadedFromServer(true);
            setLoading(false);
            setIsRefreshing(false);
            return;
        }

        const isSilentRevalidation =
            refreshNonce === 0 &&
            ((isInitialMount && !!hadCachedData) || (!!cachedHackathons && hackathonsCacheMeta?.key === requestCacheKey));

        if (!isSilentRevalidation) {
            setLoading(true)
        }


        const fetchHackathons = () => {
            activeRequestAbort = new AbortController()

            axiosInstance.get('/hackathons', {
                signal: activeRequestAbort.signal,
                params: {
                    search: deferredSearch,
                    platform,
                    mode,
                    location: locationFilter,
                    sortBy: serverSortBy,
                    showExpired: "false"
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
                    setHackathons(responseData)
                    setCachedHackathons(responseData)
                    setHackathonsCacheMeta({ key: requestCacheKey, fetchedAt: Date.now() })
                    setHasLoadedFromServer(true)
                    finishTimeout = window.setTimeout(() => {
                        if (!isMounted) {
                            return
                        }
                        setLoading(false)
                        setIsRefreshing(false)
                    }, 280)
                })
                .catch((error) => {
                    if (!isMounted) {
                        return
                    }

                    if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
                        return
                    }

                    console.error("[Hackathons] Failed to load hackathons:", error?.message || error)
                    // Release loading spinner gracefully without annoying intrusive error toasts
                    setLoading(false)
                    setIsRefreshing(false)
                })
        }

        fetchHackathons()

        return () => {
            isMounted = false
            activeRequestAbort?.abort()
            if (finishTimeout) {
                window.clearTimeout(finishTimeout)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshNonce, deferredSearch, platform, mode, locationFilter, sortBy, setCachedHackathons])

    // isStillLoading is declared at top

    const handleRefresh = useCallback(() => {
        if (isStillLoading) {
            return
        }

        setIsRefreshing(true)
        setLoading(true)
        setHasLoadedFromServer(false)
        setShowResults(false)
        setRefreshNonce(previous => previous + 1)
    }, [isStillLoading])

    const loadingLabel = hasLoadedFromServer
        ? 'Loading hackathons'
        : 'Scraping from server for you...'

    const visibleHackathons = useMemo(() => {
        const filtered = teamSizeFilter
            ? hackathons.filter((h) => matchesTeamSizeFilter(h.teamSize, teamSizeFilter))
            : hackathons

        if (sortBy !== 'best-fit') return filtered
        return [...filtered].sort((a, b) => {
            const scoreA = evaluateHackathonFit(a, activePreferences).score
            const scoreB = evaluateHackathonFit(b, activePreferences).score
            return scoreB - scoreA
        })
    }, [hackathons, teamSizeFilter, sortBy, activePreferences])

    const handleShareHackathon = useCallback(async (hack: Hackathon) => {
        const shareUrl = `${window.location.origin}/hackathons/${hack.slug || hack._id}`
        const parts = [
            `${hack.title} (${hack.platform})`,
            hack.prize ? `Prize: ${hack.prize}` : null,
            hack.deadline ? `Deadline: ${new Date(hack.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
            shareUrl,
        ].filter(Boolean)

        try {
            await navigator.clipboard.writeText(parts.join(' • '))
            showToast('Hackathon link copied for sharing.', 'success')
        } catch {
            showToast('Could not copy hackathon link.', 'error')
        }
    }, [showToast])

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
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
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
                    teamSizeFilter={teamSizeFilter}
                    setTeamSizeFilter={setTeamSizeFilter}
                />
            </div>
        )
    }, [
        search,
        platform,
        mode,
        sortBy,
        locationFilter,
        teamSizeFilter,
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
            <div className="sticky top-14 z-40 -mx-3 px-3 py-2.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5 lg:hidden">
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <SearchBar value={search} onChange={setSearch} />
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen(prev => !prev)}
                        className={`relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-xs transition-all duration-200 cursor-pointer ${
                            mobileFiltersOpen || activeFilterCount > 0
                                ? 'border-blue-500/60 bg-blue-50 text-blue-600 dark:border-blue-500/50 dark:bg-blue-950/40 dark:text-blue-400'
                                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700'
                        }`}
                        aria-expanded={mobileFiltersOpen}
                        aria-label="Toggle filters"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Filter</span>
                        {activeFilterCount > 0 && (
                            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isStillLoading}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                        aria-label="Refresh hackathons"
                        title="Refresh hackathons"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {mobileFiltersOpen && (
                    <div className="pt-1 overflow-visible">
                        <FilterPanel
                            platform={platform}
                            setPlatform={setPlatform}
                            mode={mode}
                            setMode={setMode}
                            sortBy={sortBy}
                            setSortBy={value => setSortBy(value as SortBy)}
                            locationFilter={locationFilter}
                            setLocationFilter={setLocationFilter}
                            teamSizeFilter={teamSizeFilter}
                            setTeamSizeFilter={setTeamSizeFilter}
                        />
                    </div>
                )}
            </div>

            <div className="relative space-y-4">
                {isStillLoading && (
                    <div className="absolute inset-0 z-20 flex justify-center items-center bg-zinc-950/5 dark:bg-black/10 backdrop-blur-[2.5px] p-4 rounded-xl">
                        <div className="w-full max-w-sm shrink-0">
                            <LoadingProgress label={loadingLabel} />
                        </div>
                    </div>
                )}

                {isStillLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 opacity-40 select-none pointer-events-none">
                        {Array.from({ length: isDesktopView ? 8 : 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-84 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="h-full w-full rounded-lg bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
                            </div>
                        ))}
                    </div>
                ) : visibleHackathons.length ? (
                    <div className={`grid grid-cols-1 gap-4 transition-all duration-300 sm:grid-cols-2 xl:grid-cols-4 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
                        {visibleHackathons.map((hack, index) => {
                            const trackingInfo = trackedHackathons[hack._id];
                            const isTracked = !!trackingInfo;
                            const fitResult = hasConfiguredPreferences(activePreferences)
                                ? evaluateHackathonFit(hack, activePreferences)
                                : null;
                            return (
                                <HackathonCard
                                    key={hack._id}
                                    hackathon={hack}
                                    displayIndex={index}
                                    trackingStatus={trackingInfo?.status}
                                    onUntrack={() => handleInitiateUntrack(hack._id)}
                                    onWorthIt={() => setFitModalHackathon(hack)}
                                    onShare={() => handleShareHackathon(hack)}
                                    fitBadge={fitResult ? { label: fitResult.label, verdict: fitResult.verdict } : null}
                                    extraActions={[
                                        { label: isTracked ? "TRACKED_TRUE" : "TRACKED_FALSE", onClick: () => { } },
                                        { label: "TRACK_HANDLER", onClick: () => handleInitiateTrack(hack._id) }
                                    ]}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className={`rounded-xl border border-zinc-200 bg-white/90 px-6 py-16 text-center text-base text-zinc-600 shadow-xs backdrop-blur-md transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/78 dark:text-zinc-400 ${showResults ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>
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
                        onClick={handleDismissFunnel}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[4px] px-4 py-8"
                    >
                        <motion.div
                            initial={{ y: 24, scale: 0.96, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={{ y: 20, scale: 0.96, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 relative overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={handleDismissFunnel}
                                className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                aria-label="Close modal"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="flex flex-col items-center text-center space-y-4 pt-3">


                                <div className="space-y-4 w-full">
                                    <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                                        Ready to Win Your Next Hackathon?
                                    </h3>

                                    <div className="space-y-3.5 text-left bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
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
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-500 hover:-translate-y-0.5 cursor-pointer"
                                    >
                                        Create Free Account
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleDismissFunnel();
                                            navigate("/login?returnTo=/hackathons");
                                        }}
                                        className="w-full text-center rounded-lg border border-zinc-200 bg-white py-3.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
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
                            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
                        >
                            <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Track Hackathon</h3>
                            <p className="mt-1 text-xs text-zinc-550 dark:text-zinc-400">Select which of your developer teams will compete in this hackathon to start tracking.</p>

                            {teams.length === 0 ? (
                                <div className="mt-4 text-center py-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
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
                                        <AppDropdown
                                            value={selectedTeamIdToTrack}
                                            onChange={setSelectedTeamIdToTrack}
                                            options={teams.map(t => ({ label: t.name, value: t._id }))}
                                            placeholder="Choose a team…"
                                            fullWidth
                                        />
                                    </div>

                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            onClick={() => setShowTrackModal(false)}
                                            className="btn btn-secondary flex-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmTrack}
                                            disabled={isTrackingSubmitting}
                                            className="btn btn-primary flex-1"
                                        >
                                            {isTrackingSubmitting ? "Tracking..." : "Confirm"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
                {showUntrackConfirmModal && (() => {
                    const hackToUntrack = hackathons.find(h => h._id === hackathonIdToUntrack);
                    const trackingInfo = hackathonIdToUntrack ? trackedHackathons[hackathonIdToUntrack] : null;
                    const teamToUntrack = trackingInfo ? teams.find(t => t._id === trackingInfo.teamId) : null;

                    return (
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
                                className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-center"
                            >
                                <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-455 mb-4 shrink-0">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Untrack Hackathon?</h3>
                                <p className="mt-2 text-xs text-zinc-550 dark:text-zinc-400 leading-normal">
                                    Are you sure you want to remove <span className="font-bold text-zinc-800 dark:text-zinc-200">"{hackToUntrack?.title || 'this hackathon'}"</span> from team <span className="font-bold text-zinc-800 dark:text-zinc-200">"{teamToUntrack?.name || 'your team'}"</span>?
                                </p>
                                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                    This will permanently delete all timeline stages and logs associated with this participation.
                                </p>

                                <div className="flex gap-2.5 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowUntrackConfirmModal(false);
                                            setHackathonIdToUntrack(null);
                                        }}
                                        className="btn btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmUntrack}
                                        disabled={isUntrackingSubmitting}
                                        className="btn btn-danger flex-1"
                                    >
                                        {isUntrackingSubmitting ? "Untracking..." : "Untrack"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            <FitCheckModal
                isOpen={!!fitModalHackathon}
                hackathon={fitModalHackathon}
                preferences={activePreferences}
                isAuthenticated={isAuthenticated}
                onClose={() => setFitModalHackathon(null)}
                onSavePreferences={handleSavePreferences}
                onTrack={(id) => handleInitiateTrack(id)}
                isTracked={!!(fitModalHackathon && trackedHackathons[fitModalHackathon._id])}
            />
        </div>
    )
}

export default HackathonList;