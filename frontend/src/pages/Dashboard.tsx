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
  MessageSquare
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

  const [stageToDelete, setStageToDelete] = useState<{
    participationId: string;
    stageId: string;
    stageName: string;
  } | null>(null);
  const [isDeletingStage, setIsDeletingStage] = useState(false);

  const [stageToReject, setStageToReject] = useState<{
    participationId: string;
    stageId: string;
    currentNotes: string;
    currentName: string;
    currentDeadline: string | null;
  } | null>(null);
  const [isRejectingStage, setIsRejectingStage] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [reflectionModalStage, setReflectionModalStage] = useState<Stage | null>(null);
  const [reflectionModalDraft, setReflectionModalDraft] = useState("");
  const [showReflectionsMap, setShowReflectionsMap] = useState<Record<string, boolean>>({});

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

  const handleStageResultSelect = async (participationId: string, stageId: string, result: Stage["result"]) => {
    const participation = participations.find((item) => item._id === participationId);
    const stage = participation?.stages.find((candidate) => candidate._id === stageId);
    if (!participation || !stage) return;

    if (result === "rejected") {
      setStageToReject({
        participationId,
        stageId,
        currentNotes: stage.notes || "",
        currentName: stage.name,
        currentDeadline: stage.deadline || null
      });
      return;
    }

    await executeUpdateStageResult(participationId, stageId, result, stage.notes || "", stage.name, stage.deadline || null);
  };

  const executeUpdateStageResult = async (
    participationId: string,
    stageId: string,
    result: Stage["result"],
    notes: string,
    name: string,
    deadline: string | null
  ) => {
    const participation = participations.find((item) => item._id === participationId);
    if (!participation) return;

    if (result === "rejected") {
      setIsRejectingStage(true);
    }
    await handleStageFieldSave(participationId, stageId, { notes, name, deadline });
    try {
      const updatedStage = await teamApi.updateStage(participation.teamInfo._id, participationId, stageId, { result });
      patchParticipation(participationId, (current) => ({
        ...current,
        stages: current.stages.map((candidate) => (candidate._id === stageId ? { ...candidate, ...updatedStage } : candidate)),
      }));
      showToast(`Stage result updated to ${result}`, "success");
    } catch (error: any) {
      console.error("Failed to update stage result", error);
      showToast(error.response?.data?.message || "Failed to update stage result", "error");
    } finally {
      if (result === "rejected") {
        setIsRejectingStage(false);
      }
    }
  };

  const handleDeleteStage = (participationId: string, stageId: string, stageName: string) => {
    setStageToDelete({ participationId, stageId, stageName });
  };

  const handleConfirmDeleteStage = async () => {
    if (!stageToDelete) return;
    const { participationId, stageId } = stageToDelete;
    const participation = participations.find((item) => item._id === participationId);
    if (!participation) {
      setStageToDelete(null);
      return;
    }

    setIsDeletingStage(true);
    try {
      console.log("[DEBUG] handleDeleteStage inputs in Dashboard:", {
        teamId: participation.teamInfo._id,
        participationId,
        stageId
      });
      await teamApi.deleteStage(participation.teamInfo._id, participationId, stageId);
      patchParticipation(participationId, (current) => ({
        ...current,
        stages: current.stages.filter((stage) => stage._id !== stageId),
      }));
      if (focusedStageId === stageId) {
        setFocusedStageId("");
      }
      showToast("Stage deleted successfully", "success");
    } catch (error: any) {
      console.error("Failed to delete stage", error);
      showToast(error.response?.data?.message || "Failed to delete stage", "error");
    } finally {
      setIsDeletingStage(false);
      setStageToDelete(null);
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

  const handleSaveReflectionModal = async () => {
    if (!selectedParticipation || !reflectionModalStage || !reflectionModalDraft.trim()) return;
    try {
      const updatedStage = await teamApi.addReflection(
        selectedParticipation.teamInfo._id,
        selectedParticipation._id,
        reflectionModalStage._id,
        reflectionModalDraft.trim()
      );
      patchParticipation(selectedParticipation._id, (current) => ({
        ...current,
        stages: current.stages.map((stage) => (stage._id === reflectionModalStage._id ? { ...stage, ...updatedStage } : stage)),
      }));
      setReflectionModalDraft("");
      setReflectionModalStage(null);
      loadDashboardData(); // Refresh reflection lists
      showToast("Reflection logged successfully", "success");
    } catch (error: any) {
      console.error("Failed to add reflection", error);
      showToast(error.response?.data?.message || "Failed to add reflection", "error");
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
        {/* Tracker Sub-filters (Only shown when Tracker workspace is active) */}
        {activeTab === "tracker" && (
          <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
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
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  trackerSubFilter === tag.id
                    ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        )}

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
  }, [activeTab, trackerSubFilter]);

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
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-3xl border border-zinc-250 bg-gradient-to-r from-blue-50/45 to-indigo-50/25 dark:from-zinc-150/35 dark:to-zinc-150/15 p-4.5 shadow-xs">
                    {/* Circle Loader Centerpiece */}
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-150 p-4 rounded-2xl border border-zinc-250 shadow-xs justify-center lg:justify-start">
                      <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
                        {/* Rotating animated theme border */}
                        <div className="absolute inset-0 rounded-full border-[5px] border-blue-600/15 border-t-blue-600 dark:border-blue-500/15 dark:border-t-blue-500 animate-[spin_3s_linear_infinite]" />
                        <div className="flex flex-col items-center justify-center z-10">
                          <span className="text-xl font-black text-zinc-805 leading-none">{trackingCount}</span>
                          <span className="text-[7.5px] font-black text-zinc-450 uppercase tracking-widest mt-0.5">Tracking</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider truncate">Queue Size</h4>
                        <p className="text-base font-black text-zinc-750 truncate">{trackingCount} Tracked</p>
                      </div>
                    </div>

                    {/* Metric Card 2 */}
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-150 p-4 rounded-2xl border border-zinc-250 shadow-xs">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-650 shrink-0">
                        <Trophy className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider truncate">Active Tracker</h4>
                        <p className="text-base font-black text-zinc-750 truncate">{registeredCount} Registered</p>
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
                      className="flex items-center gap-4 bg-white dark:bg-zinc-150 p-4 rounded-2xl border border-zinc-250 shadow-xs cursor-pointer hover:border-amber-705 dark:hover:border-amber-705 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-705 shrink-0">
                        <AlertTriangle className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider truncate">Reflections</h4>
                        <p className="text-base font-black text-zinc-750 truncate">{pendingReflections.length} Pending</p>
                      </div>
                    </div>

                    {/* Metric Card 4 */}
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-150 p-4 rounded-2xl border border-zinc-250 shadow-xs">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Check className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider truncate">Finished</h4>
                        <p className="text-base font-black text-zinc-750 truncate">{finishedCount} Completed</p>
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
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3.5 border-b border-zinc-100 dark:border-zinc-850">
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

                const activePart = list.find(p => p._id === selectedParticipationId) || null;
                const isTerminated = (() => {
                  if (!activePart) return false;
                  const competitiveStages = activePart.stages.filter(s => !isRegistrationStage(s.name));
                  const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
                  const hasRejections = failedStageIdx !== -1;
                  return hasRejections || ['won', 'eliminated'].includes(activePart.status);
                })();

                return (
                  <div className="flex flex-col lg:flex-row gap-8 w-full lg:h-[calc(100vh-12rem)] lg:overflow-hidden">
                    {/* Left Column: Hackathons List (Fixed Width Sidebar) */}
                    <div className="w-full lg:w-80 shrink-0 flex flex-col h-auto lg:h-full overflow-hidden space-y-4">
                      <div className="flex items-center justify-between px-1 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Workspace List ({list.length})
                        </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                        {list.map((participation) => {
                          const coverSrc = participation.hackathon.coverImage?.trim() || getStableDefaultImage(`${participation.hackathon._id}:${participation.hackathon.title}`);
                          const currentProgress = participation.stages.length === 0 ? "No stages yet" : (participation._id === selectedParticipationId ? currentStageLabel : "Stage Tracking");
                          const isSelected = participation._id === selectedParticipationId;
                          return (
                            <button
                              key={participation._id}
                              onClick={() => {
                                setSelectedParticipationId(participation._id);
                                setFocusedStageId("");
                              }}
                              className={`w-full rounded-2xl border p-3.5 text-left transition-all duration-300 hover:bg-zinc-900/30 hover:border-zinc-700/60 dark:bg-zinc-950/40 cursor-pointer ${
                                isSelected 
                                  ? "border-blue-500/50 bg-blue-950/10 dark:bg-blue-950/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                                  : "border-zinc-200 dark:border-zinc-800/80"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
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
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <h3 className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">{participation.hackathon.title}</h3>
                                    <span className="rounded-md bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 shrink-0">
                                      {participation.hackathon.platform}
                                    </span>
                                  </div>
                                  <p className="truncate text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                                    Team: {getTeamName(participation.teamInfo)}
                                  </p>
                                  <div className="flex items-center gap-1 text-[9px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                                    <Clock3 className="h-3 w-3 text-zinc-400" />
                                    <span>{currentProgress}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                                      {/* Right Column: Workspace Details */}
                    <div className="flex-1 min-w-0 w-full h-auto lg:h-full lg:flex lg:flex-col lg:overflow-hidden pr-1">
                      <AnimatePresence mode="wait">
                        {!activePart ? (
                          <motion.div
                            key="placeholder"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="rounded-3xl border border-dashed border-zinc-250 bg-zinc-55 p-12 text-center flex flex-col items-center justify-center min-h-[420px] w-full"
                          >
                            <Trophy className="h-12 w-12 text-zinc-450" />
                            <h4 className="mt-4 text-base font-bold text-zinc-750">No Hackathon Selected</h4>
                            <p className="mt-2 text-xs text-zinc-550 max-w-xs leading-normal">
                              Select a project from the workspace list on the left to track progress, assign milestones, and log Reflections.
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={activePart._id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="w-full flex flex-col lg:h-full lg:overflow-hidden space-y-4"
                          >
                            {/* Sticky Top Header */}
                            <div className="bg-zinc-55 p-4 border border-zinc-250 rounded-3xl shrink-0 space-y-3 shadow-xs">
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                {/* Hackathon title */}
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base sm:text-lg font-black text-zinc-805 tracking-tight truncate">
                                    {activePart.hackathon.title}
                                  </h3>
                                </div>

                                {/* Header Actions */}
                                <div className="flex items-center gap-2.5">
                                  {/* Status Dropdown */}
                                  <div className="flex items-center gap-2 rounded-xl border border-zinc-250 bg-white dark:bg-zinc-150 px-3 py-1.5 shadow-xs">
                                    <span className="text-[9px] font-black uppercase text-zinc-450">Status:</span>
                                    <select
                                      value={activePart.status}
                                      onChange={(event) => handleUpdateParticipationStatus(activePart._id, event.target.value as Participation["status"])}
                                      disabled={loadingParticipationId === activePart._id}
                                      className="bg-transparent text-xs font-bold text-zinc-805 outline-none cursor-pointer border-none p-0 pr-1 select-none"
                                    >
                                      {activePart.status === 'tracking' && (
                                        <option value="tracking" className="bg-white dark:bg-zinc-150 text-zinc-805">Tracking</option>
                                      )}
                                      <option value="active" className="bg-white dark:bg-zinc-150 text-zinc-805">Active</option>
                                      <option value="finalist" className="bg-white dark:bg-zinc-150 text-zinc-805">Finalist</option>
                                      <option value="won" className="bg-white dark:bg-zinc-150 text-zinc-805">Won</option>
                                      <option value="eliminated" className="bg-white dark:bg-zinc-150 text-zinc-805">Eliminated</option>
                                    </select>
                                  </div>
                                  
                                  {loadingParticipationId === activePart._id && <LogoTransition width={28} height={18} loop={true} />}

                                  {/* Team Info Button */}
                                  <button
                                    onClick={() => setShowTeamModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-250 bg-white dark:bg-zinc-150 hover:bg-zinc-250 text-zinc-750 px-3 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer"
                                    title="Show Team Roster"
                                  >
                                    <Users className="h-4 w-4" /> Team Info
                                  </button>

                                  {/* Add Stage Button */}
                                  <button
                                    disabled={isTerminated}
                                    onClick={() => setShowAddStageModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-650 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Add New Milestone Stage"
                                  >
                                    <Plus className="h-4 w-4" /> Add Stage
                                  </button>

                                  {/* Close Button */}
                                  <button
                                    onClick={() => setSelectedParticipationId("")}
                                    className="rounded-xl p-2 text-zinc-550 border border-zinc-250 hover:bg-zinc-250 text-zinc-750 transition duration-200 cursor-pointer"
                                    title="Close workspace"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Timeline Stages List */}
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                              {(() => {
                                const competitiveStages = activePart.stages.filter(s => !isRegistrationStage(s.name));
                                if (competitiveStages.length === 0) {
                                  return (
                                    <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/20 p-8 text-center dark:border-zinc-850 dark:bg-zinc-900/10 text-sm text-zinc-500 dark:text-zinc-400">
                                      No milestone stages defined. Click the "Add Stage" button above to start competitive tracking.
                                    </div>
                                  );
                                }
                                return competitiveStages.map((stage, index) => {
                                  const isFocused = focusedStageId === stage._id;
                                  const failedStageIdx = competitiveStages.findIndex(s => s.result === 'rejected');
                                  const isDisqualified = failedStageIdx !== -1 && index > failedStageIdx;
                                  const reflectionsCount = stage.reflections?.length || 0;
                                  const isReflectionsExpanded = !!showReflectionsMap[stage._id];

                                  // Dynamic indicator colors
                                  const indicatorColor = isDisqualified 
                                    ? "bg-zinc-300 border-zinc-400" 
                                    : stage.result === "qualified" 
                                      ? "bg-emerald-500 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                                      : stage.result === "rejected" 
                                        ? "bg-rose-500 border-rose-600" 
                                        : "bg-amber-500 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.2)]";

                                  return (
                                    <div key={stage._id} className="relative pl-6 ml-3 border-l border-zinc-200 dark:border-zinc-800">
                                      {/* Left timeline dot */}
                                      <span className={`absolute -left-[7px] top-4.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-50 dark:border-zinc-950 transition-all duration-300 ${indicatorColor}`} />

                                      <div
                                        onClick={(e) => {
                                          if (e.target === e.currentTarget) {
                                            setFocusedStageId(stage._id);
                                          }
                                        }}
                                        className={`rounded-2xl border p-4 transition-all duration-300 ${
                                          isDisqualified
                                            ? "border-zinc-250/45 bg-zinc-150/10 dark:bg-zinc-55/40 opacity-55"
                                            : isFocused
                                              ? "border-blue-650 bg-blue-50/10 dark:bg-zinc-150 shadow-xs"
                                              : "border-zinc-250 bg-white hover:bg-zinc-55/50 dark:bg-zinc-55 dark:hover:bg-zinc-150/50"
                                        }`}
                                      >
                                        {/* Header inside Stage Card */}
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="mt-1 flex h-5.5 w-5.5 items-center justify-center rounded-lg bg-zinc-150 text-[10px] font-black text-zinc-550 shrink-0">
                                              {index + 1}
                                            </div>
                                            
                                            <div className="space-y-1 flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                {isDisqualified && (
                                                  <span className="inline-flex items-center gap-1 rounded bg-zinc-250 px-1.5 py-0.5 text-[8px] font-black uppercase text-zinc-550 shrink-0">
                                                    Disqualified
                                                  </span>
                                                )}
                                                <input
                                                  disabled={isDisqualified || isTerminated}
                                                  defaultValue={stage.name}
                                                  onFocus={() => setFocusedStageId(stage._id)}
                                                  onBlur={(event) => {
                                                    if (event.target.value.trim() !== stage.name) {
                                                      handleStageFieldSave(activePart._id, stage._id, { name: event.target.value.trim() });
                                                    }
                                                  }}
                                                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-250 focus:border-blue-650 text-sm font-bold text-zinc-805 outline-none pb-0.5 transition"
                                                />
                                              </div>
                                              
                                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-450">
                                                <span className="inline-flex items-center gap-1">
                                                  <Clock3 className="h-3 w-3" />
                                                  Deadline: {formatDate(stage.deadline || undefined)}
                                                </span>
                                                {!isDisqualified && isCurrentUserPending(stage, user?._id) && (
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-450 uppercase text-[8px] tracking-wider">
                                                    pending reflection
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {/* Log Reflection chat icon */}
                                            <button
                                              onClick={() => {
                                                setFocusedStageId(stage._id);
                                                const userReflection = stage.reflections.find(
                                                  (r) => (typeof r.user === "string" ? r.user : r.user?._id) === user?._id
                                                );
                                                setReflectionModalDraft(userReflection ? userReflection.note : "");
                                                setReflectionModalStage(stage);
                                              }}
                                              className="rounded-lg p-1.5 text-zinc-450 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-500 transition cursor-pointer"
                                              title="Log Reflection"
                                            >
                                              <MessageSquare className="h-4 w-4" />
                                            </button>
                                            
                                            {/* Delete Stage */}
                                            <button
                                              disabled={isTerminated}
                                              onClick={() => handleDeleteStage(activePart._id, stage._id, stage.name)}
                                              className="rounded-lg p-1.5 text-zinc-450 hover:bg-rose-500/10 hover:text-rose-500 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                              title="Delete stage"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Actions Row */}
                                        <div className="mt-4 pt-3.5 border-t border-zinc-250 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <input
                                            disabled={isDisqualified || isTerminated}
                                            type="date"
                                            onFocus={() => setFocusedStageId(stage._id)}
                                            defaultValue={stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : ""}
                                            onBlur={(event) => {
                                              const nextValue = event.target.value || null;
                                              const currentValue = stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : "";
                                              if (nextValue !== currentValue) {
                                                handleStageFieldSave(activePart._id, stage._id, { deadline: nextValue });
                                              }
                                            }}
                                            className="rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 px-3 py-1.5 text-xs text-zinc-805 outline-none transition focus:border-blue-650 disabled:cursor-not-allowed disabled:bg-zinc-150 disabled:text-zinc-450"
                                          />
                                          <div
                                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition duration-200 ${
                                              isDisqualified || isTerminated 
                                                ? "border-zinc-250 bg-zinc-150 text-zinc-450" 
                                                : getStageResultClass(stage.result)
                                            }`}
                                          >
                                            <CircleDot className="h-3.5 w-3.5 shrink-0" />
                                            <select
                                              disabled={isDisqualified || isTerminated}
                                              value={isDisqualified ? "rejected" : stage.result}
                                              onChange={(event) => handleStageResultSelect(activePart._id, stage._id, event.target.value as Stage["result"])}
                                              className="bg-transparent border-none outline-none font-bold uppercase tracking-wider cursor-pointer p-0 select-none text-xs w-full text-center"
                                            >
                                              <option value="pending" className="bg-white dark:bg-zinc-150 text-zinc-805">pending</option>
                                              <option value="qualified" className="bg-white dark:bg-zinc-150 text-zinc-805">qualified</option>
                                              <option value="rejected" className="bg-white dark:bg-zinc-150 text-zinc-805">rejected</option>
                                            </select>
                                          </div>
                                        </div>

                                        {/* Notes Textarea */}
                                        <textarea
                                          disabled={isDisqualified || isTerminated}
                                          onFocus={() => setFocusedStageId(stage._id)}
                                          defaultValue={stage.notes || ""}
                                          onBlur={(event) => {
                                            if (event.target.value.trim() !== (stage.notes || "")) {
                                              handleStageFieldSave(activePart._id, stage._id, { notes: event.target.value.trim() });
                                            }
                                          }}
                                          placeholder="Add plans, submission guidelines, or deliverables..."
                                          className="mt-3.5 min-h-[64px] w-full rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 px-3 py-2 text-xs text-zinc-805 outline-none transition focus:border-blue-650 disabled:cursor-not-allowed disabled:bg-zinc-150 disabled:text-zinc-450"
                                        />

                                        {/* Saving status */}
                                        {noteSavingStatus[stage._id] && (
                                          <div className="mt-1.5 text-[9px] font-black text-zinc-450 uppercase tracking-wide">
                                            {noteSavingStatus[stage._id] === "saving" && "Saving details..."}
                                            {noteSavingStatus[stage._id] === "saved" && "Saved Successfully"}
                                            {noteSavingStatus[stage._id] === "error" && "Save Failed"}
                                          </div>
                                        )}

                                        {/* Reflections Section Footer */}
                                        <div className="mt-4 pt-3 border-t border-zinc-250 flex flex-col gap-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-450">
                                              Reflections
                                            </span>
                                            
                                            {/* Toggle Reflections List */}
                                            <button
                                              onClick={() => {
                                                setShowReflectionsMap(prev => ({
                                                  ...prev,
                                                  [stage._id]: !prev[stage._id]
                                                }));
                                              }}
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                            >
                                              {isReflectionsExpanded ? "Hide Reflections" : `Show Reflections (${reflectionsCount})`}
                                            </button>
                                          </div>

                                          {/* Expanded Reflections List */}
                                          <AnimatePresence>
                                            {isReflectionsExpanded && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden space-y-2.5 pt-1.5"
                                              >
                                                {reflectionsCount > 0 ? (
                                                  <div className="space-y-2">
                                                    {stage.reflections.map((reflection, reflectionIndex) => {
                                                      const isOwn = (typeof reflection.user === "string" ? reflection.user : reflection.user?._id) === user?._id;
                                                      const memberName = typeof reflection.user === "string" 
                                                        ? "Teammate" 
                                                        : reflection.user.fullName || reflection.user.username || "Teammate";

                                                      return (
                                                        <div 
                                                          key={`${stage._id}-${reflectionIndex}`} 
                                                          className={`rounded-xl border p-3 text-xs ${
                                                            isOwn 
                                                              ? "border-blue-200/50 bg-blue-50/10 dark:border-blue-900/30 dark:bg-blue-950/15" 
                                                              : "border-zinc-150 bg-zinc-50/50 dark:border-zinc-850 dark:bg-zinc-900/40"
                                                          }`}
                                                        >
                                                          <div className="flex items-center justify-between">
                                                            <span className="text-[9px] font-extrabold text-zinc-500 dark:text-zinc-450 uppercase tracking-wider">
                                                              {memberName} {isOwn && "(You)"}
                                                            </span>
                                                            {isOwn && (
                                                              <button
                                                                onClick={() => {
                                                                  setFocusedStageId(stage._id);
                                                                  setReflectionModalDraft(reflection.note);
                                                                  setReflectionModalStage(stage);
                                                                }}
                                                                className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                              >
                                                                Edit
                                                              </button>
                                                            )}
                                                          </div>
                                                          <p className="mt-1 text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold break-words">
                                                            {reflection.note}
                                                          </p>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : (
                                                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/30 dark:border-zinc-850 dark:bg-zinc-900/10 p-3 text-center text-xs text-zinc-500 dark:text-zinc-450">
                                                    No reflections logged for this milestone.
                                                  </div>
                                                )}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* DELETE STAGE CONFIRMATION MODAL */}
      <AnimatePresence>
        {stageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[2rem] border border-zinc-250 bg-white dark:bg-zinc-150 p-6 shadow-2xl text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-450 mb-4 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-805 mb-2">Delete Milestone Stage?</h3>
              <p className="text-xs text-zinc-550 mb-6 leading-normal">
                Are you sure you want to delete stage <strong className="text-zinc-805 font-bold">"{stageToDelete.stageName}"</strong>? This will permanently erase this stage milestone and all associated reflection logs.
              </p>

              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  onClick={() => setStageToDelete(null)}
                  className="flex-1 rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 py-2.5 text-xs font-bold text-zinc-750 transition hover:bg-zinc-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStage}
                  disabled={isDeletingStage}
                  className="flex-1 rounded-xl bg-rose-505 hover:bg-rose-450 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-h-[36px]"
                >
                  {isDeletingStage ? <LogoTransition width={28} height={18} loop={true} /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT STAGE CONFIRMATION MODAL */}
      <AnimatePresence>
        {stageToReject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[2rem] border border-zinc-250 bg-white dark:bg-zinc-150 p-6 shadow-2xl text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-705 mb-4 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-805 mb-2">Mark Stage as Rejected?</h3>
              <p className="text-xs text-zinc-550 mb-6 leading-normal">
                Are you sure you want to mark this milestone stage as <span className="text-rose-505 font-bold uppercase">Rejected</span>?
                <br /><br />
                <span className="text-[11px] font-black uppercase text-amber-705">⚠️ Warning:</span> This action will mark your project workspace as disqualified/terminated and prevent any future milestone additions or editing.
              </p>

              <div className="flex gap-2.5 pt-2 justify-end">
                <button
                  onClick={() => setStageToReject(null)}
                  className="flex-1 rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 py-2.5 text-xs font-bold text-zinc-750 transition hover:bg-zinc-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await executeUpdateStageResult(
                      stageToReject.participationId,
                      stageToReject.stageId,
                      "rejected",
                      stageToReject.currentNotes,
                      stageToReject.currentName,
                      stageToReject.currentDeadline
                    );
                    setStageToReject(null);
                  }}
                  disabled={isRejectingStage}
                  className="flex-1 rounded-xl bg-rose-505 hover:bg-rose-450 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-h-[36px]"
                >
                  {isRejectingStage ? <LogoTransition width={28} height={18} loop={true} /> : "Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TEAM INFO POPUP MODAL */}
      <AnimatePresence>
        {showTeamModal && selectedParticipation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-[2rem] border border-zinc-250 bg-white dark:bg-zinc-150 p-6 shadow-2xl text-left"
            >
              <button
                onClick={() => setShowTeamModal(false)}
                className="absolute top-4 right-4 rounded-xl p-1.5 text-zinc-450 hover:bg-zinc-150 hover:text-zinc-805 transition duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-250">
                <Users className="h-5.5 w-5.5 text-blue-650" />
                <div>
                  <h3 className="text-base font-extrabold text-zinc-805">Team Information</h3>
                  <p className="text-[10px] font-semibold text-zinc-450">Roster & Workspace Details</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1">Team Name</h4>
                  <p className="text-sm font-bold text-zinc-805">{selectedParticipation.teamInfo.name}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-450 mb-1.5">Members ({selectedParticipation.teamInfo.members.length})</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedParticipation.teamInfo.members.map((member) => {
                      const isOwner = member._id === (typeof selectedParticipation.teamInfo.owner === "string" ? selectedParticipation.teamInfo.owner : selectedParticipation.teamInfo.owner?._id);
                      return (
                        <div key={member._id} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-250 bg-zinc-55">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-650/10 text-xs font-bold text-blue-650">
                            {(member.fullName || member.username || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-zinc-805 flex items-center gap-1.5">
                              {member.fullName || member.username || member.email || "Member"}
                              {isOwner && (
                                <span className="rounded bg-blue-650/10 px-1 py-0.2 text-[8px] font-black uppercase text-blue-650">
                                  Owner
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[10px] text-zinc-450">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-250 flex justify-end">
                <button
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-zinc-250 hover:bg-zinc-350 text-zinc-750 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD STAGE POPUP MODAL */}
      <AnimatePresence>
        {showAddStageModal && selectedParticipation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-[2rem] border border-zinc-250 bg-white dark:bg-zinc-150 p-6 shadow-2xl text-left"
            >
              <button
                onClick={() => {
                  setShowAddStageModal(false);
                  setNewStageName("");
                  setNewStageDeadline("");
                }}
                className="absolute top-4 right-4 rounded-xl p-1.5 text-zinc-450 hover:bg-zinc-150 hover:text-zinc-855 transition duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-250">
                <Plus className="h-5.5 w-5.5 text-blue-650" />
                <div>
                  <h3 className="text-base font-extrabold text-zinc-805">Add Milestone Stage</h3>
                  <p className="text-[10px] font-semibold text-zinc-450">Create a competitive progress phase</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-450">Stage Name</label>
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(event) => setNewStageName(event.target.value)}
                    placeholder="e.g. Prototype Video submission"
                    className="w-full rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 px-3 py-2.5 text-xs text-zinc-805 outline-none transition focus:border-blue-650"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-450">Deadline Date</label>
                  <input
                    type="date"
                    value={newStageDeadline}
                    onChange={(event) => setNewStageDeadline(event.target.value)}
                    className="w-full rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 px-3 py-2.5 text-xs text-zinc-805 outline-none transition focus:border-blue-650"
                  />
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-250 flex gap-2.5 justify-end">
                <button
                  onClick={() => {
                    setShowAddStageModal(false);
                    setNewStageName("");
                    setNewStageDeadline("");
                  }}
                  className="px-4 py-2.5 text-xs font-bold border border-zinc-250 bg-white dark:bg-zinc-55 hover:bg-zinc-150 text-zinc-750 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={isAddingStage || !newStageName.trim()}
                  onClick={async () => {
                    await handleAddStage();
                    setShowAddStageModal(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-650 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isAddingStage ? <LogoTransition width={28} height={18} loop={true} /> : "Create Stage"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LOG REFLECTION POPUP MODAL */}
      <AnimatePresence>
        {reflectionModalStage && selectedParticipation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-[2rem] border border-zinc-250 bg-white dark:bg-zinc-150 p-6 shadow-2xl text-left"
            >
              <button
                onClick={() => {
                  setReflectionModalStage(null);
                  setReflectionModalDraft("");
                }}
                className="absolute top-4 right-4 rounded-xl p-1.5 text-zinc-450 hover:bg-zinc-150 hover:text-zinc-805 transition duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-250">
                <MessageSquare className="h-5.5 w-5.5 text-blue-650" />
                <div>
                  <h3 className="text-base font-extrabold text-zinc-805">Log Stage Reflection</h3>
                  <p className="text-[10px] font-semibold text-zinc-450">For Phase: {reflectionModalStage.name}</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-zinc-550 leading-normal">
                  Write notes about your accomplishments, hurdles, key takeaways, or blockers encountered during this phase. Reflections help your team evaluate and align for upcoming stages.
                </p>
                <div className="space-y-1.5">
                  <textarea
                    value={reflectionModalDraft}
                    onChange={(event) => setReflectionModalDraft(event.target.value)}
                    placeholder="Share lessons learned, challenges faced, or general takeaways..."
                    className="w-full min-h-[120px] rounded-xl border border-zinc-250 bg-white dark:bg-zinc-55 px-3 py-2.5 text-xs text-zinc-805 outline-none transition focus:border-blue-650"
                  />
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-250 flex gap-2.5 justify-end">
                <button
                  onClick={() => {
                    setReflectionModalStage(null);
                    setReflectionModalDraft("");
                  }}
                  className="px-4 py-2.5 text-xs font-bold border border-zinc-250 bg-white dark:bg-zinc-55 hover:bg-zinc-150 text-zinc-750 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!reflectionModalDraft.trim()}
                  onClick={handleSaveReflectionModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-650 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
