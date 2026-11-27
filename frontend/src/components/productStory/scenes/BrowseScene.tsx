import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../../utils/axiosInstance";
import { useCache } from "../../../context/CacheContext";

type StoryHackathon = {
  id: string;
  title: string;
  platform: string;
  img: string;
  fallbackImg: string;
  prize: string;
  mode: string;
  deadline: string;
  location: string;
  highlight?: string;
  team: string;
};

const FALLBACK_HACKATHONS: StoryHackathon[] = [
  {
    id: "fallback-1",
    title: "Odoo Hackathon 2026",
    platform: "Odoo",
    img: "/images/hackathons/hackathon-default-1.svg",
    fallbackImg: "/images/hackathons/hackathon-default-1.svg",
    prize: "₹10,00,000",
    mode: "In-Person",
    deadline: "Winner",
    location: "Gandhinagar, India",
    highlight: "Winner",
    team: "Jagdish & Saman",
  },
  {
    id: "fallback-2",
    title: "Far Away Hackathon",
    platform: "Devfolio",
    img: "/images/hackathons/hackathon-default-2.svg",
    fallbackImg: "/images/hackathons/hackathon-default-2.svg",
    prize: "¥3,000,000",
    mode: "In-Person",
    deadline: "Finalist",
    location: "Tokyo, Japan",
    highlight: "Finalist",
    team: "Jagdish & Twinkle",
  },
  {
    id: "fallback-3",
    title: "Google Solution Challenge",
    platform: "Google",
    img: "/images/hackathons/hackathon-default-3.svg",
    fallbackImg: "/images/hackathons/hackathon-default-3.svg",
    prize: "₹20,00,000",
    mode: "Online",
    deadline: "Top 100",
    location: "Online",
    highlight: "Top 100",
    team: "Esc(Reality)",
  },
  {
    id: "fallback-4",
    title: "HackHazards 2026",
    platform: "Devfolio",
    img: "/images/hackathons/hackathon-default-4.svg",
    fallbackImg: "/images/hackathons/hackathon-default-4.svg",
    prize: "₹3,00,000",
    mode: "Online",
    deadline: "Top 50",
    location: "Online",
    highlight: "Top 50",
    team: "Twinkle & Team",
  },
];

function formatShortDeadline(deadline?: string): string {
  if (!deadline) return "Open";
  const dt = new Date(deadline);
  if (Number.isNaN(dt.getTime())) return "Open";
  const diffDays = Math.ceil((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Closes Today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function mapLiveHackathons(raw: any[]): StoryHackathon[] {
  const withImages = raw.filter(
    (h) =>
      h &&
      typeof h.coverImage === "string" &&
      /^https?:\/\//i.test(h.coverImage.trim()) &&
      typeof h.title === "string" &&
      h.title.trim().length > 0
  );

  return withImages.slice(0, 6).map((h, idx) => ({
    id: String(h._id || h.slug || idx),
    title: h.title.trim(),
    platform: h.platform || "HackDekh",
    img: h.coverImage.trim(),
    fallbackImg: `/images/hackathons/hackathon-default-${(idx % 4) + 1}.svg`,
    prize: h.prize?.trim() || "TBD",
    mode: h.mode?.trim() || "Online",
    deadline: formatShortDeadline(h.deadline),
    location: h.location?.trim() || (/online/i.test(h.mode || "") ? "Online" : "TBA"),
    team: h.organization?.trim() || h.platform || "Community Event",
  }));
}

export default function BrowseScene() {
  const shouldReduceMotion = useReducedMotion();
  const { hackathons: cachedHackathons } = useCache();
  const [liveHackathons, setLiveHackathons] = useState<StoryHackathon[]>(() => {
    if (Array.isArray(cachedHackathons) && cachedHackathons.length > 0) {
      const mapped = mapLiveHackathons(cachedHackathons);
      if (mapped.length >= 2) return mapped;
    }
    return [];
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (liveHackathons.length >= 2) return;
    let cancelled = false;

    axiosInstance
      .get("/hackathons", { params: { showExpired: "false" } })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const mapped = mapLiveHackathons(rows);
        if (mapped.length >= 2) {
          setLiveHackathons(mapped);
          setActiveIdx(0);
        }
      })
      .catch(() => {
        // Keep fallback cards silently if API is unreachable
      });

    return () => {
      cancelled = true;
    };
  }, [liveHackathons.length]);

  const hackathons = useMemo(
    () => (liveHackathons.length >= 2 ? liveHackathons : FALLBACK_HACKATHONS),
    [liveHackathons]
  );

  useEffect(() => {
    if (shouldReduceMotion || isPaused) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % hackathons.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [shouldReduceMotion, isPaused, hackathons.length]);

  const toggleTrack = (id: string) => {
    setTracked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cardA = hackathons[activeIdx % hackathons.length];
  const cardB = hackathons[(activeIdx + 1) % hackathons.length];
  const visibleCards = [cardA, cardB];

  return (
    <div 
      className="flex flex-col h-full justify-between"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Filter & Search Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["All", "Devfolio", "Unstop", "Devpost"].map((f, i) => (
            <span
              key={f}
              className={`rounded-md px-2 py-0.5 text-[9.5px] font-semibold transition-colors ${
                i === 0
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "border border-zinc-200 text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400"
              }`}
            >
              {f}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveIdx((prev) => (prev - 1 + hackathons.length) % hackathons.length)}
            className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setActiveIdx((prev) => (prev + 1) % hackathons.length)}
            className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Next card"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 2-Card Video Box Stack */}
      <div className="my-auto grid grid-cols-2 gap-2.5 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleCards.map((h, colIdx) => {
            const isTracked = tracked.has(h.id);
            return (
              <motion.div
                key={`${h.id}-${colIdx}`}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
                className="group relative flex flex-col rounded-xl border border-zinc-200/90 bg-white p-3 shadow-xs transition-all duration-200 dark:border-zinc-800/90 dark:bg-zinc-900/90 justify-between"
              >
                {/* 16:9 Thumbnail Box */}
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  <img
                    src={h.img}
                    alt={h.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      if (e.currentTarget.src !== window.location.origin + h.fallbackImg) {
                        e.currentTarget.src = h.fallbackImg;
                      }
                    }}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Badges */}
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
                    <span className="rounded border border-zinc-200/80 bg-white/95 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider text-zinc-800 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200">
                      {h.platform}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider text-white shadow-xs ${
                        /online/i.test(h.mode) ? "bg-emerald-600" : "bg-indigo-600"
                      }`}
                    >
                      {h.mode}
                    </span>
                  </div>
                  {h.highlight && (
                    <div className="absolute bottom-1 right-1">
                      <span className="rounded-md border border-amber-300/60 bg-amber-500/90 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
                        {h.highlight}
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Team */}
                <div className="mt-2">
                  <h4 className="line-clamp-1 text-[12px] font-bold leading-tight text-zinc-900 dark:text-zinc-100">
                    {h.title}
                  </h4>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium truncate mt-0.5">
                    {h.team}
                  </p>
                </div>

                {/* Metadata */}
                <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-800/80 text-[10px]">
                  <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                    <Clock className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                    <span className="truncate">
                      Status: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{h.deadline}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                    <MapPin className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                    <span className="truncate font-medium text-zinc-600 dark:text-zinc-300">{h.location}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-2 flex items-center justify-between gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <Trophy className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate max-w-[65px]">{h.prize}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleTrack(h.id)}
                    className={`rounded-md px-2 py-0.5 text-[9.5px] font-bold transition-all cursor-pointer ${
                      isTracked
                        ? "border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-blue-600 text-white hover:bg-blue-500 shadow-xs"
                    }`}
                  >
                    {isTracked ? "Tracked ✓" : "Track"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1 shrink-0">
        {hackathons.map((h, i) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setActiveIdx(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === activeIdx
                ? "w-5 bg-blue-600 dark:bg-blue-400"
                : "w-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
