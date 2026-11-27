import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type HackathonsFilters = {
  search: string;
  platform: string;
  mode: string;
  locationFilter: string;
  sortBy: string;
  teamSizeFilter: string;
};

export type DashboardCache = {
  participations: any[];
};

export type TeamsCache = {
  teams: any[];
  allParticipations: Record<string, any[]>;
};

export type HackathonsCacheMeta = {
  key: string;
  fetchedAt: number;
};

export const USER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

type CacheContextType = {
  hackathons: any[] | null;
  setHackathons: (data: any[]) => void;
  hackathonsCacheMeta: HackathonsCacheMeta | null;
  setHackathonsCacheMeta: (meta: HackathonsCacheMeta | null) => void;
  hackathonsFilters: HackathonsFilters;
  setHackathonsFilters: (filters: HackathonsFilters) => void;
  dashboardData: DashboardCache | null;
  dashboardFetchedAt: number;
  setDashboardData: (data: DashboardCache) => void;
  teamsData: TeamsCache | null;
  teamsFetchedAt: number;
  setTeamsData: (data: TeamsCache) => void;
  trackerData: any[] | null;
  trackerFetchedAt: number;
  setTrackerData: (data: any[]) => void;
  invalidateUserCaches: () => void;
  clearCache: () => void;
};

const defaultFilters: HackathonsFilters = {
  search: "",
  platform: "",
  mode: "",
  locationFilter: "",
  sortBy: "",
  teamSizeFilter: "",
};

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider = ({ children }: { children: ReactNode }) => {
  const [hackathons, setHackathonsState] = useState<any[] | null>(null);
  const [hackathonsCacheMeta, setHackathonsCacheMetaState] = useState<HackathonsCacheMeta | null>(null);
  const [hackathonsFilters, setHackathonsFiltersState] = useState<HackathonsFilters>(defaultFilters);
  const [dashboardData, setDashboardDataState] = useState<DashboardCache | null>(null);
  const [dashboardFetchedAt, setDashboardFetchedAt] = useState<number>(0);
  const [teamsData, setTeamsDataState] = useState<TeamsCache | null>(null);
  const [teamsFetchedAt, setTeamsFetchedAt] = useState<number>(0);
  const [trackerData, setTrackerDataState] = useState<any[] | null>(null);
  const [trackerFetchedAt, setTrackerFetchedAt] = useState<number>(0);

  const setHackathons = useCallback((data: any[]) => {
    setHackathonsState(data);
  }, []);

  const setHackathonsCacheMeta = useCallback((meta: HackathonsCacheMeta | null) => {
    setHackathonsCacheMetaState(meta);
  }, []);

  const setHackathonsFilters = useCallback((filters: HackathonsFilters) => {
    setHackathonsFiltersState(filters);
  }, []);

  const setDashboardData = useCallback((data: DashboardCache) => {
    setDashboardDataState(data);
    setDashboardFetchedAt(Date.now());
  }, []);

  const setTeamsData = useCallback((data: TeamsCache) => {
    setTeamsDataState(data);
    setTeamsFetchedAt(Date.now());
  }, []);

  const setTrackerData = useCallback((data: any[]) => {
    setTrackerDataState(data);
    setTrackerFetchedAt(Date.now());
  }, []);

  const invalidateUserCaches = useCallback(() => {
    setDashboardFetchedAt(0);
    setTeamsFetchedAt(0);
    setTrackerFetchedAt(0);
  }, []);

  const clearCache = useCallback(() => {
    setHackathonsState(null);
    setHackathonsCacheMetaState(null);
    setHackathonsFiltersState(defaultFilters);
    setDashboardDataState(null);
    setDashboardFetchedAt(0);
    setTeamsDataState(null);
    setTeamsFetchedAt(0);
    setTrackerDataState(null);
    setTrackerFetchedAt(0);
  }, []);

  const value = useMemo(() => ({
    hackathons,
    setHackathons,
    hackathonsCacheMeta,
    setHackathonsCacheMeta,
    hackathonsFilters,
    setHackathonsFilters,
    dashboardData,
    dashboardFetchedAt,
    setDashboardData,
    teamsData,
    teamsFetchedAt,
    setTeamsData,
    trackerData,
    trackerFetchedAt,
    setTrackerData,
    invalidateUserCaches,
    clearCache,
  }), [hackathons, hackathonsCacheMeta, hackathonsFilters, dashboardData, dashboardFetchedAt, teamsData, teamsFetchedAt, trackerData, trackerFetchedAt, setHackathons, setHackathonsCacheMeta, setHackathonsFilters, setDashboardData, setTeamsData, setTrackerData, invalidateUserCaches, clearCache]);

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error("useCache must be used within a CacheProvider");
  }
  return context;
};
