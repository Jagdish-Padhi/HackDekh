import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth, useCache, useToast } from "../context";
import type { UserPreferences } from "../context/AuthContext";
import { teamApi, userApi } from "../services";
import FitCheckModal from "../components/FitCheckModal";
import {
  evaluateHackathonFit,
  hasConfiguredPreferences,
  loadLocalPreferences,
  saveLocalPreferences,
} from "../utils/fitEngine";

type HackathonDetailData = {
  _id: string;
  title: string;
  slug: string;
  platform: string;
  coverImage?: string;
  startDate?: string;
  deadline?: string;
  mode?: string;
  prize?: string;
  location?: string;
  teamSize?: string;
  applyLink?: string;
  description?: string;
  organization?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function HackathonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { invalidateUserCaches } = useCache();

  const [hackathon, setHackathon] = useState<HackathonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [isTracked, setIsTracked] = useState(false);
  const [showFitModal, setShowFitModal] = useState(false);
  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(() => loadLocalPreferences());

  const activePreferences = useMemo(() => {
    if (user?.preferences && hasConfiguredPreferences(user.preferences)) {
      return user.preferences;
    }
    return localPreferences;
  }, [user?.preferences, localPreferences]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      try {
        const res = await axiosInstance.get(`/hackathons/${encodeURIComponent(slug)}`);
        const item = res.data?.data;
        if (active && item) {
          setHackathon(item);
        } else if (active) {
          setNotFound(true);
        }
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
  }, [slug]);

  const handleSavePreferences = useCallback(
    async (prefs: UserPreferences) => {
      setLocalPreferences(prefs);
      saveLocalPreferences(prefs);
      if (isAuthenticated && user) {
        try {
          const updatedUser = await userApi.updatePreferences(prefs);
          updateUser({ ...user, ...updatedUser, preferences: updatedUser?.preferences || prefs });
          showToast("Participation preferences saved.", "success");
        } catch {
          showToast("Saved locally. Could not sync to profile.", "error");
        }
      } else {
        showToast("Preferences saved for this browser.", "success");
      }
    },
    [isAuthenticated, user, updateUser, showToast]
  );

  const handleTrack = async () => {
    if (!hackathon) return;
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setTracking(true);
    try {
      let teams = await teamApi.getUserTeams();
      let targetTeamId = teams[0]?._id;
      if (!targetTeamId) {
        const created = await teamApi.createTeam({ name: "Personal" });
        targetTeamId = created._id;
      }
      await teamApi.linkHackathon(targetTeamId, hackathon._id);
      setIsTracked(true);
      invalidateUserCaches();
      showToast("Hackathon tracked.", "success");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "";
      if (/already/i.test(msg)) {
        setIsTracked(true);
        showToast("Already in your tracker.", "success");
      } else {
        showToast(msg || "Could not track hackathon.", "error");
      }
    } finally {
      setTracking(false);
    }
  };

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Hackathon link copied. Share it on WhatsApp or Discord.", "success");
    } catch {
      showToast("Could not copy link.", "error");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl py-8 space-y-4 animate-pulse">
        <div className="h-8 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60" />
      </div>
    );
  }

  if (notFound || !hackathon) {
    return (
      <div className="mx-auto w-full max-w-lg py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Hackathon not found</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This listing may have expired or been removed.
        </p>
        <Link to="/hackathons" className="btn btn-primary inline-flex items-center gap-2">
          Browse Open Hackathons
        </Link>
      </div>
    );
  }

  const fitResult = hasConfiguredPreferences(activePreferences)
    ? evaluateHackathonFit(hackathon, activePreferences)
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl py-6 space-y-6">
      <Link
        to="/hackathons"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Hackathons
      </Link>

      <div className="rounded-xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-zinc-800">
                {hackathon.platform}
              </span>
              {hackathon.mode && (
                <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {hackathon.mode}
                </span>
              )}
              {fitResult && (
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    fitResult.verdict === "strong"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : fitResult.verdict === "consider"
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
                  }`}
                >
                  {fitResult.label} ({fitResult.score}/100)
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {hackathon.title}
            </h1>
            {hackathon.organization && (
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Hosted by {hackathon.organization}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setShowFitModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {fitResult ? "Fit Breakdown" : "Worth It?"}
            </button>
          </div>
        </div>

        {/* Key Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Prize Pool</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{hackathon.prize || "TBD"}</span>
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Deadline</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span>{formatDate(hackathon.deadline)}</span>
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Location</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{hackathon.location || "TBD"}</span>
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Team Size</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <Users className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{hackathon.teamSize || "Flexible"}</span>
            </p>
          </div>
        </div>

        {hackathon.description && (
          <div className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Overview</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {hackathon.description}
            </p>
          </div>
        )}

        {/* Primary CTA Row */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {hackathon.applyLink && (
            <a
              href={hackathon.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Official Site
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={handleTrack}
            disabled={tracking || isTracked}
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60 cursor-pointer"
          >
            {isTracked ? "Tracked ✓" : tracking ? "Tracking..." : "Track Hackathon"}
          </button>
        </div>
      </div>

      <FitCheckModal
        isOpen={showFitModal}
        hackathon={hackathon}
        preferences={activePreferences}
        isAuthenticated={isAuthenticated}
        onClose={() => setShowFitModal(false)}
        onSavePreferences={handleSavePreferences}
        onTrack={() => handleTrack()}
        isTracked={isTracked}
      />
    </div>
  );
}
