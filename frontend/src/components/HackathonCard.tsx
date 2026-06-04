import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

type Hackathon = {
    _id: string
    title: string
    platform: string
    coverImage?: string
    startDate?: string
    deadline?: string
    mode?: string
    prize?: string
    location?: string
    applyLink?: string

}

type CardAction = {
    label: string
    onClick: () => void
    destructive?: boolean
};

type HackathonCardProps = {
    hackathon: Hackathon;
    displayIndex: number;
    isBookmarked?: boolean;
    onToggleBookmark?: () => void;
    extraActions?: CardAction[];
};

const defaultImages = [
    "/images/hackathons/hackathon-default-1.svg",
    "/images/hackathons/hackathon-default-2.svg",
    "/images/hackathons/hackathon-default-3.svg",
    "/images/hackathons/hackathon-default-4.svg",
];

const IMAGE_LOAD_TIMEOUT_MS = 7000;
const CARD_REVEAL_ROOT_MARGIN = "0px 0px -8% 0px";
const loadedImageSourceCache = new Set<string>();
const revealedCardCache = new Set<string>();

const getStableDefaultImage = (seed: string) => {
    let hash = 0;

    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return defaultImages[hash % defaultImages.length];
};

const SAFE_DEADLINE_MIN_WINDOW_DAYS = 5;

type DeadlineDisplay = {
    label: string;
    isUrgent: boolean;
    isExpired?: boolean;
};

const isUnavailablePrize = (value: string) =>
    /^(?:tbd|na|n\/a|none|null|undefined|not\s*(?:announced|disclosed)|to\s*be\s*announced|--?)$/i.test(value.trim());

const getPrizeDisplay = (value?: string) => {
    if (!value?.trim()) {
        return { label: "Prize Pool: TBD", isTbd: true };
    }

    const cleanedPrize = value
        .replace(/^\s*(?:total\s+)?prize\s*pool\s*[:\-–]?\s*/i, "")
        .replace(/^\s*prizes?\s*[:\-–]?\s*/i, "")
        .trim();

    if (!cleanedPrize || isUnavailablePrize(cleanedPrize)) {
        return { label: "Prize Pool: TBD", isTbd: true };
    }

    return { label: cleanedPrize, isTbd: false };
};

const getDeadlineDisplay = (deadline?: string): DeadlineDisplay => {
    if (!deadline?.trim()) {
        return { label: "TBD", isUrgent: false };
    }

    const rawDeadline = deadline.trim();
    const parsed = new Date(rawDeadline);
    if (Number.isNaN(parsed.getTime())) {
        return { label: "TBD", isUrgent: false };
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDeadline)) {
        parsed.setHours(23, 59, 59, 999);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilActualDeadline = Math.ceil((parsed.getTime() - Date.now()) / msPerDay);

    if (daysUntilActualDeadline < 0) {
        return {
            label: "Expired",
            isUrgent: false,
            isExpired: true,
        };
    }

    if (daysUntilActualDeadline >= 0 && daysUntilActualDeadline <= SAFE_DEADLINE_MIN_WINDOW_DAYS) {
        const daysLeft = Math.max(daysUntilActualDeadline, 1);
        const dayLabel = daysLeft === 1 ? "day" : "days";

        return {
            label: `${daysLeft} ${dayLabel} left only`,
            isUrgent: true,
        };
    }

    if (Number.isNaN(parsed.getTime())) {
        return { label: "TBD", isUrgent: false };
    }

    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = parsed.getFullYear();

    return {
        label: `${dd}-${mm}-${yyyy}`,
        isUrgent: false,
    };
};

const HackathonCard = ({ hackathon, displayIndex, extraActions = [] }: HackathonCardProps) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const hasBeenRevealed = revealedCardCache.has(hackathon._id);
    const fallbackImageRef = useRef<string>(getStableDefaultImage(`${hackathon._id}:${hackathon.title}`));
    const fallbackImage = fallbackImageRef.current;
    const primaryImage = hackathon.coverImage?.trim() || "";
    
    // Industry technique: Use a free global Image CDN to proxy external images.
    // This resizes huge raw images, converts them to WebP, and completely bypasses 
    // hotlinking/CORS 403 blocks from platforms like Devpost/Unstop/MLH.
    const optimizedPrimaryImage = primaryImage && !primaryImage.startsWith("/") 
        ? `https://wsrv.nl/?url=${encodeURIComponent(primaryImage)}&w=500&h=250&fit=cover&output=webp&we`
        : primaryImage;

    const initialImageSource = optimizedPrimaryImage || fallbackImage;
    const [imageSource, setImageSource] = useState(initialImageSource);
    const [imageLoaded, setImageLoaded] = useState(() => loadedImageSourceCache.has(initialImageSource));
    const [isVisible, setIsVisible] = useState(hasBeenRevealed);

    useEffect(() => {
        const nextSource = optimizedPrimaryImage || fallbackImage;
        setImageSource(nextSource);
        setImageLoaded(loadedImageSourceCache.has(nextSource));
    }, [optimizedPrimaryImage, fallbackImage]);

    useEffect(() => {
        if (isVisible || !cardRef.current) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                const [entry] = entries;
                if (!entry?.isIntersecting) {
                    return;
                }

                setIsVisible(true);
                revealedCardCache.add(hackathon._id);
                observer.disconnect();
            },
            {
                threshold: 0.15,
                rootMargin: CARD_REVEAL_ROOT_MARGIN,
            }
        );

        observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [hackathon._id, isVisible]);

    useEffect(() => {
        if (imageLoaded) {
            return;
        }

        // Some third-party image URLs never resolve nor error; force fallback after timeout.
        const timeoutId = window.setTimeout(() => {
            setImageSource(currentSource => {
                if (currentSource === fallbackImage) {
                    setImageLoaded(true);
                    return currentSource;
                }

                return fallbackImage;
            });
        }, IMAGE_LOAD_TIMEOUT_MS);

        return () => window.clearTimeout(timeoutId);
    }, [imageLoaded, fallbackImage, imageSource]);

        const deadlineDisplay = getDeadlineDisplay(hackathon.deadline);
    const locationLabel = hackathon.location?.trim() || "TBD";
    const prizeDisplay = getPrizeDisplay(hackathon.prize);
    const prizeChipClass = prizeDisplay.isTbd
        ? "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.7rem] font-semibold text-zinc-500 dark:border-zinc-850 dark:bg-zinc-800/40 dark:text-zinc-400"
        : "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-2 py-0.5 text-[0.72rem] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
    const revealDelay = (displayIndex % 4) * 65;

    // Read tracked state
    const isTracked = extraActions.some(action => action.label === "TRACKED_TRUE");
    const trackHandler = extraActions.find(action => action.label === "TRACK_HANDLER")?.onClick;

    const isExpired = !!deadlineDisplay.isExpired;

    return (
        <div
            ref={cardRef}
            className={`group premium-border-card relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-4 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md dark:hover:border-zinc-700 dark:hover:shadow-lg ${isExpired ? "expired opacity-80" : ""} ${isVisible ? "translate-x-0 translate-y-0 opacity-100" : "-translate-x-3 translate-y-2 opacity-0"}`}
            style={{ transitionDelay: isVisible ? `${revealDelay}ms` : "0ms" }}
        >
            <div className="relative mb-3.5 block h-28 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60">
                {isExpired && (
                    <div className="absolute right-2 top-2 z-20">
                        <span className="inline-flex items-center rounded-md bg-rose-600/95 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white border border-rose-500/30 shadow-sm">
                            Expired
                        </span>
                    </div>
                )}
                {/* Floating Tags Overlay */}
                <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
                    <span className="inline-flex items-center rounded-md bg-zinc-900/80 backdrop-blur-md px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white border border-white/10">
                        {hackathon.platform}
                    </span>
                    {hackathon.mode && (
                        <span className={`inline-flex items-center rounded-md backdrop-blur-md px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white border ${
                            /^online$/i.test(hackathon.mode)
                                ? "bg-emerald-600/85 border-emerald-500/20"
                                : "bg-indigo-600/85 border-indigo-500/20"
                        }`}>
                            {hackathon.mode}
                        </span>
                    )}
                </div>

                {!imageLoaded && (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-[linear-gradient(110deg,rgba(228,228,231,0.65),rgba(250,250,250,0.95),rgba(228,228,231,0.65))] bg-size-[200%_100%] animate-[shimmer_1.4s_linear_infinite] dark:bg-[linear-gradient(110deg,rgba(39,39,42,0.9),rgba(63,63,70,0.95),rgba(39,39,42,0.9))]"
                    />
                )}
                <img
                    src={imageSource}
                    alt={hackathon.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                        loadedImageSourceCache.add(imageSource);
                        setImageLoaded(true);
                    }}
                    onError={(event) => {
                        const imageElement = event.currentTarget;
                        if (imageElement.src.includes("/images/hackathons/")) {
                            setImageLoaded(true);
                            return;
                        }

                        imageElement.onerror = null;
                        setImageSource(fallbackImage);
                    }}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
            </div>

            <div className="block">
                <h2 className="line-clamp-2 h-11 text-[0.92rem] font-bold leading-5 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
                    {hackathon.title}
                </h2>
            </div>

            {/* Vertical structured metadata list */}
            <div className="mt-3.5 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 text-[0.72rem] text-zinc-500 dark:text-zinc-400">
                    <svg className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium whitespace-nowrap">
                        Deadline:{" "}
                        <span className={deadlineDisplay.isUrgent ? "text-rose-600 font-semibold dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300 font-semibold"}>
                            {deadlineDisplay.label}
                        </span>
                    </span>
                </div>
                <div className="flex items-start gap-2 text-[0.72rem] text-zinc-500 min-h-[32px] dark:text-zinc-400">
                    <svg className="mt-[2px] h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium line-clamp-2" title={locationLabel}>
                        Location: <span className="text-zinc-700 dark:text-zinc-300 font-semibold">{
                            (() => {
                                const parts = locationLabel.split(',').map(p => p.trim()).filter(Boolean);
                                const nonIndiaParts = parts.filter(p => p.toLowerCase() !== 'india');
                                
                                if (nonIndiaParts.length <= 3) return nonIndiaParts.join(', ');
                                
                                // Take Venue (first) + City & State (last two)
                                return `${nonIndiaParts[0]}, ${nonIndiaParts.slice(-2).join(', ')}`;
                            })()
                        }</span>
                    </span>
                </div>
            </div>

            {/* Footer with Prize & Button */}
            <div className="mt-auto pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <span className={prizeChipClass}>
                            <img
                                src="/prizeSvg.svg"
                                alt=""
                                aria-hidden="true"
                                className={`h-3.5 w-3.5 shrink-0 ${prizeDisplay.isTbd ? "opacity-80" : ""}`}
                            />
                            <span className="truncate max-w-[140px]" title={prizeDisplay.label}>
                                {prizeDisplay.label}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="flex gap-2 w-full mt-1">
                    {hackathon.applyLink && (
                        <a
                            href={hackathon.applyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-850 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                            Official Site
                            <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                    )}
                    {isTracked ? (
                        <button
                            disabled
                            className="flex-1 inline-flex items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                        >
                            Tracking ✓
                        </button>
                    ) : (
                        <button
                            onClick={trackHandler}
                            className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-500 cursor-pointer"
                        >
                            Track
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HackathonCard;