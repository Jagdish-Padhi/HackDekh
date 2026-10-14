import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  AlertTriangle,
  Trophy,
  Users,
  Check,
  Clock3,
  ChevronRight,
} from "lucide-react";
import { useCache, useToast } from "../context";
import { usePageChrome } from "../context/pageChrome";
import { teamApi, userApi } from "../services";
import type { Stage, Team, TeamHackathon, TeamInvitation } from "../types";

type Participation = TeamHackathon & { teamInfo: Team };

export const isRegistrationStage = (name: string): boolean => {
  return /register|registration|apply|application|prep|regn/i.test(name);
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

export default function DashboardPage() {
  const { showToast } = useToast();
  const { setPageActions } = usePageChrome();
  const { dashboardData, setDashboardData } = useCache();
  const isInitialMountRef = useRef(true);

  const [participations, setParticipations] = useState<Participation[]>(dashboardData?.participations || []);
  const [pendingReflections, setPendingReflections] = useState<Stage[]>(dashboardData?.pendingReflections || []);
  const [incomingInvites, setIncomingInvites] = useState<TeamInvitation[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(!dashboardData);

  // Overview status filter for registered hackathons
  const [overviewFilter, setOverviewFilter] = useState<"all" | "won" | "finalist" | "eliminated">("all");

  // Inline Reflection State
  const [activeReflectionStageId, setActiveReflectionStageId] = useState<string>("");
  const [selectedParticipationId, setSelectedParticipationId] = useState<string>("");
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [isSavingReflection, setIsSavingReflection] = useState(false);

  // Clear pageActions so upper bar only has the circular (i) info guide button
  useEffect(() => {
    setPageActions(null);
    return () => setPageActions(null);
  }, [setPageActions]);

  const patchParticipation = (participationId: string, updater: (participation: Participation) => Participation) => {
    setParticipations((previous) => previous.map((item) => (item._id === participationId ? updater(item) : item)));
  };

  const selectedParticipation = useMemo(
    () => participations.find((p) => p._id === selectedParticipationId) || null,
    [participations, selectedParticipationId]
  );

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoadingData(true);
    }
    try {
      const [teamsRes, pendingRes] = await Promise.all([
        teamApi.getUserTeams(),
        userApi.getPendingReflections(),
      ]);

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

      setPendingReflections(pendingRes);
      setParticipations(fetchedParticipations);

      setDashboardData({
        pendingReflections: pendingRes,
        participations: fetchedParticipations,
      });
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoadingData(false);
    }
  }, [setDashboardData]);

  const loadIncomingInvites = useCallback(async () => {
    try {
      const data = await teamApi.getUserInvitations();
      setIncomingInvites(data);
    } catch (err) {
      console.error("Failed to load incoming invitations:", err);
    }
  }, []);

  const handleRespondInvite = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      await teamApi.respondToInvitation(invitationId, action);
      showToast(`Invitation ${action}ed successfully!`, "success");
      await loadIncomingInvites();
      await loadDashboardData(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || `Failed to ${action} invitation.`, "error");
    }
  };

  const handleAddReflection = async () => {
    if (!selectedParticipation || !activeReflectionStageId || !reflectionDraft.trim() || isSavingReflection) return;
    const targetStage = selectedParticipation.stages.find((stage) => stage._id === activeReflectionStageId);
    if (!targetStage) return;

    setIsSavingReflection(true);
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
      setPendingReflections((prev) => prev.filter((s) => s._id !== activeReflectionStageId));
      setReflectionDraft("");
      setActiveReflectionStageId("");
      showToast("Reflection note saved!", "success");
    } catch (error) {
      console.error("Failed to add reflection", error);
      showToast("Failed to save reflection note.", "error");
    } finally {
      setIsSavingReflection(false);
    }
  };

  useEffect(() => {
    const isInitialMount = isInitialMountRef.current;
    isInitialMountRef.current = false;

    loadDashboardData(isInitialMount && !!dashboardData);
    loadIncomingInvites();

    const onFocus = () => {
      loadDashboardData(true);
      loadIncomingInvites();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [loadDashboardData, loadIncomingInvites]);

  // Compute upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const list: Array<{
      stage: Stage;
      participation: Participation;
      daysRemaining: number;
    }> = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    participations.forEach((participation) => {
      // 1. Virtual registration deadline for tracking items
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

  const trackingCount = participations.filter(p => p.status === 'tracking').length;
  const registeredCount = participations.filter(p => p.status === 'active').length;
  const finishedCount = participations.filter(p => ["won", "finalist", "eliminated"].includes(p.status)).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-2 md:px-6 space-y-6 relative">
      {loadingData ? (
        <div className="space-y-6 select-none pointer-events-none animate-pulse">
          {/* Metric Cards Skeleton */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3.5 bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs h-18 animate-pulse" />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40 h-80">
                <div className="h-full w-full rounded-lg bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40 h-80">
                <div className="h-full w-full rounded-lg bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-[40vh] space-y-6">
          {/* Analytics Metric Row */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {/* Metric Card 1: Queue */}
            <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40">
                <Clock3 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">Tracking Queue</p>
                <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">{trackingCount}</p>
              </div>
            </div>

            {/* Metric Card 2: Registered */}
            <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">Registered</p>
                <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">{registeredCount}</p>
              </div>
            </div>

            {/* Metric Card 3: Reflections */}
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
              className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition hover:border-amber-400/80 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-amber-500/60 cursor-pointer"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">Pending Reflections</p>
                <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">{pendingReflections.length}</p>
              </div>
            </div>

            {/* Metric Card 4: Finished */}
            <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40">
                <Check className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">Completed</p>
                <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">{finishedCount}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Deadlines & Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Deadlines */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40">
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
                          className="relative group block cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 p-2 -m-2 rounded-lg transition-all duration-200"
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

              {/* Registered Hackathons & Results */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Registered Hackathons & Results</h2>
                  </div>
                  
                  {/* Results filter */}
                  <div className="flex gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                    {[
                      { id: "all", label: "All Active" },
                      { id: "won", label: "Won" },
                      { id: "finalist", label: "Finalist" },
                      { id: "eliminated", label: "Eliminated" }
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
                        <div key={part._id} className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 truncate">{part.hackathon.title}</p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">Team: {getTeamName(part.teamInfo)}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                            part.status === "won" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                            part.status === "finalist" ? "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                            part.status === "eliminated" ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400" :
                            "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                          }`}>
                            {part.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Invitations & Reflections */}
            <div className="space-y-6">
              {/* Incoming Team Invitations */}
              {incomingInvites.length > 0 && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 dark:bg-blue-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Team Invitations</h3>
                    </div>
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {incomingInvites.length} new
                    </span>
                  </div>

                  <div className="space-y-3">
                    {incomingInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="bg-white dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs space-y-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                            Invited to join <strong className="text-zinc-900 dark:text-zinc-100 font-extrabold">{invite.team?.name}</strong>
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            By {invite.invitedBy?.fullName || invite.invitedBy?.username} (@{invite.invitedBy?.username})
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRespondInvite(invite._id, 'accept')}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-bold transition hover:bg-blue-500 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondInvite(invite._id, 'decline')}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 px-3 py-1.5 text-xs font-bold transition hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reflection Warnings Panel */}
              <div id="pending-reflections-panel" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Milestone Review Notes</h3>
                </div>

                {pendingReflections.length === 0 ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                    Excellent! You have written progress notes for all milestones.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                      Log your lessons, challenges, and progress notes for completed milestones to keep your workspace updated.
                    </p>
                    
                    {pendingReflections.map((stage) => {
                      const isReflecting = activeReflectionStageId === stage._id;
                      return (
                        <div key={stage._id} className="p-3 bg-white dark:bg-zinc-900/60 rounded-lg border border-amber-500/20 shadow-xs">
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
                              className="mt-2.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              Write Notes <ChevronRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={reflectionDraft}
                                onChange={(e) => setReflectionDraft(e.target.value)}
                                placeholder="What went well? What obstacles did you encounter? What is the team status?"
                                className="w-full min-h-[60px] p-2 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveReflectionStageId("")}
                                  className="px-2 py-1 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAddReflection}
                                  disabled={isSavingReflection}
                                  className="px-2 py-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingReflection ? "Saving..." : "Save"}
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
    </div>
  );
}
