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


const HackathonCard = ({ hackathon }: { hackathon: Hackathon }) => (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200/90 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_20px_45px_rgba(59,130,246,0.18)] dark:border-[#1F1F22] dark:bg-[#121214] dark:shadow-[0_20px_44px_rgba(0,0,0,0.38)] dark:hover:border-blue-400/40 dark:hover:shadow-[0_24px_50px_rgba(79,140,255,0.2)]">
        {hackathon.coverImage && (
            <img
                src={hackathon.coverImage}
                alt={hackathon.title}
                className="mb-5 h-40 w-full rounded-xl border border-gray-200 object-cover dark:border-[#2A2A30]"
            />
        )}
        <div className="mb-5 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-blue-300/80 bg-blue-50 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-300">
                {hackathon.platform}
            </span>
            {hackathon.mode && (
                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-gray-600 dark:border-[#2A2A30] dark:bg-white/3 dark:text-gray-400">
                    {hackathon.mode}
                </span>
            )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            {hackathon.title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-[#2A2A30] dark:bg-white/3">Start: {hackathon.startDate?.slice(0, 10)}</span>
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-[#2A2A30] dark:bg-white/3">Deadline: {hackathon.deadline?.slice(0, 10)}</span>
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
                className="inline-flex min-w-36 items-center justify-center rounded-full border border-blue-500/35 bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-[0_14px_30px_rgba(59,130,246,0.35)] dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
                View Details
            </a>
        )}
        </div>
    </div>
);


export default HackathonCard;