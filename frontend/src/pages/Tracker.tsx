import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  AlertTriangle,
  Users,
  Trash2,
  ExternalLink,
  Check,
  Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useToast, useCache } from "../context";
import { USER_CACHE_TTL_MS } from "../context/CacheContext";
import { usePageChrome } from "../context/pageChrome";
import { teamApi } from "../services";
import AppDropdown from "../components/AppDropdown";
import type { Team, TeamHackathon } from "../types";
import posthog, { isPostHogEnabled } from "../posthog";
import { useSeo } from "../utils/useSeo";

export const isRegistrationStage = (name: string): boolean => {
  return (
    /register|registration|apply|application|prep|regn/i.test(name) ||
    /^hackathon\s*(start|starts|end|ends)(\s*\/\s*submission|\s*\(finale\))?$/i.test(name.trim())
  );
};

export default function TrackerPage() {
  useSeo({
    title: "Tracker | HackDekh",
    description: "Manage your tracked and registered hackathons, stages, and 24h deadline alerts.",
    path: "/tracker",
    noIndex: true,
  });
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { setPageActions } = usePageChrome();

  const { trackerData, trackerFetchedAt, setTrackerData, invalidateUserCaches } = useCache();
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("all");
  const [userTeamsList, setUserTeamsList] = useState<Team[]>([]);
  const [participations, setParticipations] = useState<(TeamHackathon & { teamInfo: Team })[]>(trackerData || []);
  const [loading, setLoading] = useState(!trackerData);
  const [activeSubTab, setActiveSubTab] = useState<"tracking" | "active" | "finished">("tracking");

  // Untrack Modal State
  const [showUntrackModal, setShowUntrackModal] = useState(false);
  const [participationToUntrack, setParticipationToUntrack] = useState<{ id: string; title: string; teamId: string; hackathonId: string } | null>(null);
  const [isUntracking, setIsUntracking] = useState(false);

  // Status Change State
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load all tracking data from all teams in parallel
  const loadTrackerData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const userTeams = await teamApi.getUserTeams();
      const teams = Array.isArray(userTeams) ? userTeams : [];
      if (isMountedRef.current) {
        setUserTeamsList(teams);
      }

      const allParts: (TeamHackathon & { teamInfo: Team })[] = [];
      await Promise.all(
        teams.map(async (team) => {
          try {
            const ths = await teamApi.getTeamHackathons(team._id);
            if (Array.isArray(ths)) {
              ths.forEach((th) => {
                allParts.push({
                  ...th,
                  teamInfo: team,
                });
              });
            }
          } catch (err) {
            console.error(`Failed to load hackathons for team ${team._id}`, err);
          }
        })
      );

      // Sort by creation date descending
      allParts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (!isMountedRef.current) return;
      setParticipations(allParts);
      setTrackerData(allParts);
    } catch (error) {
      console.error("Failed to load universal tracker data", error);
      // Enterprise pattern: silent background resilience without abrupt error toasts
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [setTrackerData]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?returnTo=/tracker");
      return;
    }
    const isFresh = !!trackerData && Date.now() - trackerFetchedAt < USER_CACHE_TTL_MS;
    if (isFresh) {
      setLoading(false);
      return;
    }
    loadTrackerData(!!trackerData);
  }, [isAuthenticated, navigate, loadTrackerData, trackerData, trackerFetchedAt]);

  const uniqueTeams = useMemo(() => {
    const map = new Map<string, Team>();
    userTeamsList.forEach((t) => {
      if (t?._id) map.set(t._id, t);
    });
    participations.forEach((p) => {
      if (p.teamInfo?._id) map.set(p.teamInfo._id, p.teamInfo);
    });
    return Array.from(map.values());
  }, [userTeamsList, participations]);

  // Filtered participations based on active tab & team filter
  const filteredParticipations = useMemo(() => {
    const byTeam =
      selectedTeamFilter === "all"
        ? participations
        : participations.filter((p) => p.teamInfo?._id === selectedTeamFilter);

    if (activeSubTab === "tracking") {
      return byTeam.filter((p) => p.status === "tracking");
    } else if (activeSubTab === "active") {
      return byTeam.filter((p) => p.status === "active");
    } else {
      return byTeam.filter((p) => ["won", "finalist", "eliminated"].includes(p.status));
    }
  }, [participations, activeSubTab, selectedTeamFilter]);

  const tabCounts = useMemo(() => {
    const teamScoped =
      selectedTeamFilter === "all"
        ? participations
        : participations.filter((p) => p.teamInfo?._id === selectedTeamFilter);

    return {
      tracking: teamScoped.filter((p) => p.status === "tracking").length,
      active: teamScoped.filter((p) => p.status === "active").length,
      finished: teamScoped.filter((p) => ["won", "finalist", "eliminated"].includes(p.status)).length,
    };
  }, [participations, selectedTeamFilter]);

  const teamOptions = useMemo(
    () => [
      { label: "All Teams", value: "all" },
      ...uniqueTeams.map((t) => ({ label: t.name, value: t._id })),
    ],
    [uniqueTeams]
  );

  // Header tab buttons + Team filter (desktop)
  const pageActions = useMemo(() => {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        {uniqueTeams.length > 1 && (
          <AppDropdown
            value={selectedTeamFilter}
            onChange={(val) => setSelectedTeamFilter(val || "all")}
            options={teamOptions}
            placeholder="All Teams"
            className="w-36"
          />
        )}

        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
          {[
            { id: "tracking", label: `In Queue (${tabCounts.tracking})` },
            { id: "active", label: `Registered (${tabCounts.active})` },
            { id: "finished", label: `Finished (${tabCounts.finished})` }
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
      </div>
    );
  }, [tabCounts, activeSubTab, uniqueTeams.length, teamOptions, selectedTeamFilter]);

  useEffect(() => {
    setPageActions(pageActions);
    return () => setPageActions(null);
  }, [pageActions, setPageActions]);

  // Update Status
  const handleUpdateStatus = async (participationId: string, teamId: string, nextStatus: string) => {
    setUpdatingStatusId(participationId);
    try {
      await teamApi.updateStatus(teamId, participationId, nextStatus as any);
      invalidateUserCaches();
      if (nextStatus === 'active' && isPostHogEnabled) {
        posthog.capture('hackathon_registration_confirmed');
      }
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
      invalidateUserCaches();
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
    <div className="w-full max-w-7xl mx-auto space-y-3.5 sm:space-y-4 px-0 sm:px-2 lg:px-6 py-1 sm:py-3 relative">
      {loading ? (
        <div className="space-y-4 select-none pointer-events-none animate-pulse">

          {/* Filters Skeleton */}
          <div className="flex flex-wrap items-center gap-3 lg:hidden">
            <div className="h-9 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
          {/* Timeline List Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="h-full w-full rounded-lg bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Sticky Tab & Team Filter Bar */}
          <div className="sticky top-14 z-40 -mx-3 px-3 py-2.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200/70 dark:border-zinc-800/70 lg:hidden space-y-2">
            {uniqueTeams.length > 1 && (
              <AppDropdown
                value={selectedTeamFilter}
                onChange={(val) => setSelectedTeamFilter(val || "all")}
                options={teamOptions}
                placeholder="All Teams"
                className="w-full"
              />
            )}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {[
                { id: "tracking", label: `Queue (${tabCounts.tracking})` },
                { id: "active", label: `Registered (${tabCounts.active})` },
                { id: "finished", label: `Finished (${tabCounts.finished})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`rounded-lg px-2 py-2 text-[11px] font-bold transition-all cursor-pointer truncate ${
                    activeSubTab === tab.id
                      ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

      {/* Main List */}
      <div className="space-y-3">
        {filteredParticipations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 sm:p-14 text-center dark:border-zinc-700 dark:bg-zinc-950/20 max-w-2xl mx-auto mt-4">
            <Flag className="mx-auto h-10 w-10 text-zinc-400" />
            <h3 className="mt-3 text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">No tracked hackathons found</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
              Tracked hackathons in the {activeSubTab === "tracking" ? "Tracking Queue" : activeSubTab === "active" ? "Registered Workspace" : "Finished"} category will appear here.
            </p>
            <Link
              to="/hackathons"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-500 hover:-translate-y-0.5 cursor-pointer"
            >
              Browse Hackathons to Track
            </Link>
          </div>
        ) : (
          <div className="space-y-3">

            {filteredParticipations.map((part) => {
              const competitiveStages = part.stages.filter((s) => !isRegistrationStage(s.name));
              const failedStageIdx = competitiveStages.findIndex((s) => s.result === "rejected");
              const isTracking = part.status === "tracking";

              const isFinished = ["won", "finalist", "eliminated"].includes(part.status);
              const deadlineDays = part.hackathon.deadline
                ? Math.ceil((new Date(part.hackathon.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const deadlineText = part.hackathon.deadline
                ? new Date(part.hackathon.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                : "TBD";

              return (
                <div
                  key={part._id}
                  className="group rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-4 text-left transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700 flex flex-col lg:flex-row lg:items-center gap-3.5 sm:gap-4 overflow-visible"
                >
                  {/* Left Column: Cover, Identity & Actions */}
                  <div className="w-full lg:w-[20rem] shrink-0 flex flex-col gap-2.5 min-w-0">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      {/* Cover Image */}
                      <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
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

                      <div className="min-w-0 flex-1 space-y-0.5 text-left">
                        {part.hackathon.slug ? (
                          <Link
                            to={`/hackathons/${encodeURIComponent(part.hackathon.slug)}`}
                            className="block text-sm font-bold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                            title={part.hackathon.title}
                          >
                            {part.hackathon.title}
                          </Link>
                        ) : part.hackathon.applyLink ? (
                          <a
                            href={part.hackathon.applyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full min-w-0 items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title={part.hackathon.title}
                          >
                            <span className="truncate">{part.hackathon.title}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          <span className="block text-sm font-bold text-zinc-900 dark:text-white truncate" title={part.hackathon.title}>
                            {part.hackathon.title}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {part.hackathon.platform}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-zinc-400" />
                            {deadlineText}
                          </span>
                          {deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 3 && !isFinished && (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {deadlineDays === 0 ? "Ends today" : deadlineDays === 1 ? "1d left" : `${deadlineDays}d left`}
                            </span>
                          )}
                          {isFinished && (
                            <span className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              part.status === "won"
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : part.status === "eliminated"
                                ? "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"
                                : "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
                            }`}>
                              {part.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {part.hackathon.applyLink && (
                        <a
                          href={part.hackathon.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-[11px] font-semibold transition duration-150 leading-none shrink-0 whitespace-nowrap"
                        >
                          Site <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <Link
                        to={`/teams?teamId=${part.teamInfo._id}`}
                        title={part.teamInfo.name}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold leading-none min-w-0 max-w-[130px]"
                      >
                        <Users className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{part.teamInfo.name}</span>
                      </Link>
                      <button
                        onClick={() => handleInitiateUntrack(part._id, part.teamInfo._id, part.hackathon._id, part.hackathon.title)}
                        className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-500/5 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-semibold transition duration-150 cursor-pointer leading-none shrink-0 whitespace-nowrap ml-auto sm:ml-0"
                      >
                        <Trash2 className="h-3 w-3" /> Untrack
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Registration Bar & Timeline */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2.5 overflow-visible w-full justify-center">
                    {isTracking && (
                      <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            Registration Pending
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {part.hackathon.deadline
                              ? `Apply on ${part.hackathon.platform} before ${deadlineText}${
                                  deadlineDays !== null && deadlineDays >= 0
                                    ? deadlineDays === 0
                                      ? " (Ends today)"
                                      : deadlineDays === 1
                                      ? " (Ends in 1 day)"
                                      : ` (${deadlineDays} days left)`
                                    : " (Closed)"
                                }`
                              : `Confirm once your team has registered on ${part.hackathon.platform}.`}
                          </p>
                        </div>

                        <button
                          onClick={() => handleUpdateStatus(part._id, part.teamInfo._id, "active")}
                          disabled={updatingStatusId === part._id}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition duration-150 text-[11px] shadow-xs cursor-pointer leading-none shrink-0 w-full sm:w-auto"
                        >
                          {updatingStatusId === part._id ? "Updating..." : "Mark Registered"}
                        </button>
                      </div>
                    )}

                    {/* Stages Timeline (only shown when real competitive stages exist) */}
                    {competitiveStages.length > 0 && (
                      <div className={`space-y-1.5 transition-all duration-200 ${isTracking ? "opacity-80" : ""}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Rounds &amp; Milestones
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {competitiveStages.map((stage, sIdx) => {
                            const isFailedStage = sIdx === failedStageIdx;
                            const isPostDisqualification = failedStageIdx !== -1 && sIdx > failedStageIdx;
                            const isFirstPending = failedStageIdx === -1 && competitiveStages.findIndex((st) => st.result === "pending") === sIdx;

                            const badgeCls = isPostDisqualification
                              ? "border-rose-500/20 bg-white dark:bg-zinc-900 text-rose-500/40"
                              : isFailedStage
                              ? "border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : stage.result === "qualified"
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : isFirstPending
                              ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400";

                            return (
                              <Link
                                key={stage._id}
                                to={`/teams?teamId=${part.teamInfo._id}&tab=Stages&participationId=${part._id}&stageId=${stage._id}`}
                                title={stage.name}
                                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700 transition-colors min-w-0"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${badgeCls}`}>
                                    {isFailedStage ? "✕" : stage.result === "qualified" ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : sIdx + 1}
                                  </span>
                                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                    {stage.name}
                                  </span>
                                </div>
                                {stage.deadline && (
                                  <span className="text-[10.5px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                                    {new Date(stage.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-zinc-950/70 backdrop-blur-[4px] p-0 sm:px-4 sm:py-8">
            <motion.div
              initial={{ y: 24, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-center"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-455 mb-4 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Untrack Hackathon?</h3>
              <p className="mt-2 text-xs text-zinc-550 dark:text-zinc-400 leading-normal">
                Are you sure you want to stop tracking <span className="font-bold text-zinc-800 dark:text-zinc-200">"{participationToUntrack.title}"</span>?
              </p>
              <p className="mt-2 text-[11px] text-zinc-450 dark:text-zinc-500 leading-normal">
                This will permanently delete all timeline stages and logs associated with this participation.
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
