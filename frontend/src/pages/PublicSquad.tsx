import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Copy, ExternalLink, MapPin, Trophy, Users, ArrowRight } from "lucide-react";
import { teamApi } from "../services";
import { useAuth, useToast } from "../context";
import type { HackathonLite } from "../types";
import { useSeo } from "../utils/useSeo";

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
  const [loadError, setLoadError] = useState(false);

  useSeo({
    title: data ? `${data.team.name} — Team Schedule | HackDekh` : "Team Schedule | HackDekh",
    description: data
      ? `${data.team.name} (${data.team.memberCount} members) is tracking ${data.hackathons.length} hackathon(s) on HackDekh.`
      : "View a shared team hackathon schedule and upcoming deadlines on HackDekh.",
    path: code ? `/squad/${encodeURIComponent(code)}` : "/teams",
  });

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
      setLoadError(false);
      try {
        const res = await teamApi.getPublicSquad(code);
        if (active) setData(res);
      } catch (err: any) {
        if (active) {
          if (err?.response?.status === 404) {
            setNotFound(true);
          } else {
            setLoadError(true);
          }
        }
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
      showToast("Team link copied. Share it on WhatsApp or Discord.", "success");
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

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-lg py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Users className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Could not load team</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The server is temporarily unreachable. Please try again in a moment.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary inline-flex items-center gap-2 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto w-full max-w-lg py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <Users className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Team not found</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This team link may have expired or the join code was regenerated.
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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                Team Schedule
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 cursor-pointer"
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
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <Trophy className="mx-auto h-8 w-8 text-zinc-400" />
          <h2 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">No hackathons tracked yet</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Hackathons tracked by this team will appear here automatically.
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

            const orderedStages = [...stages]
              .filter(
                (s) =>
                  !/^hackathon\s*(start|starts|end|ends)(\s*\/\s*submission|\s*\(finale\))?$/i.test(
                    (s.name || "").trim()
                  )
              )
              .sort((a, b) => {
                const ta = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                const tb = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                return ta - tb;
              });

            return (
              <div
                key={_id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
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

                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {hackathon.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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

                {/* Clean 3-column Key Info Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-950/40 min-w-0">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="text-zinc-500 dark:text-zinc-400 shrink-0">Deadline:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 truncate">{formatDate(hackathon.deadline)}</strong>
                    {daysInfo && (
                      <span className={`ml-auto text-[11px] font-semibold shrink-0 ${daysInfo.urgent ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {daysInfo.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-950/40 min-w-0">
                    <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-zinc-500 dark:text-zinc-400 shrink-0">Prize:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                      {hackathon.prize || "TBD"}
                    </span>
                  </div>

                  <div
                    title={hackathon.location || "Online / TBA"}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800/80 dark:bg-zinc-950/40 min-w-0"
                  >
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-300 truncate">
                      {hackathon.location || (/online/i.test(hackathon.mode || "") ? "Online" : "TBA")}
                    </span>
                  </div>
                </div>

                {/* Structured Rounds & Milestones */}
                {orderedStages.length > 0 && (
                  <div className="border-t border-zinc-200/80 pt-3.5 dark:border-zinc-800/80 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Rounds &amp; Milestones
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {orderedStages.map((stage, idx) => {
                        const badgeCls =
                          stage.result === "qualified"
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : stage.result === "rejected"
                            ? "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                            : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

                        return (
                          <div
                            key={stage._id}
                            title={stage.name}
                            className="flex items-center justify-between gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/60 min-w-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${badgeCls}`}>
                                {idx + 1}
                              </span>
                              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {stage.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-400 shrink-0">
                              {formatDate(stage.deadline)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
