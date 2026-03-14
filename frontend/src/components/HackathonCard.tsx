import { useRef } from "react";

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

const defaultImages = [
    "/images/hackathons/hackathon-default-1.svg",
    "/images/hackathons/hackathon-default-2.svg",
    "/images/hackathons/hackathon-default-3.svg",
    "/images/hackathons/hackathon-default-4.svg",
];

const getRandomDefaultImage = () =>
    defaultImages[Math.floor(Math.random() * defaultImages.length)];

const SAFE_DEADLINE_BUFFER_DAYS = 3;
const SAFE_DEADLINE_MIN_WINDOW_DAYS = 5;

const formatDisplayDate = (value?: string) => {
    if (!value?.trim()) {
        return "TBD";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "TBD";
    }

    return parsed.toISOString().slice(0, 10);
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

const getSafeDeadlineDate = (deadline?: string) => {
    if (!deadline?.trim()) {
        return null;
    }

    const rawDeadline = deadline.trim();
    const parsed = new Date(rawDeadline);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDeadline)) {
        parsed.setHours(23, 59, 59, 999);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilActualDeadline = Math.ceil((parsed.getTime() - Date.now()) / msPerDay);

    if (daysUntilActualDeadline > SAFE_DEADLINE_MIN_WINDOW_DAYS) {
        parsed.setDate(parsed.getDate() - SAFE_DEADLINE_BUFFER_DAYS);
    }

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().slice(0, 10);
};

const HackathonCard = ({ hackathon }: { hackathon: Hackathon }) => {
    const fallbackImageRef = useRef<string>(getRandomDefaultImage());
    const fallbackImage = fallbackImageRef.current;
    const primaryImage = hackathon.coverImage?.trim() || "";
    const safeDeadlineDate = getSafeDeadlineDate(hackathon.deadline);
    const locationLabel = hackathon.location?.trim() || "TBD";
    const prizeDisplay = getPrizeDisplay(hackathon.prize);
    const prizeChipClass = prizeDisplay.isTbd
        ? "inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-[0_0_0_1px_rgba(251,191,36,0.1),0_10px_20px_-16px_rgba(245,158,11,0.95)] dark:border-amber-400/30 dark:bg-amber-500/12 dark:text-amber-300 dark:shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_10px_20px_-14px_rgba(245,158,11,0.8)]"
        : "inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_12px_24px_-16px_rgba(5,150,105,0.9)] dark:border-emerald-400/35 dark:bg-emerald-500/12 dark:text-emerald-300 dark:shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_10px_20px_-14px_rgba(16,185,129,0.8)]";

    return (
        <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md dark:hover:border-zinc-700 dark:hover:shadow-lg">
            <img
                src={primaryImage || fallbackImage}
                alt={hackathon.title}
                onError={(event) => {
                    const imageElement = event.currentTarget;
                    if (imageElement.src.includes("/images/hackathons/")) {
                        return;
                    }

                    imageElement.onerror = null;
                    imageElement.src = fallbackImage;
                }}
                className="mb-5 h-40 w-full rounded-xl border border-zinc-200 object-cover dark:border-zinc-800"
            />
        <div className="mb-5 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-blue-300/80 bg-blue-50 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-300">
                {hackathon.platform}
            </span>
            {hackathon.mode && (
                <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400">
                    {hackathon.mode}
                </span>
            )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {hackathon.title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-800/55">
                Deadline: {safeDeadlineDate ?? formatDisplayDate(hackathon.deadline)}
            </span>
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-800/55">
                Location: {locationLabel}
            </span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-h-10">
                <span className={prizeChipClass}>
                    <img
                        src="/prizeSvg.svg"
                        alt=""
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 ${prizeDisplay.isTbd ? "opacity-85" : ""}`}
                    />
                    {prizeDisplay.label}
                </span>
            </div>
            {hackathon.applyLink && (
                <a
                    href={hackathon.applyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-36 items-center justify-center rounded-full border border-blue-500/35 bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:shadow-md"
                >
                    View Details
                </a>
            )}
        </div>
        </div>
    );
};


export default HackathonCard;