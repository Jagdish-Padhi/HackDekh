import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, CalendarPlus, Copy, ExternalLink, MapPin, Trophy, Users, ArrowRight } from "lucide-react";
import { teamApi } from "../services";
import { useAuth, useToast } from "../context";
import { downloadDeadlineICS } from "../utils/calendar";
import type { HackathonLite } from "../types";

type PublicSquadData = {
  team: {
    name: string;
    code: string;
    memberCount: number;
    members: Array<{ username?: string; fullName?: string }>;
  };
  hackathons: Array<{
    _id: string;
    status: string;
    hackathon: HackathonLite;
    stages: Array<{ _id: string; name: string; deadline?: string | null; result: string }>;
  }>;
};

const formatDate = (value?: string | null) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getDaysLeftLabel = (deadline?: string | null) => {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const days = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Closed", urgent: false, closed: true };
  if (days === 0) return { text: "Due today", urgent: true, closed: false };
  if (days === 1) return { text: "1 day left", urgent: true, closed: false };
  return { text: `${days} days left`, urgent: days <= 5, closed: false };
};

export default function PublicSquadPage() {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<PublicSquadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!code) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      try {
        const res = await teamApi.getPublicSquad(code);
        if (active) setData(res);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [code]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Squad link copied. Share it on WhatsApp or Discord.", "success");
    } catch {
      showToast("Could not copy link.", "error");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl py-10 space-y-4 animate-pulse">
        <div className="h-24 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60" />
        <div className="h-44 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60" />
        <div className="h-44 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto w-full max-w-lg py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Users className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Squad not found</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This squad link may have expired or the join code was regenerated.
        </p>
        <div className="pt-2">
          <Link to="/hackathons" className="btn btn-primary inline-flex items-center gap-2">
            Browse Hackathons
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const { team, hackathons } = data;

  return (
    <div className="mx-auto w-full max-w-4xl py-6 space-y-6">
      {/* Squad Header */}
      <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                Squad Schedule
              </span>
              <span className="text-xs font-mono font-semibold text-zinc-400 dark:text-zinc-500">
                #{team.code}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {team.name}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {team.memberCount} {team.memberCount === 1 ? "member" : "members"} • {hackathons.length} tracked {hackathons.length === 1 ? "hackathon" : "hackathons"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </button>
            {!isAuthenticated && (
              <Link
                to="/signup?returnTo=/teams"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
              >
                Join on HackDekh
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tracked Hackathons */}
      {hackathons.length === 0 ? (
        <div className="rounded-xl border border-zinc-200/90 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <Trophy className="mx-auto h-8 w-8 text-zinc-400" />
          <h2 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">No hackathons tracked yet</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Hackathons tracked by this squad will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {hackathons.map(({ _id, status, hackathon, stages }) => {
            const daysInfo = getDaysLeftLabel(hackathon.deadline);
            const statusLabel =
              status === "tracking"
                ? "In Queue"
                : status === "active"
                ? "Registered"
                : status.charAt(0).toUpperCase() + status.slice(1);

            const pendingStages = stages.filter((s) => s.result === "pending" && s.deadline);

            return (
              <div
                key={_id}
                className="rounded-xl border border-zinc-200/90 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-zinc-800">
                        {hackathon.platform}
                      </span>
                      {hackathon.mode && (
                        <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {hackathon.mode}
                        </span>
                      )}
                      <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                        {statusLabel}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {hackathon.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        Deadline: <strong className="text-zinc-800 dark:text-zinc-200">{formatDate(hackathon.deadline)}</strong>
                        {daysInfo && (
                          <span className={`ml-1 font-semibold ${daysInfo.urgent ? "text-rose-600 dark:text-rose-400" : ""}`}>
                            ({daysInfo.text})
                          </span>
                        )}
                      </span>
                      {hackathon.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                          {hackathon.location}
                        </span>
                      )}
                      {hackathon.prize && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <Trophy className="h-3.5 w-3.5" />
                          {hackathon.prize}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hackathon.deadline && (
                      <button
                        type="button"
                        onClick={() => {
                          const ok = downloadDeadlineICS({
                            title: hackathon.title,
                            deadline: hackathon.deadline,
                            platform: hackathon.platform,
                            location: hackathon.location,
                            applyLink: hackathon.applyLink,
                          });
                          if (ok) showToast("Calendar event downloaded.", "success");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 cursor-pointer"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Add to Calendar
                      </button>
                    )}
                    {hackathon.applyLink && (
                      <a
                        href={hackathon.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500"
                      >
                        Official Site
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {pendingStages.length > 0 && (
                  <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/80 flex flex-wrap gap-2">
                    {pendingStages.map((stage) => (
                      <span
                        key={stage._id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                      >
                        {stage.name} • {formatDate(stage.deadline)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
