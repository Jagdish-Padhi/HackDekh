import LogoTransition from "./LogoAnimation";

type LoadingProgressProps = {
    progress: number
    label?: string
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, value))

const LoadingProgress = ({
    progress,
    label = 'Loading hackathons',
}: LoadingProgressProps) => {
    const safeProgress = clampProgress(progress)
    const progressText = `${Math.round(safeProgress)}%`

    return (
        <div className="rounded-[2.25rem] border border-zinc-200 bg-white p-6 shadow-md dark:border-zinc-800 dark:bg-zinc-950 text-center max-w-sm mx-auto">
            <div className="flex items-center justify-center py-1 overflow-visible">
                <LogoTransition width={140} height={90} loop={true} />
            </div>
            
            <div className="flex items-center justify-between gap-4 mt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-550 dark:text-zinc-400">
                    {label}
                </p>
                <span className="text-xs font-extrabold tabular-nums text-zinc-900 dark:text-white">
                    {progressText}
                </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-full border border-zinc-200/90 bg-zinc-100/90 p-0.5 dark:border-zinc-700/50 dark:bg-zinc-800/70">
                <div className="h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-[width] duration-300 ease-out"
                        style={{ width: `${safeProgress}%` }}
                    />
                </div>
            </div>

            <p className="mt-3 text-[10.5px] font-semibold text-zinc-450 dark:text-zinc-500 leading-normal">
                Syncing latest hackathon listings and metadata.
            </p>
        </div>
    )
}

export default LoadingProgress