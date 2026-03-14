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
    <div className="theme-card flex h-full flex-col rounded-[1.8rem] p-5 sm:p-6">
        {hackathon.coverImage && (
            <img
                src={hackathon.coverImage}
                alt={hackathon.title}
                className="mb-5 h-40 w-full rounded-[1.25rem] border border-white/10 object-cover"
            />
        )}
        <div className="mb-5 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-[rgba(79,140,255,0.18)] bg-[rgba(79,140,255,0.10)] px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-violet-accent">
                {hackathon.platform}
            </span>
            {hackathon.mode && (
                <span className="theme-pill rounded-full px-3 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em]">
                    {hackathon.mode}
                </span>
            )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
            {hackathon.title}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-text-muted">
            <span className="theme-pill rounded-full px-3 py-1">Start: {hackathon.startDate?.slice(0, 10)}</span>
            <span className="theme-pill rounded-full px-3 py-1">Deadline: {hackathon.deadline?.slice(0, 10)}</span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-h-10">
                {hackathon.prize && (
                    <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
                        {hackathon.prize}
                    </span>
                )}
            </div>
        {hackathon.applyLink && (
            <a
                href={hackathon.applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="theme-button-primary min-w-[9rem] px-5 py-3 text-sm font-semibold"
            >
                View Details
            </a>
        )}
        </div>
    </div>
);


export default HackathonCard;