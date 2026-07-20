import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Info,
  Check,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useToast } from "../context";
import { usePageChrome } from "../context/pageChrome";
import { teamApi } from "../services";
import type { Team, TeamHackathon } from "../types";
import LoadingProgress from "../components/LoadingProgress";

export const isRegistrationStage = (name: string): boolean => {
  return /register|registration|apply|application|prep|regn/i.test(name);
};

const formatDateTag = (value?: string | null) => {
  if (!value) return "--/--/----";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--/--/----";
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = parsed.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function TrackerPage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { setPageActions } = usePageChrome();

  const [participations, setParticipations] = useState<(TeamHackathon & { teamInfo: Team })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"tracking" | "active" | "finished">("tracking");

  // Untrack Modal State
  const [showUntrackModal, setShowUntrackModal] = useState(false);
  const [participationToUntrack, setParticipationToUntrack] = useState<{ id: string; title: string; teamId: string; hackathonId: string } | null>(null);
  const [isUntracking, setIsUntracking] = useState(false);

  // Status Change State
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Load all tracking data from all teams in parallel
  const loadTrackerData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const userTeams = await teamApi.getUserTeams();

      const allParts: (TeamHackathon & { teamInfo: Team })[] = [];
      await Promise.all(
        userTeams.map(async (team) => {
          try {
            const ths = await teamApi.getTeamHackathons(team._id);
            ths.forEach((th) => {
              allParts.push({
                ...th,
                teamInfo: team,
              });
            });
          } catch (err) {
            console.error(`Failed to load hackathons for team ${team._id}`, err);
          }
        })
      );

      // Sort by creation date descending
      allParts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setParticipations(allParts);
    } catch (error) {
      console.error("Failed to load universal tracker data", error);
      showToast("Failed to load tracker data.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?returnTo=/tracker");
      return;
    }
    loadTrackerData();
  }, [isAuthenticated, navigate, loadTrackerData]);

  // Filtered participations based on active tab
  const filteredParticipations = useMemo(() => {
    if (activeSubTab === "tracking") {
      return participations.filter((p) => p.status === "tracking");
    } else if (activeSubTab === "active") {
      return participations.filter((p) => p.status === "active");
    } else {
      return participations.filter((p) => ["won", "finalist", "eliminated"].includes(p.status));
    }
  }, [participations, activeSubTab]);

  // Header tab buttons
  const pageActions = useMemo(() => {
    const trackingCount = participations.filter((p) => p.status === "tracking").length;
    const activeCount = participations.filter((p) => p.status === "active").length;
    const finishedCount = participations.filter((p) => ["won", "finalist", "eliminated"].includes(p.status)).length;

    return (
      <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
        {[
          { id: "tracking", label: `In Queue (${trackingCount})` },
          { id: "active", label: `Registered (${activeCount})` },
          { id: "finished", label: `Finished (${finishedCount})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }, [participations, activeSubTab]);

  useEffect(() => {
    setPageActions(pageActions);
    return () => setPageActions(null);
  }, [pageActions, setPageActions]);

  // Update Status
  const handleUpdateStatus = async (participationId: string, teamId: string, nextStatus: string) => {
    setUpdatingStatusId(participationId);
    try {
      await teamApi.updateStatus(teamId, participationId, nextStatus as any);
      showToast(`Status updated to "${nextStatus}" successfully!`, "success");
      await loadTrackerData(true);
    } catch (error: any) {
      console.error("Failed to update status", error);
      showToast(error.response?.data?.message || "Failed to update status", "error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Untrack Confirmation
  const handleInitiateUntrack = (participationId: string, teamId: string, hackathonId: string, title: string) => {
    setParticipationToUntrack({ id: participationId, teamId, hackathonId, title });
    setShowUntrackModal(true);
  };

  const handleConfirmUntrack = async () => {
    if (!participationToUntrack) return;
    setIsUntracking(true);
    try {
      await teamApi.unlinkHackathon(participationToUntrack.teamId, participationToUntrack.hackathonId);
      showToast(`Successfully stopped tracking "${participationToUntrack.title}"`, "success");
      setShowUntrackModal(false);
      setParticipationToUntrack(null);
      await loadTrackerData(true);
    } catch (error: any) {
      console.error("Failed to untrack", error);
      showToast(error.response?.data?.message || "Failed to untrack", "error");
    } finally {
      setIsUntracking(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-6 md:px-6 relative">
      {loading && (
        <div className="absolute inset-0 z-20 flex justify-center items-center bg-zinc-950/5 dark:bg-black/10 backdrop-blur-[2.5px] p-4 rounded-3xl min-h-[400px]">
          <div className="w-full max-w-sm shrink-0">
            <LoadingProgress simulate={true} label="Loading Trackers" description="Loading your universal trackers across all active workspaces..." />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6 opacity-40 select-none pointer-events-none">
          {/* Header Info Skeleton */}
          <div className="border-b border-zinc-150 dark:border-zinc-800 pb-5">
            <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-zinc-150 dark:bg-zinc-850 rounded-lg animate-pulse mt-2" />
          </div>
          {/* Filters Skeleton */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          </div>
          {/* Timeline List Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="h-full w-full rounded-xl bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Hackathon Tracker
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
            Universal timeline tracker across all your developer workspaces
          </p>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-6">
        {filteredParticipations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 p-16 text-center dark:border-zinc-800 dark:bg-zinc-950/20 max-w-2xl mx-auto mt-6">
            <Flag className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">No tracked hackathons found</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
              Tracked hackathons in the {activeSubTab === "tracking" ? "Tracking Queue" : activeSubTab === "active" ? "Registered Workspace" : "Finished"} category will appear here.
            </p>
            <Link
              to="/hackathons"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-500 hover:-translate-y-0.5 cursor-pointer"
            >
              Browse Hackathons to Track
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredParticipations.map((part) => {
              const competitiveStages = part.stages.filter((s) => !isRegistrationStage(s.name));
              const failedStageIdx = competitiveStages.findIndex((s) => s.result === "rejected");
              const isTracking = part.status === "tracking";

              return (
                <div
                  key={part._id}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-all duration-300 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 flex flex-col lg:flex-row gap-6 relative"
                >
                  {/* Floating Team Badge */}
                  <div className="absolute top-4 right-4 z-20">
                    <Link
                      to={`/teams?teamId=${part.teamInfo._id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 px-2.5 py-1 shadow-xs border border-zinc-200/50 dark:border-zinc-700/50 transition-colors"
                    >
                      👥 {part.teamInfo.name}
                    </Link>
                  </div>

                  {/* Left Column: Cover & Identity */}
                  <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      {/* Cover Image */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                        <img
                          src={part.hackathon.coverImage || "/BrandImages/HackDekh.png"}
                          alt={part.hackathon.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/BrandImages/HackDekh.png";
                          }}
                        />
                      </div>
                      
                      <div className="min-w-0 flex-1 space-y-1 text-left pr-20">
                        <Link
                          to={`/hackathons/${part.hackathon._id}`}
                          className="block text-sm font-bold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                        >
                          {part.hackathon.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            part.status === "won" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15" :
                            part.status === "eliminated" ? "text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/15" :
                            "text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/15"
                          }`}>
                            {part.status}
                          </span>
                          <span className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />
                          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                            {formatDateTag(part.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isTracking ? (
                        <button
                          onClick={() => handleUpdateStatus(part._id, part.teamInfo._id, "active")}
                          disabled={updatingStatusId === part._id}
                          className="inline-flex items-center justify-center gap-1 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[10px] font-bold transition duration-150 cursor-pointer shadow-xs active:scale-95 leading-none shrink-0"
                        >
                          {updatingStatusId === part._id ? "..." : "Register"}
                        </button>
                      ) : (
                        <Link
                          to={`/teams?teamId=${part.teamInfo._id}&tab=Stages&participationId=${part._id}`}
                          className="inline-flex items-center gap-1 h-8 px-3.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold leading-none shrink-0"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Manage Workspace
                        </Link>
                      )}

                      <button
                        onClick={() => handleInitiateUntrack(part._id, part.teamInfo._id, part.hackathon._id, part.hackathon.title)}
                        className="inline-flex items-center justify-center gap-1 h-8 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-500/5 dark:hover:bg-rose-500/5 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] font-bold transition duration-150 cursor-pointer leading-none active:scale-95 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Untrack
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Timeline & Prerequisite Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-visible w-full justify-center">
                    {/* Registration Tracker Block */}
                    {isTracking && (
                      <div className="w-full rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs backdrop-blur-sm transition-all duration-350 border-amber-500/15 bg-amber-500/5 dark:bg-amber-500/3 text-amber-800 dark:text-amber-300 shadow-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs bg-gradient-to-tr from-amber-500 to-orange-500 text-white">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="font-extrabold uppercase tracking-wide text-[10px]">
                              Prerequisite: Register for Hackathon
                            </p>
                            <p className="mt-0.5 text-zinc-600 dark:text-zinc-400 font-semibold truncate text-[11px]">
                              {part.hackathon.deadline ? (
                                <span>
                                  Deadline: {new Date(part.hackathon.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                  {(() => {
                                    const days = Math.ceil((new Date(part.hackathon.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    if (days > 0) return ` (Ends in ${days} days)`;
                                    if (days === 0) return ` (Ends today!)`;
                                    return ` (Closed)`;
                                  })()}
                                </span>
                              ) : (
                                "No official deadline specified. Register soon!"
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {part.hackathon.applyLink && (
                            <a
                              href={part.hackathon.applyLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 h-7.5 px-3.5 rounded-lg border border-amber-500/20 hover:border-amber-500/35 bg-white dark:bg-zinc-950 text-amber-700 dark:text-amber-400 font-bold transition-all duration-200 hover:bg-amber-500/5 text-[10.5px] cursor-pointer"
                            >
                              Register Site <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(part._id, part.teamInfo._id, "active")}
                            disabled={updatingStatusId === part._id}
                            className="inline-flex items-center justify-center gap-1.5 h-7.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition duration-150 text-[10.5px] shadow-xs active:scale-95 cursor-pointer leading-none"
                          >
                            Mark Registered
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Stages Timeline */}
                    <div className={`pt-1 pb-4 overflow-visible transition-all duration-300 ${isTracking ? "opacity-40 select-none" : ""}`}>
                      {competitiveStages.length === 0 ? (
                        <div className="flex items-start gap-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/40 dark:bg-zinc-900/5 px-4 py-3 text-zinc-500 dark:text-zinc-400 text-xs text-left max-w-md shadow-xs">
                          <Info className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            No competitive stages defined yet. Go to the{" "}
                            <Link
                              to={`/teams?teamId=${part.teamInfo._id}&tab=Stages&participationId=${part._id}`}
                              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Workspace
                            </Link>{" "}
                            to add custom milestones.
                          </p>
                        </div>
                      ) : (
                        <div
                          className="flex items-start gap-0 relative overflow-visible w-full pt-1"
                          style={{ maxWidth: competitiveStages.length > 0 ? `${competitiveStages.length * 130}px` : "100%" }}
                        >
                          {competitiveStages.map((stage, sIdx) => {
                            const hasPrev = sIdx > 0;
                            const isFailedStage = sIdx === failedStageIdx;
                            const isPostDisqualification = failedStageIdx !== -1 && sIdx > failedStageIdx;

                            let lineBg = "bg-zinc-200 dark:bg-zinc-800";
                            if (hasPrev) {
                              const prevStageIdx = sIdx - 1;
                              if (failedStageIdx !== -1 && prevStageIdx >= failedStageIdx) {
                                lineBg = "bg-rose-500/30 dark:bg-rose-500/20";
                              } else {
                                const prevStageObj = competitiveStages[prevStageIdx];
                                if (prevStageObj.result === "qualified") {
                                  lineBg = "bg-emerald-500 dark:bg-emerald-400";
                                } else if (prevStageObj.result === "rejected") {
                                  lineBg = "bg-rose-500 dark:bg-rose-400";
                                }
                              }
                            }

                            let ringClass = "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
                            const isFirstPending = failedStageIdx === -1 && competitiveStages.findIndex((st) => st.result === "pending") === sIdx;

                            if (isPostDisqualification) {
                              ringClass = "border-rose-500/25 bg-white dark:border-rose-500/20 dark:bg-zinc-900 text-rose-500/30 dark:text-rose-400/30";
                            } else if (isFailedStage) {
                              ringClass = "border-rose-500/50 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950 text-rose-600 dark:text-rose-400";
                            } else if (stage.result === "qualified") {
                              ringClass = "border-emerald-500/50 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400";
                            } else if (isFirstPending) {
                              ringClass = "border-blue-500/50 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950 ring-4 ring-blue-500/5 text-blue-600 dark:text-blue-400";
                            } else {
                              ringClass = "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500";
                            }

                            return (
                              <Link
                                key={stage._id}
                                to={`/teams?teamId=${part.teamInfo._id}&tab=Stages&participationId=${part._id}&stageId=${stage._id}`}
                                className="relative flex flex-col items-center group overflow-visible cursor-pointer flex-1 min-w-0 hover:z-50 pt-3"
                              >
                                {hasPrev && (
                                  <div className="absolute right-[50%] w-full h-[2px] bg-zinc-200 dark:bg-zinc-800 top-[21px] z-0 origin-right">
                                    <div className={`absolute inset-0 origin-left ${lineBg}`} />
                                  </div>
                                )}

                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-300 z-10 cursor-pointer ${ringClass}`}>
                                  {isFailedStage ? (
                                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                                      <path d="M2.5 2.5L9.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                      <path d="M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                                    </svg>
                                  ) : stage.result === "qualified" ? (
                                    <Check className="h-3 w-3" strokeWidth={3.5} />
                                  ) : (
                                    <div className={`h-1.5 w-1.5 rounded-full ${isFirstPending ? "bg-blue-600 dark:bg-blue-400" : "bg-zinc-350 dark:bg-zinc-600"}`} />
                                  )}
                                </div>

                                <div className="absolute top-9 flex flex-col items-center w-32 shrink-0 pointer-events-none">
                                  <span className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 truncate max-w-[115px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {stage.name}
                                  </span>
                                  {stage.deadline && (
                                    <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-semibold mt-0.5">
                                      {new Date(stage.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Untrack Confirmation Modal */}
      <AnimatePresence>
        {showUntrackModal && participationToUntrack && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-[4px] px-4 py-8">
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
                Are you sure you want to stop tracking <span className="font-bold text-zinc-800 dark:text-zinc-200">"{participationToUntrack.title}"</span>?
              </p>
              <p className="mt-2 text-[11px] text-zinc-450 dark:text-zinc-500 leading-normal">
                This will permanently delete all timeline stages, logs, and reflections associated with this participation.
              </p>

              <div className="flex gap-2.5 pt-4">
                <button
                  onClick={() => {
                    setShowUntrackModal(false);
                    setParticipationToUntrack(null);
                  }}
                  className="btn btn-secondary flex-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUntrack}
                  disabled={isUntracking}
                  className="btn btn-danger flex-1 cursor-pointer"
                >
                  {isUntracking ? "Untracking..." : "Untrack"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
