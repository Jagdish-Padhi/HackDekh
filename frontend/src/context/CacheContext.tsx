import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type HackathonsFilters = {
  search: string;
  platform: string;
  mode: string;
  locationFilter: string;
  sortBy: string;
  showExpired: boolean;
};

export type DashboardCache = {
  participations: any[];
  savedHackathons: any[];
  pendingReflections: any[];
};

export type TeamsCache = {
  teams: any[];
  allParticipations: Record<string, any[]>;
};

type CacheContextType = {
  hackathons: any[] | null;
  setHackathons: (data: any[]) => void;
  hackathonsFilters: HackathonsFilters;
  setHackathonsFilters: (filters: HackathonsFilters) => void;
  dashboardData: DashboardCache | null;
  setDashboardData: (data: DashboardCache) => void;
  teamsData: TeamsCache | null;
  setTeamsData: (data: TeamsCache) => void;
  clearCache: () => void;
};

const defaultFilters: HackathonsFilters = {
  search: "",
  platform: "",
  mode: "",
  locationFilter: "",
  sortBy: "",
  showExpired: false,
};

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider = ({ children }: { children: ReactNode }) => {
  const [hackathons, setHackathonsState] = useState<any[] | null>(null);
  const [hackathonsFilters, setHackathonsFiltersState] = useState<HackathonsFilters>(defaultFilters);
  const [dashboardData, setDashboardDataState] = useState<DashboardCache | null>(null);
  const [teamsData, setTeamsDataState] = useState<TeamsCache | null>(null);

  const setHackathons = useCallback((data: any[]) => {
    setHackathonsState(data);
  }, []);

  const setHackathonsFilters = useCallback((filters: HackathonsFilters) => {
    setHackathonsFiltersState(filters);
  }, []);

  const setDashboardData = useCallback((data: DashboardCache) => {
    setDashboardDataState(data);
  }, []);

  const setTeamsData = useCallback((data: TeamsCache) => {
    setTeamsDataState(data);
  }, []);

  const clearCache = useCallback(() => {
    setHackathonsState(null);
    setHackathonsFiltersState(defaultFilters);
    setDashboardDataState(null);
    setTeamsDataState(null);
  }, []);

  const value = useMemo(() => ({
    hackathons,
    setHackathons,
    hackathonsFilters,
    setHackathonsFilters,
    dashboardData,
    setDashboardData,
    teamsData,
    setTeamsData,
    clearCache,
  }), [hackathons, hackathonsFilters, dashboardData, teamsData, setHackathons, setHackathonsFilters, setDashboardData, setTeamsData, clearCache]);

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
