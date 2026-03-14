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

const HackathonCard = ({ hackathon }: { hackathon: Hackathon }) => {
    const fallbackImageRef = useRef<string>(getRandomDefaultImage());
    const fallbackImage = fallbackImageRef.current;
    const primaryImage = hackathon.coverImage?.trim() || "";

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
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-800/55">Start: {hackathon.startDate?.slice(0, 10)}</span>
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-zinc-700 dark:bg-zinc-800/55">Deadline: {hackathon.deadline?.slice(0, 10)}</span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-h-10">
                {hackathon.prize && (
                    <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-300">
                        {hackathon.prize}
                    </span>
                )}
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