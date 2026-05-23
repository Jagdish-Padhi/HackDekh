import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  Bookmark,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Plus,
  Tag,
  X,
} from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import LoadingProgress from "../components/LoadingProgress";
import { useAuth } from "../context/AuthContext";
import { teamApi } from "../services";
import type { HackathonLite, Team, TeamHackathon } from "../types";

type Hackathon = HackathonLite & {
  scrapedFromURL?: string;
  tags?: string[];
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

const getCountdown = (deadline?: string) => {
  if (!deadline) return { label: "TBD", isUrgent: false, daysLeft: -1 };
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return { label: "TBD", isUrgent: false, daysLeft: -1 };

  const ms = parsed.getTime() - Date.now();
  const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { label: "Expired", isUrgent: false, daysLeft };
  }
  if (daysLeft === 0) {
    return { label: "Closes Today", isUrgent: true, daysLeft };
  }
  if (daysLeft === 1) {
    return { label: "1 day left", isUrgent: true, daysLeft };
  }
  if (daysLeft <= 5) {
    return { label: `${daysLeft} days left`, isUrgent: true, daysLeft };
  }
  return { label: `${daysLeft} days left`, isUrgent: false, daysLeft };
};

export default function HackathonDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [savedHackathons, setSavedHackathons] = useState<string[]>(user?.savedHackathons || []);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [participations, setParticipations] = useState<Array<TeamHackathon & { teamInfo: Team }>>([]);
  const [registrationDataLoading, setRegistrationDataLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<1 | 2>(1);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [newTeamName, setNewTeamName] = useState("");
  const [firstStageName, setFirstStageName] = useState("");
  const [firstStageDeadline, setFirstStageDeadline] = useState("");
  const [registrationSaving, setRegistrationSaving] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);

  const isBookmarked = savedHackathons.includes(id || "");
  const currentParticipation = useMemo(
    () => participations.find((participation) => participation.hackathon._id === id),
    [participations, id]
  );
  const isAlreadyParticipating = !!currentParticipation;
  const handleToggleBookmark = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setIsBookmarkLoading(true);
    try {
      const res = await axiosInstance.post(`/users/saved/${id}`);
      if (res.data?.success && res.data?.data) {
        const nextSavedHackathons = res.data.data.savedHackathons || [];
        setSavedHackathons(nextSavedHackathons);
        updateUser({
          ...user!,
          savedHackathons: nextSavedHackathons,
        });
      }
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/hackathons");
  };

  const refreshParticipationState = async () => {
    if (!isAuthenticated) {
      setUserTeams([]);
      setParticipations([]);
      return;
    }

    setRegistrationDataLoading(true);
    try {
      const teams = await teamApi.getUserTeams();
      setUserTeams(teams);

      const teamParticipations = await Promise.all(
        teams.map(async (team) => {
          try {
            const items = await teamApi.getTeamHackathons(team._id);
            return items.map((item) => ({ ...item, teamInfo: team }));
          } catch (teamError) {
            console.error(`Failed to load participations for team ${team._id}`, teamError);
            return [] as Array<TeamHackathon & { teamInfo: Team }>;
          }
        })
      );

      const flattened = teamParticipations.flat();
      setParticipations(flattened);
      setSelectedTeamId((current) => current || teams[0]?._id || "");
    } catch (err) {
      console.error("Failed to load registration state", err);
    } finally {
      setRegistrationDataLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    axiosInstance
      .get(`/hackathons/${id}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && res.data?.data) {
          setHackathon(res.data.data);
        } else if (res.data) {
          setHackathon(res.data);
        } else {
          setError("Failed to parse hackathon details");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(err);
        setError(err.response?.data?.message || "Failed to load hackathon details. Please try again.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    setSavedHackathons(user?.savedHackathons || []);
  }, [user?.savedHackathons]);

  useEffect(() => {
    if (!isAuthenticated) {
      setParticipations([]);
      setUserTeams([]);
      return;
    }

    refreshParticipationState();
  }, [isAuthenticated, id]);

  useEffect(() => {
    if (!registrationModalOpen) {
      setRegistrationStep(1);
      setRegistrationMessage(null);
      setFirstStageName("");
      setFirstStageDeadline("");
    }
  }, [registrationModalOpen]);

  useEffect(() => {
    if (!selectedTeamId && userTeams.length > 0) {
      setSelectedTeamId(userTeams[0]._id);
    }
  }, [selectedTeamId, userTeams]);

  const handleBeginRegistration = () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setRegistrationModalOpen(true);
    setRegistrationStep(1);
    setRegistrationMessage(null);
  };

  const handleRegisterParticipation = async (skipFirstStage = false) => {
    if (!hackathon) return;

    const targetTeamId = selectedTeamId === "create-new" ? "" : selectedTeamId;
    const nextTeamName = newTeamName.trim();

    if (selectedTeamId === "create-new" && !nextTeamName) {
      setRegistrationMessage("Enter a team name before creating a new team.");
      return;
    }

    setRegistrationSaving(true);
    setRegistrationMessage(null);

    try {
      let teamId = targetTeamId;
      let teamRecord: Team | null = null;

      if (selectedTeamId === "create-new") {
        teamRecord = await teamApi.createTeam({ name: nextTeamName });
        teamId = teamRecord._id;
        setUserTeams((current) => [teamRecord!, ...current]);
        setSelectedTeamId(teamRecord._id);
      } else {
        teamRecord = userTeams.find((team) => team._id === teamId) || null;
      }

      if (!teamId) {
        setRegistrationMessage("Choose a team to continue.");
        return;
      }

      const linkedParticipation = await teamApi.linkHackathon(teamId, hackathon._id, skipFirstStage ? undefined : firstStageName.trim() ? {
        name: firstStageName.trim(),
        deadline: firstStageDeadline || undefined,
      } : undefined);

      const nextTeam = teamRecord || userTeams.find((team) => team._id === teamId);
      if (nextTeam) {
        const decoratedParticipation = { ...linkedParticipation, teamInfo: nextTeam };
        setParticipations((current) => [decoratedParticipation, ...current.filter((item) => item._id !== decoratedParticipation._id)]);
      }

      setRegistrationMessage(`✓ Participating with ${nextTeam?.name || "your team"}`);
      setRegistrationModalOpen(false);
      await refreshParticipationState();
    } catch (err: any) {
      console.error("Failed to register participation", err);
      setRegistrationMessage(err.response?.data?.message || "Failed to register the team for this hackathon.");
    } finally {
      setRegistrationSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LoadingProgress progress={60} label="Loading details..." />
        </div>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-[2rem] border border-zinc-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/78">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
            <Compass className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Details Unavailable</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error || "Hackathon not found"}</p>
          <button
            onClick={handleGoBack}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-500"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const fallbackImage = getStableDefaultImage(`${hackathon._id}:${hackathon.title}`);
  const coverSrc = hackathon.coverImage?.trim() || fallbackImage;
  const countdown = getCountdown(hackathon.deadline);
  const participationTeamName = currentParticipation?.teamInfo?.name || "";
  const showRegistrationBanner = isAuthenticated && !isAlreadyParticipating && !bannerDismissed;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <button
        onClick={handleGoBack}
        className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to hackathons
      </button>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/60"
      >
        <div className="relative h-64 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900/40 md:h-80">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-[shimmer_1.4s_linear_infinite] bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
          )}
          <img
            src={coverSrc}
            alt={hackathon.title}
            onLoad={() => setImageLoaded(true)}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = fallbackImage;
              setImageLoaded(true);
            }}
            className={`h-full w-full object-cover transition-transform duration-700 hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          />
          <div className="absolute left-6 top-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-md border border-white/10 bg-zinc-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
              {hackathon.platform}
            </span>
            {hackathon.mode && (
              <span
                className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md ${
                  /^online$/i.test(hackathon.mode)
                    ? "border-emerald-500/20 bg-emerald-600/85"
                    : "border-indigo-500/20 bg-indigo-600/85"
                }`}
              >
                {hackathon.mode}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-4xl">
                {hackathon.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Building className="h-4.5 w-4.5 text-zinc-400" />
                <span className="text-sm font-medium">
                  Hosted by <strong className="font-semibold">{hackathon.organization || "Unknown Organizer"}</strong>
                </span>
              </div>
              {isAlreadyParticipating && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Participating with {participationTeamName}
                  <Link to="/dashboard?tab=tracker" className="inline-flex items-center gap-1 text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">
                    View on Dashboard
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={handleToggleBookmark}
              disabled={isBookmarkLoading}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                isBookmarked
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                  : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
              title={isBookmarked ? "Remove Bookmark" : "Save Hackathon"}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-current" : ""}`} />
            </button>
          </div>

          <hr className="my-6 border-zinc-200 dark:border-zinc-800" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200/50 bg-emerald-50/20 p-4 dark:border-emerald-500/10 dark:bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-400/80">Prize Pool</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{hackathon.prize || "TBD"}</p>
                </div>
              </div>
            </div>

            <div
              className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 ${
                countdown.isUrgent
                  ? "border-rose-200/50 bg-rose-50/20 dark:border-rose-500/10 dark:bg-rose-500/5"
                  : "border-zinc-200 bg-zinc-50/30 dark:border-zinc-800 dark:bg-zinc-800/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    countdown.isUrgent
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className={`text-[0.68rem] font-bold uppercase tracking-wider ${
                      countdown.isUrgent ? "text-rose-800/80 dark:text-rose-400/80" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    Deadline
                  </p>
                  <p className={`text-base font-bold ${countdown.isUrgent ? "text-rose-700 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {countdown.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-800/20 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Location</p>
                  <p className="line-clamp-1 text-base font-bold text-zinc-700 dark:text-zinc-300">{hackathon.location || "Online"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/20 p-5 dark:border-zinc-800/55 dark:bg-zinc-950/20">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  <Calendar className="h-4 w-4 text-zinc-400" /> Key Dates
                </h3>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Starts On</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {hackathon.startDate ? new Date(hackathon.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBD"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Submission Ends</span>
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {hackathon.deadline ? new Date(hackathon.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBD"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/20 p-5 dark:border-zinc-800/55 dark:bg-zinc-950/20">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  <Compass className="h-4 w-4 text-zinc-400" /> Origin details
                </h3>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Host Platform</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{hackathon.platform}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Origin URL</span>
                    <a
                      href={hackathon.scrapedFromURL || hackathon.applyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-48 truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {hackathon.platform} Page
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {hackathon.tags && hackathon.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  <Tag className="h-4 w-4 text-zinc-400" /> Themes & Technologies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {hackathon.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-lg bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800/40 dark:bg-zinc-950/20 md:flex-row">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Register as a team</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track hackathon participation through a shared team workspace instead of a personal application list.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {isAlreadyParticipating ? (
                <Link
                  to="/dashboard?tab=tracker"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Tracking with {participationTeamName}
                </Link>
              ) : (
                <button
                  onClick={handleBeginRegistration}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-4 w-4" />
                  Have you already registered?
                </button>
              )}
              {hackathon.applyLink && (
                <a
                  href={hackathon.applyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/35"
                >
                  Apply on {hackathon.platform}
                  <ExternalLink className="h-4.5 w-4.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showRegistrationBanner && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-1.5rem)] max-w-3xl"
          >
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Have you already registered for this hackathon?</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Link the hackathon to a team and keep the lifecycle in one place.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBeginRegistration}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Yes, I have
                  </button>
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {registrationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-8 backdrop-blur-sm"
            onClick={() => setRegistrationModalOpen(false)}
          >
            <motion.div
              initial={{ y: 24, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Register participation</p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{hackathon.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Step {registrationStep} of 2</p>
                </div>
                <button
                  onClick={() => setRegistrationModalOpen(false)}
                  className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {registrationMessage && (
                <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                  {registrationMessage}
                </div>
              )}

              {registrationStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Select team</label>
                    <select
                      value={selectedTeamId}
                      onChange={(event) => setSelectedTeamId(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    >
                      <option value="" disabled>
                        Choose a team
                      </option>
                      {userTeams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                      <option value="create-new">Create new team</option>
                    </select>
                  </div>

                  {(selectedTeamId === "create-new" || userTeams.length === 0) && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">New team name</label>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        placeholder="Team Nebula"
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => setRegistrationModalOpen(false)}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setRegistrationStep(2)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">First stage name</label>
                    <input
                      type="text"
                      value={firstStageName}
                      onChange={(event) => setFirstStageName(event.target.value)}
                      placeholder="Round 1 Pitch"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Optional deadline</label>
                    <input
                      type="date"
                      value={firstStageDeadline}
                      onChange={(event) => setFirstStageDeadline(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
                    <button
                      onClick={() => handleRegisterParticipation(true)}
                      disabled={registrationSaving || registrationDataLoading}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Skip for now
                    </button>
                    <button
                      onClick={() => handleRegisterParticipation(false)}
                      disabled={registrationSaving || registrationDataLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {registrationSaving ? "Registering..." : "Register ✓"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
