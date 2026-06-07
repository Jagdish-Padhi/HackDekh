import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Flag,
  GripVertical,
  Plus,
  Save,
  Settings,
  Trash2,
  Users,
  X,
  Calendar,
  AlertTriangle,
  Trophy,
  Bookmark,
  LayoutDashboard,
  ExternalLink
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth, useCache, useToast } from "../context";
import { usePageChrome } from "../context/pageChrome";
import HackathonCard from "../components/HackathonCard";
import { teamApi, userApi } from "../services";
import type { HackathonLite, Stage, Team, TeamHackathon } from "../types";
import LogoTransition from "../components/LogoAnimation";

type SavedHackathon = HackathonLite;
type Participation = TeamHackathon & { teamInfo: Team };

const STAGE_RESULTS: Array<Stage["result"]> = ["pending", "qualified", "rejected"];

export const isRegistrationStage = (name: string): boolean => {
  return /register|registration|apply|application|prep|regn/i.test(name);
};

const defaultImages = [
  "/images/hackathons/hackathon-default-1.svg",
  "/images/hackathons/hackathon-default-2.svg",
  "/images/hackathons/hackathon-default-3.svg",
  "/images/hackathons/hackathon-default-4.svg",
];

const getStableDefaultImage = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return defaultImages[hash % defaultImages.length];
};

const getParticipationStatusClass = (status: string) => {
  if (/won/i.test(status)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (/finalist/i.test(status)) return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (/eliminated/i.test(status)) return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
};

const getStageResultClass = (result: string) => {
  if (/qualified/i.test(result)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (/rejected/i.test(result)) return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
};

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getTeamName = (team: string | Team | undefined, fallback = "Team") => {
  if (!team) return fallback;
  if (typeof team === "string") return fallback;
  return team.name;
};

const isCurrentUserPending = (stage: Stage, userId?: string) => {
  if (!userId) return false;
  return (stage.pendingReflectionFor || []).some((item) => {
    if (typeof item === "string") return item === userId;
    return item._id === userId;
  });
};

export const getCanonicalStageName = (name: string): string => {
  const val = name.trim().toLowerCase();
  
  const numWords: Record<string, string> = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
    'sixth': '6', 'seventh': '7', 'eighth': '8', 'ninth': '9', 'tenth': '10',
    '1st': '1', '2nd': '2', '3rd': '3', '4th': '4', '5th': '5',
    '6th': '6', '7th': '7', '8th': '8', '9th': '9', '10th': '10'
  };

  const rawTokens = val.split(/[^a-z0-9]+/);
  const processedTokens: string[] = [];

  for (const rawToken of rawTokens) {
    if (!rawToken) continue;
    
    let token = rawToken;
    
    if (numWords[token]) {
      token = numWords[token];
    } else {
      switch (token) {
        case 'i': token = '1'; break;
        case 'ii': token = '2'; break;
        case 'iii': token = '3'; break;
        case 'iv': token = '4'; break;
        case 'v': token = '5'; break;
        case 'vi': token = '6'; break;
        case 'vii': token = '7'; break;
        case 'viii': token = '8'; break;
        case 'ix': token = '9'; break;
        case 'x': token = '10'; break;
      }
    }

    if (/^\d+$/.test(token)) {
      token = parseInt(token, 10).toString();
    }

    processedTokens.push(token);
  }

  processedTokens.sort();
  return processedTokens.join('');
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setPageActions } = usePageChrome();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  
  const { dashboardData, setDashboardData } = useCache();
  const isInitialMountRef = useRef(true);

  const [savedHackathons, setSavedHackathons] = useState<SavedHackathon[]>(dashboardData?.savedHackathons || []);
  const [participations, setParticipations] = useState<Participation[]>(dashboardData?.participations || []);
  const [pendingReflections, setPendingReflections] = useState<Stage[]>(dashboardData?.pendingReflections || []);
  const [loadingData, setLoadingData] = useState(!dashboardData);
  const [trackerSubFilter, setTrackerSubFilter] = useState<"tracking" | "registered" | "finished">( "tracking");
  const [overviewFilter, setOverviewFilter] = useState<"all" | "won" | "finalist" | "eliminated">("all");
  const [selectedParticipationId, setSelectedParticipationId] = useState<string>("");
  const [focusedStageId, setFocusedStageId] = useState<string>("");
  const [loadingParticipationId, setLoadingParticipationId] = useState<string | null>(null);
  const [noteSavingStatus, setNoteSavingStatus] = useState<Record<string, "saved" | "saving" | "error">>({});

  const [activeReflectionStageId, setActiveReflectionStageId] = useState("");
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageDeadline, setNewStageDeadline] = useState("");
  const [isAddingStage, setIsAddingStage] = useState(false);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoadingData(true);
    }
    try {
      const [savedRes, teamsRes, pendingRes] = await Promise.all([
        axiosInstance.get("/users/saved"),
        teamApi.getUserTeams(),
        userApi.getPendingReflections(),
      ]);

      const fetchedSavedHackathons = savedRes.data?.data || savedRes.data || [];
      const fetchedPendingReflections = pendingRes;

      const teamParticipations = await Promise.all(
        teamsRes.map(async (team) => {
          try {
            const teamItems = await teamApi.getTeamHackathons(team._id);
            return teamItems.map((participation) => ({ ...participation, teamInfo: team }));
          } catch (error) {
            console.error(`Failed to fetch hackathons for team ${team._id}`, error);
            return [] as Participation[];
          }
        })
      );

      const fetchedParticipations = teamParticipations.flat();

      setSavedHackathons(fetchedSavedHackathons);
      setPendingReflections(fetchedPendingReflections);
      setParticipations(fetchedParticipations);
      
      setDashboardData({
        savedHackathons: fetchedSavedHackathons,
        pendingReflections: fetchedPendingReflections,
        participations: fetchedParticipations,
      });
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoadingData(false);
    }
  }, [setDashboardData]);

  useEffect(() => {
    const isInitialMount = isInitialMountRef.current;
    isInitialMountRef.current = false;

    loadDashboardData(isInitialMount && !!dashboardData);

    const onFocus = () => loadDashboardData(true);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (participations.length > 0) {
      setSelectedParticipationId(prev => prev || participations[0]._id);
    }
  }, [participations]);

  useEffect(() => {
    if (activeTab === "tracker") {
      if (trackerSubFilter === "tracking") {
        setSelectedParticipationId("");
      } else {
        const list = trackerSubFilter === "registered"
          ? participations.filter(p => p.status === 'active')
          : participations.filter(p => ['won', 'finalist', 'eliminated'].includes(p.status));
        
        setSelectedParticipationId(prev => {
          const exists = list.some(p => p._id === prev);
          if (exists) return prev;
          return list.length > 0 ? list[0]._id : "";
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trackerSubFilter, participations]);

  const handleTabChange = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  const handleRemoveBookmark = async (hackathonId: string) => {
    try {
      const res = await axiosInstance.post(`/users/saved/${hackathonId}`);
      if (res.data?.success && res.data?.data) {
        setSavedHackathons((previous) => previous.filter((hackathon) => hackathon._id !== hackathonId));
      }
    } catch (error) {
      console.error("Failed to remove bookmark", error);
    }
  };

  const selectedParticipation = useMemo(
    () => participations.find((participation) => participation._id === selectedParticipationId) || null,
    [participations, selectedParticipationId]
  );


  const currentStageLabel = useMemo(() => {
    if (!selectedParticipation) return "No stages yet";
    if (selectedParticipation.stages.length === 0) return "No stages yet";
    const pendingIndex = selectedParticipation.stages.findIndex((stage) => stage.result === "pending");
    const stepNumber = pendingIndex >= 0 ? pendingIndex + 1 : selectedParticipation.stages.length;
    return `Stage ${stepNumber} of ${selectedParticipation.stages.length}`;
  }, [selectedParticipation]);

  const patchParticipation = (participationId: string, updater: (participation: Participation) => Participation) => {
    setParticipations((previous) => previous.map((participation) => (participation._id === participationId ? updater(participation) : participation)));
  };

  const handleUpdateParticipationStatus = async (participationId: string, nextStatus: Participation["status"]) => {
    const participation = participations.find((item) => item._id === participationId);
    if (!participation) return;
    setLoadingParticipationId(participationId);
    try {
      const updated = await teamApi.updateStatus(participation.teamInfo._id, participationId, nextStatus);
      patchParticipation(participationId, (current) => ({ ...current, ...updated, teamInfo: current.teamInfo }));
    } catch (error) {
      console.error("Failed to update participation status", error);
    } finally {
      setLoadingParticipationId(null);
    }
  };

  const handleStageFieldSave = async (
    participationId: string,
    stageId: string,
    payload: { name?: string; deadline?: string | null; notes?: string }
  ) => {
    const participation = participations.find((item) => item._id === participationId);
    const stage = participation?.stages.find((candidate) => candidate._id === stageId);
    if (!participation || !stage) return;

    if (payload.name !== undefined) {
      if (isRegistrationStage(payload.name)) {
        showToast("Registration is tracked automatically. Please use a competitive milestone name.", "error");
        setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "error" }));
        return;
      }
      if (payload.name.trim() !== stage.name) {
        const canonicalName = getCanonicalStageName(payload.name);
        const duplicate = participation.stages.some(
          (s) => s._id !== stageId && getCanonicalStageName(s.name) === canonicalName
        );
        if (duplicate) {
          showToast("A stage with this name already exists.", "error");
          setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "error" }));
          return;
        }
      }
    }

    setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "saving" }));
    try {
      const updatedStage = await teamApi.updateStage(participation.teamInfo._id, participationId, stageId, payload);
      patchParticipation(participationId, (current) => ({
        ...current,
        stages: current.stages.map((candidate) => (candidate._id === stageId ? { ...candidate, ...updatedStage } : candidate)),
      }));
      setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "saved" }));
    } catch (error: any) {
      console.error("Failed to save stage", error);
      showToast(error.response?.data?.message || "Failed to save stage", "error");
      setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "error" }));
    }
  };

  const handleCycleStageResult = async (participationId: string, stageId: string) => {
    const participation = participations.find((item) => item._id === participationId);
    const stage = participation?.stages.find((candidate) => candidate._id === stageId);
    if (!participation || !stage) return;

    const nextResult = STAGE_RESULTS[(STAGE_RESULTS.indexOf(stage.result as Stage["result"]) + 1) % STAGE_RESULTS.length];
    await handleStageFieldSave(participationId, stageId, { notes: stage.notes, name: stage.name, deadline: stage.deadline || null });
    try {
      const updatedStage = await teamApi.updateStage(participation.teamInfo._id, participationId, stageId, { result: nextResult });
      patchParticipation(participationId, (current) => ({
        ...current,
        stages: current.stages.map((candidate) => (candidate._id === stageId ? { ...candidate, ...updatedStage } : candidate)),
      }));
    } catch (error: any) {
      console.error("Failed to update stage result", error);
      showToast(error.response?.data?.message || "Failed to update stage result", "error");
    }
  };

  const handleDeleteStage = async (participationId: string, stageId: string) => {
    const participation = participations.find((item) => item._id === participationId);
    if (!participation) return;

    if (!window.confirm("Delete this stage?")) return;

    try {
      await teamApi.deleteStage(participation.teamInfo._id, participationId, stageId);
      patchParticipation(participationId, (current) => ({
        ...current,
        stages: current.stages.filter((stage) => stage._id !== stageId),
      }));
      if (focusedStageId === stageId) {
        setFocusedStageId("");
      }
    } catch (error: any) {
      console.error("Failed to delete stage", error);
      showToast(error.response?.data?.message || "Failed to delete stage", "error");
    }
  };

  const handleAddStage = async () => {
    if (!selectedParticipation || !newStageName.trim() || isAddingStage) return;
    
    if (isRegistrationStage(newStageName)) {
      showToast("Registration is tracked automatically. Please add a competitive milestone.", "error");
      return;
    }

    const targetCanonical = getCanonicalStageName(newStageName);
    const duplicate = selectedParticipation.stages.some(
      (s) => getCanonicalStageName(s.name) === targetCanonical
    );
    if (duplicate) {
      showToast("A stage with this name already exists.", "error");
      return;
    }

    setIsAddingStage(true);
    try {
      const created = await teamApi.addStage(selectedParticipation.teamInfo._id, selectedParticipation._id, {
        name: newStageName.trim(),
        deadline: newStageDeadline || undefined,
      });
      patchParticipation(selectedParticipation._id, (current) => ({
        ...current,
        stages: [...current.stages, created],
      }));
      setNewStageName("");
      setNewStageDeadline("");
    } catch (error: any) {
      console.error("Failed to add stage", error);
      showToast(error.response?.data?.message || "Failed to add stage", "error");
    } finally {
      setIsAddingStage(false);
    }
  };

  const handleAddReflection = async () => {
    if (!selectedParticipation || !activeReflectionStageId || !reflectionDraft.trim()) return;
    const targetStage = selectedParticipation.stages.find((stage) => stage._id === activeReflectionStageId);
    if (!targetStage) return;

    try {
      const updatedStage = await teamApi.addReflection(
        selectedParticipation.teamInfo._id,
        selectedParticipation._id,
        activeReflectionStageId,
        reflectionDraft.trim()
      );
      patchParticipation(selectedParticipation._id, (current) => ({
        ...current,
        stages: current.stages.map((stage) => (stage._id === activeReflectionStageId ? { ...stage, ...updatedStage } : stage)),
      }));
      setReflectionDraft("");
      setActiveReflectionStageId("");
      loadDashboardData(); // Refresh reflection lists
    } catch (error) {
      console.error("Failed to add reflection", error);
    }
  };

  // Deadlines calculation
  const upcomingDeadlines = useMemo(() => {
    const list: Array<{
      stage: Stage;
      participation: Participation;
      daysRemaining: number;
    }> = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    participations.forEach((participation) => {
      // 1. If tracking, inject virtual registration deadline
      if (participation.status === 'tracking' && participation.hackathon.deadline) {
        const dlDate = new Date(participation.hackathon.deadline);
        dlDate.setHours(0, 0, 0, 0);
        const diff = dlDate.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        list.push({
          stage: {
            _id: `reg-${participation._id}`,
            name: "Registration Deadline",
            deadline: participation.hackathon.deadline,
            result: "pending",
            notes: "Register on the official platform to unlock competitive tracking.",
            teamHackathon: participation._id
          } as any,
          participation,
          daysRemaining: days
        });
      }

      // 2. Regular competitive stages
      participation.stages.forEach((stage) => {
        if (isRegistrationStage(stage.name)) return;
        if (stage.deadline && stage.result === "pending") {
          const dlDate = new Date(stage.deadline);
          dlDate.setHours(0, 0, 0, 0);
          const diff = dlDate.getTime() - now.getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          list.push({ stage, participation, daysRemaining: days });
        }
      });
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [participations]);

  // Page Header Panel Actions (Tabs + Settings Shortcut)
  const dashboardActions = useMemo(() => {
    return (
      <div className="flex items-center gap-4">
        {/* Navigation Tabs */}
        <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "tracker", label: "Hackathon Tracker", icon: Trophy },
            { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        {/* Shortcut Settings Button */}
        <Link
          to="/settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-xs transition hover:border-blue-400 hover:text-blue-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
          title="Adjust Account Settings"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>
      </div>
    );
  }, [activeTab]);

  useEffect(() => {
    setPageActions(dashboardActions);
    return () => setPageActions(null);
  }, [dashboardActions, setPageActions]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-2 md:px-6 space-y-6">
      {loadingData ? (
        <div className="flex h-60 w-full flex-col items-center justify-center gap-3">
          <LogoTransition width={220} height={140} loop={true} />
          <p className="text-sm font-semibold text-zinc-550 dark:text-zinc-400">Loading your workspace details...</p>
        </div>
      ) : (
        <div className="min-h-[40vh]">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Analytics Dashboard Banner */}
              {(() => {
                const trackingCount = participations.filter(p => p.status === 'tracking').length;
                const registeredCount = participations.filter(p => p.status === 'active').length;
                const finishedCount = participations.filter(p => ["won", "finalist", "eliminated"].includes(p.status)).length;

                return (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-3xl border border-zinc-200/90 bg-gradient-to-r from-blue-50/45 to-indigo-50/25 p-4.5 dark:border-zinc-800 dark:from-zinc-900/30 dark:to-zinc-900/15 shadow-xs">
                    {/* Circle Loader Centerpiece */}
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900 shadow-xs justify-center lg:justify-start">
                      <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
                        {/* Rotating animated theme border */}
                        <div className="absolute inset-0 rounded-full border-[5px] border-blue-600/15 border-t-blue-600 dark:border-blue-500/15 dark:border-t-blue-500 animate-[spin_3s_linear_infinite]" />
                        <div className="flex flex-col items-center justify-center z-10">
                          <span className="text-xl font-black text-zinc-900 dark:text-white leading-none">{trackingCount}</span>
                          <span className="text-[7.5px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Tracking</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider truncate">Queue Size</h4>
                        <p className="text-base font-black text-zinc-800 dark:text-zinc-200 truncate">{trackingCount} Tracked</p>
                      </div>
                    </div>

                    {/* Metric Card 2 */}
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900 shadow-xs">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Trophy className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider truncate">Active Tracker</h4>
                        <p className="text-base font-black text-zinc-800 dark:text-zinc-200 truncate">{registeredCount} Registered</p>
                      </div>
                    </div>

                    {/* Metric Card 3 */}
                    <div 
                      onClick={() => {
                        const el = document.getElementById('pending-reflections-panel');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-4', 'ring-amber-500/40', 'dark:ring-amber-400/40');
                          setTimeout(() => {
                            el.classList.remove('ring-4', 'ring-amber-500/40', 'dark:ring-amber-400/40');
                          }, 3000);
                        }
                      }}
                      className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900 shadow-xs cursor-pointer hover:border-amber-400 dark:hover:border-amber-500/60 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider truncate">Reflections</h4>
                        <p className="text-base font-black text-zinc-800 dark:text-zinc-200 truncate">{pendingReflections.length} Pending</p>
                      </div>
                    </div>

                    {/* Metric Card 4 */}
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900 shadow-xs">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Check className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-wider truncate">Finished</h4>
                        <p className="text-base font-black text-zinc-800 dark:text-zinc-200 truncate">{finishedCount} Completed</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Upcoming Deadlines Column */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Upcoming Stages & Deadlines</h2>
                      </div>
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {upcomingDeadlines.length} pending
                      </span>
                    </div>

                    {upcomingDeadlines.length === 0 ? (
                      <div className="py-10 text-center">
                        <Check className="mx-auto h-10 w-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full" />
                        <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">All caught up!</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">No upcoming deadlines found in your tracker.</p>
                      </div>
                    ) : (
                      <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-5 ml-2.5 space-y-6">
                        {upcomingDeadlines.map(({ stage, participation, daysRemaining }) => {
                          const statusColor = daysRemaining < 0 
                            ? "bg-rose-500" 
                            : daysRemaining <= 3 
                            ? "bg-amber-500" 
                            : "bg-blue-600";

                          return (
                            <Link 
                              key={stage._id}
                              to={`/teams?teamId=${participation.teamInfo._id}&participationId=${participation._id}&tab=Stages&stageId=${stage._id}`}
                              className="relative group block cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 p-2 -m-2 rounded-2xl transition-all duration-200"
                            >
                              {/* Marker dot */}
                              <span className={`absolute -left-[19px] top-3 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-950 ${statusColor}`} />
                              
                              <div className="space-y-1 pl-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {stage.name}
                                  </h3>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    daysRemaining < 0 
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                                      : daysRemaining <= 3 
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                                  }`}>
                                    {daysRemaining < 0 
                                      ? "Overdue" 
                                      : daysRemaining === 0 
                                      ? "Due Today" 
                                      : daysRemaining === 1 
                                      ? "Tomorrow" 
                                      : `${daysRemaining} days left`}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {participation.hackathon.title} • {getTeamName(participation.teamInfo)}
                                </p>
                                {stage.deadline && (
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                    Deadline: {formatDate(stage.deadline)}
                                  </p>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Team Quick Info summary with filters */}
                  <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3.5 border-b border-zinc-100 dark:border-zinc-900">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Registered Hackathons & Results</h2>
                      </div>
                      
                      {/* Overview status tags filter */}
                      <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                        {[
                          { id: "all", label: "All Active" },
                          { id: "won", label: "Won 🏆" },
                          { id: "finalist", label: "Finalist 🚀" },
                          { id: "eliminated", label: "Eliminated ❌" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setOverviewFilter(opt.id as any)}
                            className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                              overviewFilter === opt.id
                                ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(() => {
                      const list = participations.filter(p => p.status !== 'tracking');
                      const filtered = overviewFilter === "all" ? list : list.filter(p => p.status === overviewFilter);

                      if (filtered.length === 0) {
                        return (
                          <div className="py-6 text-center">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">No hackathons match this result filter.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {filtered.map((part) => (
                            <div key={part._id} className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 truncate">{part.hackathon.title}</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">Team: {getTeamName(part.teamInfo)}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getParticipationStatusClass(part.status)}`}>
                                {part.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Reflections Column */}
                <div className="space-y-6">
                  {/* Reflection Warnings Panel */}
                  <div id="pending-reflections-panel" className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 dark:bg-amber-500/10">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Pending Reflections</h3>
                    </div>

                    {pendingReflections.length === 0 ? (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                        Excellent work! You have no pending timeline reflection entries.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                          Submit notes or feedback regarding your performance in completed phases to close them out.
                        </p>
                        
                        {pendingReflections.map((stage) => {
                          const isReflecting = activeReflectionStageId === stage._id;
                          return (
                            <div key={stage._id} className="p-3 bg-white dark:bg-zinc-950 rounded-2xl border border-amber-500/20">
                              <Link 
                                to={
                                  stage.teamHackathon && typeof stage.teamHackathon === "object" && stage.teamHackathon.team
                                    ? `/teams?teamId=${(stage.teamHackathon.team as any)._id || stage.teamHackathon.team}&participationId=${stage.teamHackathon._id}&tab=Stages&stageId=${stage._id}`
                                    : `/teams`
                                }
                                className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block cursor-pointer"
                              >
                                {stage.name}
                              </Link>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Stage Result: {stage.result}</p>
                              
                              {!isReflecting ? (
                                <button
                                  onClick={() => {
                                    setActiveReflectionStageId(stage._id);
                                    setSelectedParticipationId(typeof stage.teamHackathon === "object" ? stage.teamHackathon._id : "");
                                    setReflectionDraft("");
                                  }}
                                  className="mt-2.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                                >
                                  Submit Reflection <ChevronRight className="h-3 w-3" />
                                </button>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={reflectionDraft}
                                    onChange={(e) => setReflectionDraft(e.target.value)}
                                    placeholder="Write notes on lessons, problems faced, or team status..."
                                    className="w-full min-h-[60px] p-2 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => setActiveReflectionStageId("")}
                                      className="px-2 py-1 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleAddReflection}
                                      className="px-2 py-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BOOKMARKS */}
          {activeTab === "bookmarks" && (
            <div className="space-y-6">
              {savedHackathons.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
                  <BookOpen className="mx-auto h-12 w-12 text-zinc-400" />
                  <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No saved hackathons yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                    Bookmark hackathons to keep a quick list inside your dashboard.
                  </p>
                  <Link
                    to="/hackathons"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500"
                  >
                    Browse Hackathons
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {savedHackathons.map((hackathon, index) => (
                    <div key={hackathon._id} className="relative group">
                      <HackathonCard
                        hackathon={hackathon}
                        displayIndex={index}
                        isBookmarked
                        onToggleBookmark={() => handleRemoveBookmark(hackathon._id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: HACKATHON TRACKER */}
          {activeTab === "tracker" && (
            <div className="space-y-6">
              {/* Top Panel sub-filters */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-zinc-150 dark:border-zinc-800">
                <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                  {[
                    { id: "tracking", label: "Tracking" },
                    { id: "registered", label: "Registered" },
                    { id: "finished", label: "Finished" }
                  ].map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setTrackerSubFilter(tag.id as any);
                        setSelectedParticipationId("");
                      }}
                      className={`rounded-md px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        trackerSubFilter === tag.id
                          ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TRACKING SUB-TAB (Grid format) */}
              {trackerSubFilter === "tracking" && (() => {
                const trackingQueue = participations.filter(p => p.status === 'tracking');
                if (trackingQueue.length === 0) {
                  return (
                    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
                      <Flag className="mx-auto h-12 w-12 text-zinc-400" />
                      <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No tracked hackathons in queue</h3>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                        Search and track hackathons from the Discover tab to add them to your queue.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {trackingQueue.map((part, index) => (
                      <div key={part._id} className="relative group">
                        <HackathonCard
                          hackathon={part.hackathon}
                          displayIndex={index}
                          extraActions={[
                            { label: "TRACKED_TRUE", onClick: () => {} }
                          ]}
                        />
                        {/* Mark Registered Overlay Button */}
                        <div className="absolute top-2 left-2 z-30">
                          <button
                            onClick={() => handleUpdateParticipationStatus(part._id, "active")}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-[10px] font-black uppercase tracking-wider text-white px-2.5 py-1.5 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-300 animate-pulse"
                            title="Move to Registered track"
                          >
                            <Check className="h-3.5 w-3.5" /> Mark Registered
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* REGISTERED & FINISHED SUB-TABS (Split List-Timeline layout) */}
              {(trackerSubFilter === "registered" || trackerSubFilter === "finished") && (() => {
                const list = trackerSubFilter === "registered" 
                  ? participations.filter(p => p.status === 'active')
                  : participations.filter(p => ['won', 'finalist', 'eliminated'].includes(p.status));

                if (list.length === 0) {
                  return (
                    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
                      <Flag className="mx-auto h-12 w-12 text-zinc-400" />
                      <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No hackathons found</h3>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                        No hackathons found under the {trackerSubFilter} track.
                      </p>
                    </div>
                  );
                }

                const selectedParticipation = list.find(p => p._id === selectedParticipationId) || null;
                const stageProgress = selectedParticipation ? (selectedParticipation.stages.length === 0 ? "No stages yet" : currentStageLabel) : "";
                const isTerminated = (() => {
                  if (!selectedParticipation) return false;
                  const competitiveStages = selectedParticipation.stages.filter(s => !isRegistrationStage(s.name));
                  const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
                  const hasRejections = failedStageIdx !== -1;
                  return hasRejections || ['won', 'eliminated'].includes(selectedParticipation.status);
                })();

                return (
                  <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
                    <div className="space-y-3">
                      {list.map((participation) => {
                        const coverSrc = participation.hackathon.coverImage?.trim() || getStableDefaultImage(`${participation.hackathon._id}:${participation.hackathon.title}`);
                        const currentProgress = participation.stages.length === 0 ? "No stages yet" : (participation._id === selectedParticipationId ? currentStageLabel : "Stage Tracking");
                        const isSelected = selectedParticipation?._id === participation._id;
                        return (
                          <button
                            key={participation._id}
                            onClick={() => {
                              setSelectedParticipationId(participation._id);
                              setFocusedStageId("");
                            }}
                            className={`w-full rounded-[1.7rem] border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-950/60 cursor-pointer ${
                              isSelected ? "border-blue-500/40 ring-2 ring-blue-500/20" : "border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                                <img
                                  src={coverSrc}
                                  alt={participation.hackathon.title}
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = "/BrandImages/HackDekh.png";
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">{participation.hackathon.title}</h3>
                                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                    {participation.hackathon.platform}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                                    {getTeamName(participation.teamInfo)}
                                  </span>
                                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getParticipationStatusClass(participation.status)}`}>
                                    {participation.status}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {currentProgress}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-zinc-400" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {selectedParticipation && (
                        <motion.aside
                          key={selectedParticipation._id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 30 }}
                          className="sticky top-6 h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950/80"
                        >
                          <div className="flex h-full flex-col">
                            <div className="border-b border-zinc-200 p-5 dark:border-zinc-800">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Participation detail</p>
                                  <h3 className="mt-1 truncate text-xl font-bold text-zinc-900 dark:text-zinc-100">{selectedParticipation.hackathon.title}</h3>
                                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{getTeamName(selectedParticipation.teamInfo)}</p>
                                </div>
                                <button
                                  onClick={() => setSelectedParticipationId("")}
                                  className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                                  <Users className="h-3.5 w-3.5" />
                                  {selectedParticipation.teamInfo.members.length} members
                                </div>
                                <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getParticipationStatusClass(selectedParticipation.status)}`}>
                                  {selectedParticipation.status}
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
                                  <GripVertical className="h-3.5 w-3.5" />
                                  {stageProgress}
                                </div>
                              </div>

                              <div className="mt-4 flex items-center gap-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</label>
                                <select
                                  value={selectedParticipation.status}
                                  onChange={(event) => handleUpdateParticipationStatus(selectedParticipation._id, event.target.value as Participation["status"])}
                                  disabled={loadingParticipationId === selectedParticipation._id}
                                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                >
                                  {selectedParticipation.status === 'tracking' && (
                                    <option value="tracking">Tracking</option>
                                  )}
                                  <option value="active">Active</option>
                                  <option value="finalist">Finalist</option>
                                  <option value="won">Won</option>
                                  <option value="eliminated">Eliminated</option>
                                </select>
                                {loadingParticipationId === selectedParticipation._id && <LogoTransition width={36} height={22} loop={true} />}
                              </div>
                            </div>

                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
                              <div className="space-y-6">
                                {/* Registration Milestone Card */}
                                <div className={`rounded-2xl border p-4 backdrop-blur-sm transition-all duration-350 ${
                                  selectedParticipation.status === 'tracking'
                                    ? 'border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 shadow-sm shadow-amber-500/5'
                                    : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-300 shadow-xs'
                                }`}>
                                  <div className="flex items-center gap-2.5">
                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                                      selectedParticipation.status === 'tracking'
                                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
                                        : 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white'
                                    }`}>
                                      {selectedParticipation.status === 'tracking' ? (
                                        <AlertTriangle className="h-4 w-4" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="font-extrabold uppercase tracking-wide text-[10px]">
                                        {selectedParticipation.status === 'tracking' ? 'Prerequisite: Register for Hackathon' : 'Registration Completed'}
                                      </p>
                                      <p className="mt-0.5 text-zinc-650 dark:text-zinc-400 font-semibold text-xs truncate">
                                        {selectedParticipation.status === 'tracking' ? (
                                          selectedParticipation.hackathon.deadline ? (
                                            <span>
                                              Deadline: {new Date(selectedParticipation.hackathon.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                          ) : (
                                            'Register soon!'
                                          )
                                        ) : (
                                          'Registered & Active.'
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  {selectedParticipation.status === 'tracking' && (
                                    <div className="mt-3 flex items-center gap-2 justify-end">
                                      {selectedParticipation.hackathon.applyLink && (
                                        <a
                                          href={selectedParticipation.hackathon.applyLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/25 hover:border-amber-500/40 bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-amber-700 dark:text-amber-450 px-2.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer"
                                        >
                                          Apply Site <ExternalLink className="h-3 w-3" />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleUpdateParticipationStatus(selectedParticipation._id, 'active')}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-2.5 py-1.5 text-xs font-bold shadow-md shadow-amber-500/10 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                      >
                                        Mark Registered
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <section>
                                  <div className="mb-3 flex items-center justify-between">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Stage timeline</h4>
                                    <button
                                      disabled={isTerminated}
                                      onClick={handleAddStage}
                                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Add Stage
                                    </button>
                                  </div>

                                  <div className="space-y-3">
                                    {(() => {
                                      const competitiveStages = selectedParticipation.stages.filter(s => !isRegistrationStage(s.name));
                                      if (competitiveStages.length === 0) {
                                        return (
                                          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400 text-left">
                                            No competitive stages yet. Add your first stage to start tracking.
                                          </div>
                                        );
                                      }
                                      return competitiveStages.map((stage, index) => {
                                        const isFocused = focusedStageId === stage._id;
                                        const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
                                        const isDisqualified = failedStageIdx !== -1 && index > failedStageIdx;
                                        return (
                                          <div
                                            key={stage._id}
                                            className={`rounded-[1.4rem] border p-4 transition ${
                                              isDisqualified
                                                ? "border-zinc-200/50 bg-zinc-100/30 dark:border-zinc-800/40 dark:bg-zinc-950/10 opacity-50"
                                                : isFocused
                                                  ? "border-blue-500/40 bg-blue-500/5"
                                                  : "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/40"
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex items-start gap-3">
                                                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                                                  {index + 1}
                                                </div>
                                                <div className="space-y-3">
                                                  <div className="flex items-center gap-2">
                                                    {isDisqualified && (
                                                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-655 shrink-0">
                                                        Disqualified
                                                      </span>
                                                    )}
                                                    <input
                                                      disabled={isDisqualified || isTerminated || isRegistrationStage(stage.name)}
                                                      defaultValue={stage.name}
                                                      onBlur={(event) => {
                                                        if (event.target.value !== stage.name) {
                                                          handleStageFieldSave(selectedParticipation._id, stage._id, { name: event.target.value });
                                                        }
                                                      }}
                                                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                                                    />
                                                  </div>
                                                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                                                      <Clock3 className="h-3.5 w-3.5" />
                                                      {formatDate(stage.deadline || undefined)}
                                                    </span>
                                                    {!isDisqualified && isCurrentUserPending(stage, user?._id) && (
                                                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                                                        pending reflection
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <button
                                                disabled={isTerminated}
                                                onClick={() => handleDeleteStage(selectedParticipation._id, stage._id)}
                                                className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Delete stage"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                              <input
                                                disabled={isDisqualified || isTerminated}
                                                type="date"
                                                defaultValue={stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : ""}
                                                onBlur={(event) => {
                                                  const nextValue = event.target.value || null;
                                                  const currentValue = stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : "";
                                                  if (nextValue !== currentValue) {
                                                    handleStageFieldSave(selectedParticipation._id, stage._id, { deadline: nextValue });
                                                  }
                                                }}
                                                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                                              />
                                              <button
                                                disabled={isDisqualified || isTerminated}
                                                onClick={() => handleCycleStageResult(selectedParticipation._id, stage._id)}
                                                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed ${isDisqualified || isTerminated ? "border-zinc-200 bg-zinc-150 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50" : getStageResultClass(stage.result)}`}
                                              >
                                                <CircleDot className="h-3.5 w-3.5" />
                                                {isDisqualified ? "disqualified" : stage.result}
                                              </button>
                                            </div>

                                            <textarea
                                              disabled={isDisqualified || isTerminated}
                                              defaultValue={stage.notes || ""}
                                              onBlur={(event) => {
                                                if (event.target.value !== (stage.notes || "")) {
                                                  handleStageFieldSave(selectedParticipation._id, stage._id, { notes: event.target.value });
                                                }
                                              }}
                                              placeholder="Stage notes"
                                              className="mt-3 min-h-[92px] w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                                            />

                                            {noteSavingStatus[stage._id] && (
                                              <div className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                                {noteSavingStatus[stage._id] === "saving" && "Saving stage details..."}
                                                {noteSavingStatus[stage._id] === "saved" && "Saved"}
                                                {noteSavingStatus[stage._id] === "error" && "Save failed"}
                                              </div>
                                            )}

                                            <div className="mt-4 space-y-3">
                                              <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Reflections</h5>
                                                <button
                                                  onClick={() => {
                                                    setActiveReflectionStageId(stage._id);
                                                    setReflectionDraft("");
                                                  }}
                                                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                  Add reflection
                                                </button>
                                              </div>

                                              {stage.reflections.length > 0 ? (
                                                <div className="space-y-2">
                                                  {stage.reflections.map((reflection, reflectionIndex) => (
                                                    <div key={`${stage._id}-${reflectionIndex}`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                                                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                                        {typeof reflection.user === "string" ? "Teammate" : reflection.user.fullName || reflection.user.username || "Teammate"}
                                                      </div>
                                                      <p className="mt-1 text-zinc-700 dark:text-zinc-200">{reflection.note}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-855">
                                                  No reflections yet.
                                                </div>
                                              )}

                                              {activeReflectionStageId === stage._id && (
                                                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
                                                  <textarea
                                                    value={reflectionDraft}
                                                    onChange={(event) => setReflectionDraft(event.target.value)}
                                                    placeholder={`Add reflection for ${stage.name}`}
                                                    className="min-h-[88px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                                  />
                                                  <div className="mt-3 flex justify-end gap-2">
                                                    <button
                                                      onClick={() => {
                                                        setActiveReflectionStageId("");
                                                        setReflectionDraft("");
                                                      }}
                                                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                                                    >
                                                      Cancel
                                                    </button>
                                                    <button
                                                      onClick={handleAddReflection}
                                                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 cursor-pointer"
                                                    >
                                                      <Save className="h-3.5 w-3.5" />
                                                      Save reflection
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>

                                  <div className="mt-4 flex flex-col gap-2.5">
                                    {isTerminated && (
                                      <p className="text-[11px] text-amber-605 dark:text-amber-405 font-bold leading-normal">
                                        Milestone tracking locked (this participation is marked as won or eliminated, or has a rejection).
                                      </p>
                                    )}
                                    <input
                                      type="text"
                                      value={newStageName}
                                      disabled={isTerminated}
                                      onChange={(event) => setNewStageName(event.target.value)}
                                      placeholder="Add a new stage"
                                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                                    />
                                    <input
                                      type="date"
                                      value={newStageDeadline}
                                      disabled={isTerminated}
                                      onChange={(event) => setNewStageDeadline(event.target.value)}
                                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900/40 disabled:text-zinc-400"
                                    />
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      disabled={isTerminated}
                                      onClick={handleAddStage}
                                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Stage
                                    </button>
                                  </div>
                                </section>

                                <section>
                                  <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Members</h4>
                                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {selectedParticipation.teamInfo.members.map((member) => (
                                      <div key={member._id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-sm font-bold text-blue-700 dark:text-blue-400">
                                          {(member.fullName || member.username || "U").slice(0, 2).toUpperCase()}
                                        </div>
                                        <p className="mt-2 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                          {member.fullName || member.username || member.email || "Member"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              </div>
                            </div>
                          </div>
                        </motion.aside>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
