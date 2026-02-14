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
    <div
        className="relative border border-[#23233A] rounded-lg p-6 flex flex-col transition hover:shadow-cyan-glow hover:border-cyan-neon overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.08) 0%, rgba(34,211,238,0.06) 40%, #181825 100%)' }}
    >
        {hackathon.coverImage && (
            <img
                src={hackathon.coverImage}
                alt={hackathon.title}
                className="h-32 w-full object-cover rounded-lg mb-4"
            />
        )}
        <h2 className="font-sans font-semibold text-lg text-text-primary mb-1 tracking-tight">
            {hackathon.title}
        </h2>
        <div className="text-sm text-text-secondary mb-2 font-mono">
            {hackathon.platform}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-3 font-mono">
            <span>Start: {hackathon.startDate?.slice(0, 10)}</span>
            <span>Deadline: {hackathon.deadline?.slice(0, 10)}</span>
        </div>
        <div className="flex justify-between items-center mt-auto gap-2">
            <span className="font-semibold text-text-secondary">
                {hackathon.mode}
            </span>
            {hackathon.prize && (
                <span className="bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded-md text-xs font-mono">
                    {hackathon.prize}
                </span>
            )}
        </div>
        {hackathon.applyLink && (
            <a
                href={hackathon.applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-5 right-5 px-5 py-2 rounded-md bg-violet-brand text-text-primary font-semibold text-sm shadow-sm transition hover:shadow-cyan-glow hover:bg-violet-deep focus:outline-none focus:ring-2 focus:ring-cyan-neon z-10"
                style={{ minWidth: 72 }}
            >
                View Details
            </a>
        )}
    </div>
);


export default HackathonCard;