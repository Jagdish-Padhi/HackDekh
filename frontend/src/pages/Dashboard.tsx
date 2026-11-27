import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarClock,
  Bookmark,
  Trophy,
  CheckCircle2,
  Users,
  Check,
} from "lucide-react";
import { useCache, useToast } from "../context";
import { usePageChrome } from "../context/pageChrome";
import { teamApi } from "../services";
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
  const [incomingInvites, setIncomingInvites] = useState<TeamInvitation[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(!dashboardData);

  // Clear pageActions so upper bar stays clean
  useEffect(() => {
    setPageActions(null);
    return () => setPageActions(null);
  }, [setPageActions]);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoadingData(true);
    }
    try {
      const teamsRes = await teamApi.getUserTeams();

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

      setParticipations(fetchedParticipations);

      setDashboardData({
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
  const dueThisWeekCount = upcomingDeadlines.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 7).length;

  const summaryCounters = [
    { label: "Due This Week", value: dueThisWeekCount, icon: CalendarClock },
    { label: "Tracking Queue", value: trackingCount, icon: Bookmark },
    { label: "Registered", value: registeredCount, icon: Trophy },
    { label: "Completed", value: finishedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-2 md:px-6 lg:h-[calc(100vh-5.5rem)] lg:overflow-hidden flex flex-col relative">
      {loadingData ? (
        <div className="flex-1 min-h-0 grid gap-5 grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)] select-none pointer-events-none animate-pulse">
          <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40 h-full min-h-[320px]">
            <div className="h-full w-full rounded-lg bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
          </div>

          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid gap-5 grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]">
          {/* Left Column (75%): Upcoming Stages & Deadlines */}
          <div className="min-h-0 flex flex-col rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Upcoming Stages & Deadlines</h2>
              </div>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {upcomingDeadlines.length} pending
              </span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                <Check className="mx-auto h-10 w-10 text-emerald-500 bg-emerald-500/10 p-2 rounded-full" />
                <h4 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">All caught up!</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">No upcoming deadlines found in your tracker.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-5 ml-2.5 space-y-5 py-1">
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
                        className="relative group block cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 p-2 -m-2 rounded-lg transition-all duration-200"
                      >
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
              </div>
            )}
          </div>

          {/* Right Column (25%): Horizontal Counter Strips & Team Invitations */}
          <div className="min-h-0 flex flex-col gap-4 lg:overflow-y-auto">
            <div className="space-y-2.5">
              {summaryCounters.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <span className="flex items-center gap-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                      {item.label}
                    </span>
                    <span className="text-base font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {incomingInvites.length > 0 && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 dark:bg-blue-500/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Team Invitations</h3>
                  </div>
                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {incomingInvites.length} new
                  </span>
                </div>

                <div className="space-y-2.5">
                  {incomingInvites.map((invite) => (
                    <div
                      key={invite._id}
                      className="bg-white dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3.5 shadow-xs space-y-2.5"
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
                          className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-bold transition hover:bg-blue-500 cursor-pointer"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondInvite(invite._id, 'decline')}
                          className="flex-1 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 px-3 py-1.5 text-xs font-bold transition hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
