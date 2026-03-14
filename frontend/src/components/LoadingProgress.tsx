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
        <div className="rounded-[1.8rem] border border-zinc-200/90 bg-white/95 px-6 py-6 shadow-sm backdrop-blur-md transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900/88 dark:shadow-md sm:px-8 sm:py-7">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium tracking-wide text-zinc-700 dark:text-zinc-300">
                    {label}
                </p>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {progressText}
                </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-full border border-zinc-200/90 bg-zinc-100/90 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/70">
                <div className="h-2.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
                    <div
                        className="h-full rounded-full bg-linear-to-r from-blue-600 via-blue-500 to-cyan-400 shadow-[0_0_14px_rgba(59,130,246,0.35)] transition-[width] duration-300 ease-out"
                        style={{ width: `${safeProgress}%` }}
                    />
                </div>
            </div>

            <p className="mt-3 text-xs tracking-wide text-zinc-500 dark:text-zinc-400">
                Syncing latest hackathon listings and metadata.
            </p>
        </div>
    )
}

export default LoadingProgress