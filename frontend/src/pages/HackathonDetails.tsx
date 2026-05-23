import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Award, ExternalLink, Clock, Building, Tag, Compass, Bookmark, CheckCircle2 } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import LoadingProgress from "../components/LoadingProgress";
import { useAuth } from "../context/AuthContext";

type Hackathon = {
  _id: string;
  title: string;
  platform: string;
  coverImage?: string;
  startDate?: string;
  deadline?: string;
  mode?: string;
  prize?: string;
  location?: string;
  applyLink?: string;
  organization?: string;
  tags?: string[];
  scrapedFromURL?: string;
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
  if (isNaN(parsed.getTime())) return { label: "TBD", isUrgent: false, daysLeft: -1 };

  const ms = parsed.getTime() - Date.now();
  const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { label: "Expired", isUrgent: false, daysLeft };
  } else if (daysLeft === 0) {
    return { label: "Closes Today", isUrgent: true, daysLeft };
  } else if (daysLeft === 1) {
    return { label: "1 day left", isUrgent: true, daysLeft };
  } else if (daysLeft <= 5) {
    return { label: `${daysLeft} days left`, isUrgent: true, daysLeft };
  }
  return { label: `${daysLeft} days left`, isUrgent: false, daysLeft };
};

export default function HackathonDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { user, isAuthenticated, updateUser } = useAuth();
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [isTrackLoading, setIsTrackLoading] = useState(false);

  const isBookmarked = user?.savedHackathons?.includes(id || "") || false;
  const appliedEntry = user?.applications?.find(
    (app) => (typeof app.hackathon === "object" && app.hackathon ? app.hackathon._id : app.hackathon) === id
  );

  const handleToggleBookmark = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsBookmarkLoading(true);
    try {
      const res = await axiosInstance.post(`/users/saved/${id}`);
      if (res.data?.success && res.data?.data) {
        updateUser({
          ...user!,
          savedHackathons: res.data.data.savedHackathons,
        });
      }
    } catch (err) {
      console.error("Failed to toggle bookmark", err);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const handleTrackApplication = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsTrackLoading(true);
    try {
      if (appliedEntry) {
        navigate("/dashboard?tab=tracker");
      } else {
        const res = await axiosInstance.post(`/users/applications`, {
          hackathonId: id,
          status: "Applied",
        });
        if (res.data?.success && res.data?.data) {
          updateUser({
            ...user!,
            applications: [...user!.applications, res.data.data],
          });
        }
      }
    } catch (err) {
      console.error("Failed to track application", err);
    } finally {
      setIsTrackLoading(false);
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

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/hackathons");
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
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 transition-colors"
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

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      {/* Back button */}
      <button
        onClick={handleGoBack}
        className="group mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" />
        Back to hackathons
      </button>

      {/* Main Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/60 backdrop-blur-xl"
      >
        {/* Banner Image */}
        <div className="relative h-64 md:h-80 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900/40">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(228,228,231,0.6),rgba(250,250,250,0.95),rgba(228,228,231,0.6))] bg-size-[200%_100%] animate-[shimmer_1.4s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]" />
          )}
          <img
            src={coverSrc}
            alt={hackathon.title}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImage;
              setImageLoaded(true);
            }}
            className={`h-full w-full object-cover transition-transform duration-700 hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Glass Overlay with Platform info */}
          <div className="absolute left-6 top-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-md bg-zinc-900/80 backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wider text-white border border-white/10">
              {hackathon.platform}
            </span>
            {hackathon.mode && (
              <span className={`inline-flex items-center rounded-md backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wider text-white border ${
                /^online$/i.test(hackathon.mode)
                  ? "bg-emerald-600/85 border-emerald-500/20"
                  : "bg-indigo-600/85 border-indigo-500/20"
              }`}>
                {hackathon.mode}
              </span>
            )}
          </div>
        </div>

        {/* Content Info */}
        <div className="p-6 md:p-10">
          {/* Title and host */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {hackathon.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Building className="h-4.5 w-4.5 text-zinc-400" />
                <span className="text-sm font-medium">Hosted by <strong className="font-semibold">{hackathon.organization || "Unknown Organizer"}</strong></span>
              </div>
            </div>

            <button
              onClick={handleToggleBookmark}
              disabled={isBookmarkLoading}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                isBookmarked
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900"
              }`}
              title={isBookmarked ? "Remove Bookmark" : "Save Hackathon"}
            >
              <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-current" : ""}`} />
            </button>
          </div>

          <hr className="my-6 border-zinc-200 dark:border-zinc-800" />

          {/* Key Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Prize pool */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200/50 bg-emerald-50/20 p-4 dark:border-emerald-500/10 dark:bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-400/80">Prize Pool</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    {hackathon.prize || "TBD"}
                  </p>
                </div>
              </div>
            </div>

            {/* Registration Deadline */}
            <div className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 ${
              countdown.isUrgent 
                ? 'border-rose-200/50 bg-rose-50/20 dark:border-rose-500/10 dark:bg-rose-500/5' 
                : 'border-zinc-200 bg-zinc-50/30 dark:border-zinc-800 dark:bg-zinc-800/20'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  countdown.isUrgent
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                }`}>
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-[0.68rem] font-bold uppercase tracking-wider ${
                    countdown.isUrgent
                      ? 'text-rose-800/80 dark:text-rose-400/80'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}>Deadline</p>
                  <p className={`text-base font-bold ${
                    countdown.isUrgent
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {countdown.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Location / Format */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-800/20 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Location</p>
                  <p className="text-base font-bold text-zinc-700 dark:text-zinc-300 line-clamp-1">
                    {hackathon.location || "Online"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details details section */}
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Timeline details */}
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/20 p-5 dark:border-zinc-800/55 dark:bg-zinc-950/20">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" /> Key Dates
                </h3>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Starts On</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {hackathon.startDate ? new Date(hackathon.startDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      }) : "TBD"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Submission Ends</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                      {hackathon.deadline ? new Date(hackathon.deadline).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                      }) : "TBD"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform Meta Info */}
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/20 p-5 dark:border-zinc-800/55 dark:bg-zinc-950/20">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
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
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400 truncate max-w-48"
                    >
                      {hackathon.platform} Page
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags/Themes */}
            {hackathon.tags && hackathon.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
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

          {/* CTA Action button */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-50 dark:bg-zinc-950/20 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800/40">
            <div className="text-center md:text-left space-y-1">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-semibold">Ready to participate?</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">This link takes you directly to the registration page on {hackathon.platform}.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleTrackApplication}
                disabled={isTrackLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold border transition-all duration-200 ${
                  appliedEntry
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {appliedEntry ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Tracking: {appliedEntry.status}
                  </>
                ) : (
                  "Track Application"
                )}
              </button>
              {hackathon.applyLink && (
                <a
                  href={hackathon.applyLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 hover:bg-blue-500 transition-all duration-200"
                >
                  Apply on {hackathon.platform}
                  <ExternalLink className="h-4.5 w-4.5" />
                </a>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
