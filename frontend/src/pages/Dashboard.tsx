import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Flag,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Settings,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
import HackathonCard from "../components/HackathonCard";
import { teamApi, userApi } from "../services";
import type { HackathonLite, Stage, Team, TeamHackathon } from "../types";

type SavedHackathon = HackathonLite;
type Participation = TeamHackathon & { teamInfo: Team };
type ProfileMessage = { type: "success" | "error"; text: string };

const TRACKER_STATUSES: Array<Participation["status"] | "all"> = ["all", "active", "finalist", "won", "eliminated"];
const STAGE_RESULTS: Array<Stage["result"]> = ["pending", "qualified", "rejected"];

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

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "bookmarks";

  const [savedHackathons, setSavedHackathons] = useState<SavedHackathon[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [pendingReflections, setPendingReflections] = useState<Stage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Participation["status"] | "all">("all");
  const [selectedParticipationId, setSelectedParticipationId] = useState<string>("");
  const [focusedStageId, setFocusedStageId] = useState<string>("");
  const [loadingParticipationId, setLoadingParticipationId] = useState<string | null>(null);
  const [noteSavingStatus, setNoteSavingStatus] = useState<Record<string, "saved" | "saving" | "error">>({});

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<ProfileMessage | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<ProfileMessage | null>(null);
  const [activeReflectionStageId, setActiveReflectionStageId] = useState("");
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageDeadline, setNewStageDeadline] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [savedRes, teamsRes, pendingRes] = await Promise.all([
        axiosInstance.get("/users/saved"),
        teamApi.getUserTeams(),
        userApi.getPendingReflections(),
      ]);

      setSavedHackathons(savedRes.data?.data || savedRes.data || []);
      setPendingReflections(pendingRes);

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

      setParticipations(teamParticipations.flat());
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const onFocus = () => loadDashboardData();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (!selectedParticipationId && participations.length > 0) {
      setSelectedParticipationId(participations[0]._id);
    }
  }, [participations, selectedParticipationId]);

  useEffect(() => {
    if (activeTab === "tracker" && !selectedParticipationId && participations.length > 0) {
      setSelectedParticipationId(participations[0]._id);
    }
  }, [activeTab, participations, selectedParticipationId]);

  const handleTabChange = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  const handleRemoveBookmark = async (hackathonId: string) => {
    try {
      const res = await axiosInstance.post(`/users/saved/${hackathonId}`);
      if (res.data?.success && res.data?.data) {
        const nextSavedHackathons = res.data.data.savedHackathons || [];
        updateUser({
          ...user!,
          savedHackathons: nextSavedHackathons,
        });
        setSavedHackathons((previous) => previous.filter((hackathon) => hackathon._id !== hackathonId));
      }
    } catch (error) {
      console.error("Failed to remove bookmark", error);
    }
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const res = await axiosInstance.put("/users/update", { fullName, email });
      if (res.data?.success && res.data?.data) {
        updateUser({
          ...user!,
          fullName: res.data.data.fullName,
          email: res.data.data.email,
        });
        setProfileMessage({ type: "success", text: "Profile details updated successfully." });
      }
    } catch (error: any) {
      console.error(error);
      setProfileMessage({ type: "error", text: error.response?.data?.message || "Failed to update profile details." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await axiosInstance.post("/users/change-password", { oldPassword, newPassword });
      if (res.data?.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully." });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      console.error(error);
      setPasswordMessage({ type: "error", text: error.response?.data?.message || "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const selectedParticipation = useMemo(
    () => participations.find((participation) => participation._id === selectedParticipationId) || null,
    [participations, selectedParticipationId]
  );

  const filteredParticipations = useMemo(() => {
    if (statusFilter === "all") return participations;
    return participations.filter((participation) => participation.status === statusFilter);
  }, [participations, statusFilter]);

  const pendingBanner = useMemo(() => {
    if (pendingReflections.length === 0) return null;
    const firstPending = pendingReflections[0];
    const participationId = typeof firstPending.teamHackathon === "object" ? firstPending.teamHackathon._id : "";
    const participation = participations.find((item) => item._id === participationId);
    return { firstPending, participation };
  }, [pendingReflections, participations]);

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

    setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "saving" }));
    try {
      const updatedStage = await teamApi.updateStage(participation.teamInfo._id, participationId, stageId, payload);
      patchParticipation(participationId, (current) => ({
        ...current,
        stages: current.stages.map((candidate) => (candidate._id === stageId ? { ...candidate, ...updatedStage } : candidate)),
      }));
      setNoteSavingStatus((previous) => ({ ...previous, [stageId]: "saved" }));
    } catch (error) {
      console.error("Failed to save stage", error);
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
    } catch (error) {
      console.error("Failed to update stage result", error);
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
    } catch (error) {
      console.error("Failed to delete stage", error);
    }
  };

  const handleAddStage = async () => {
    if (!selectedParticipation || !newStageName.trim()) return;
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
    } catch (error) {
      console.error("Failed to add stage", error);
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
    } catch (error) {
      console.error("Failed to add reflection", error);
    }
  };

  const handleWritePendingReflection = () => {
    if (!pendingBanner?.participation || !pendingBanner.firstPending) return;
    setSelectedParticipationId(pendingBanner.participation._id);
    setFocusedStageId(pendingBanner.firstPending._id);
    setSearchParams({ tab: "tracker" });
  };

  const stats = useMemo(() => {
    const totalBookmarked = savedHackathons.length;
    const totalParticipations = participations.length;
    const acceptedCount = participations.filter((participation) => /won|finalist/i.test(participation.status)).length;
    const pendingCount = pendingReflections.length;
    return { totalBookmarked, totalParticipations, acceptedCount, pendingCount };
  }, [savedHackathons, participations, pendingReflections]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 md:px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-zinc-950 to-indigo-950 p-6 shadow-xl md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/20 text-xl font-black uppercase text-blue-400">
                {user?.fullName?.slice(0, 2) || "HK"}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Tracking Workspace</p>
                <h1 className="text-2xl font-black tracking-tight text-white md:text-4xl">Your hackathon lifecycle hub</h1>
              </div>
            </div>
            <p className="text-sm text-zinc-400">Bookmarks, team registrations, stage tracking, and reflections live here together.</p>
          </div>

          <Link
            to="/hackathons"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/35"
          >
            Explore Hackathons
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Bookmarks</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{stats.totalBookmarked}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Participations</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{stats.totalParticipations}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Won / Finalist</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-400">{stats.acceptedCount}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending reflections</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-400">{stats.pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: "bookmarks", label: "Bookmarks", icon: BookOpen },
          { id: "tracker", label: "Hackathon Tracker", icon: Flag },
          { id: "profile", label: "Profile", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loadingData ? (
        <div className="flex h-60 w-full flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Loading your dashboard...</p>
        </div>
      ) : (
        <div className="min-h-[40vh]">
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
                    className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500"
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

          {activeTab === "tracker" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {TRACKER_STATUSES.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === status
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {pendingBanner && (
                <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-5 dark:bg-amber-500/10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">✍ You have {pendingReflections.length} pending reflections</p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Latest prompt: {pendingBanner.firstPending.name} in {pendingBanner.participation?.hackathon.title || "your tracked hackathon"}
                      </p>
                    </div>
                    <button
                      onClick={handleWritePendingReflection}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-400"
                    >
                      Write Now
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {filteredParticipations.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
                  <Flag className="mx-auto h-12 w-12 text-zinc-400" />
                  <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No team hackathons yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                    Register a team on a hackathon detail page and it will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
                  <div className="space-y-3">
                    {filteredParticipations.map((participation) => {
                      const coverSrc = participation.hackathon.coverImage?.trim() || getStableDefaultImage(`${participation.hackathon._id}:${participation.hackathon.title}`);
                      const stageProgress = participation.stages.length === 0 ? "No stages yet" : currentStageLabel;
                      const isSelected = selectedParticipationId === participation._id;
                      return (
                        <button
                          key={participation._id}
                          onClick={() => {
                            setSelectedParticipationId(participation._id);
                            setFocusedStageId("");
                          }}
                          className={`w-full rounded-[1.7rem] border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-950/60 ${
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
                                  {stageProgress}
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
                              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                                <GripVertical className="h-3.5 w-3.5" />
                                {currentStageLabel}
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
                                <option value="active">Active</option>
                                <option value="finalist">Finalist</option>
                                <option value="won">Won</option>
                                <option value="eliminated">Eliminated</option>
                              </select>
                              {loadingParticipationId === selectedParticipation._id && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-5">
                            <div className="space-y-6">
                              <section>
                                <div className="mb-3 flex items-center justify-between">
                                  <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Stage timeline</h4>
                                  <button
                                    onClick={handleAddStage}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Stage
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {selectedParticipation.stages.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
                                      No stages yet. Add the first stage to start tracking.
                                    </div>
                                  ) : (
                                    selectedParticipation.stages.map((stage, index) => {
                                      const isFocused = focusedStageId === stage._id;
                                      return (
                                        <div
                                          key={stage._id}
                                          className={`rounded-[1.4rem] border p-4 transition ${
                                            isFocused
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
                                                <input
                                                  defaultValue={stage.name}
                                                  onBlur={(event) => {
                                                    if (event.target.value !== stage.name) {
                                                      handleStageFieldSave(selectedParticipation._id, stage._id, { name: event.target.value });
                                                    }
                                                  }}
                                                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                                                />
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    {formatDate(stage.deadline || undefined)}
                                                  </span>
                                                  {isCurrentUserPending(stage, user?._id) && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                                                      pending reflection
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => handleDeleteStage(selectedParticipation._id, stage._id)}
                                              className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                                              title="Delete stage"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>

                                          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                                            <input
                                              type="date"
                                              defaultValue={stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : ""}
                                              onBlur={(event) => {
                                                const nextValue = event.target.value || null;
                                                const currentValue = stage.deadline ? new Date(stage.deadline).toISOString().slice(0, 10) : "";
                                                if (nextValue !== currentValue) {
                                                  handleStageFieldSave(selectedParticipation._id, stage._id, { deadline: nextValue });
                                                }
                                              }}
                                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                            />
                                            <button
                                              onClick={() => handleCycleStageResult(selectedParticipation._id, stage._id)}
                                              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${getStageResultClass(stage.result)}`}
                                            >
                                              <CircleDot className="h-3.5 w-3.5" />
                                              {stage.result}
                                            </button>
                                          </div>

                                          <textarea
                                            defaultValue={stage.notes || ""}
                                            onBlur={(event) => {
                                              if (event.target.value !== (stage.notes || "")) {
                                                handleStageFieldSave(selectedParticipation._id, stage._id, { notes: event.target.value });
                                              }
                                            }}
                                            placeholder="Stage notes"
                                            className="mt-3 min-h-[92px] w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
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
                                                className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                                              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
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
                                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    onClick={handleAddReflection}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
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
                                    })
                                  )}
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                                  <input
                                    type="text"
                                    value={newStageName}
                                    onChange={(event) => setNewStageName(event.target.value)}
                                    placeholder="Add a new stage"
                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                  />
                                  <input
                                    type="date"
                                    value={newStageDeadline}
                                    onChange={(event) => setNewStageDeadline(event.target.value)}
                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-blue-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                                  />
                                </div>
                                <div className="mt-3 flex justify-end">
                                  <button
                                    onClick={handleAddStage}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
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
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-zinc-200/90 bg-white p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/60 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Personal Information</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Update your identity and account email.</p>
                  </div>
                </div>

                {profileMessage && (
                  <div className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold ${profileMessage.type === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" : "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"}`}>
                    {profileMessage.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {profileMessage.text}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <button type="submit" disabled={profileLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60">
                    {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Details
                  </button>
                </form>
              </div>

              <div className="rounded-[2rem] border border-zinc-200/90 bg-white p-6 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/60 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Security Credentials</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Change your password when needed.</p>
                  </div>
                </div>

                {passwordMessage && (
                  <div className={`mb-5 flex items-center gap-3 rounded-2xl border p-4 text-xs font-semibold ${passwordMessage.type === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" : "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400"}`}>
                    {passwordMessage.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {passwordMessage.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Current Password</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(event) => setOldPassword(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <button type="submit" disabled={passwordLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60">
                    {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Change Password
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
