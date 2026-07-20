import { useState, useEffect } from "react";
import LogoTransition from "./LogoAnimation";

type LoadingProgressProps = {
    progress?: number
    label?: string
    simulate?: boolean
    description?: string
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, value))

const LoadingProgress = ({
    progress,
    label = 'Loading hackathons',
    simulate = false,
    description = 'Syncing latest listings and metadata.',
}: LoadingProgressProps) => {
    const [simulatedProgress, setSimulatedProgress] = useState(12)

    useEffect(() => {
        if (progress !== undefined || !simulate) return

        const interval = setInterval(() => {
            setSimulatedProgress(prev => {
                const step = Math.random() * 8 + 2
                return Math.min(prev + step, 96)
            })
        }, 300)

        return () => clearInterval(interval)
    }, [progress, simulate])

    const activeProgress = progress !== undefined ? progress : simulatedProgress
    const safeProgress = clampProgress(activeProgress)
    const progressText = `${Math.round(safeProgress)}%`

    return (
        <div className="relative text-center max-w-sm mx-auto flex flex-col items-center justify-center min-h-[300px]">
            {/* Soft, pulsing ambient backdrop glow behind the logo */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-72 h-72 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.14)_0%,_transparent_65%)] blur-2xl animate-pulse pointer-events-none" />

            <div className="flex items-center justify-center overflow-visible select-none pointer-events-none">
                <LogoTransition width={330} height={225} loop={true} />
            </div>
            
            <div className="w-full mt-1">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-550 dark:text-zinc-400">
                        {label}
                    </p>
                    <span className="text-xs font-black tabular-nums text-zinc-850 dark:text-zinc-100">
                        {progressText}
                    </span>
                </div>

                <div className="mt-2.5 overflow-hidden rounded-full border border-zinc-200/40 bg-zinc-100/30 p-0.5 dark:border-zinc-800/30 dark:bg-zinc-950/20 backdrop-blur-xs">
                    <div className="h-1.5 rounded-full bg-zinc-200/30 dark:bg-zinc-800/20">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-[width] duration-300 ease-out"
                            style={{ width: `${safeProgress}%` }}
                        />
                    </div>
                </div>

                <p className="mt-2.5 text-[10px] font-semibold text-zinc-450 dark:text-zinc-500 leading-normal">
                    {description}
                </p>
            </div>
        </div>
    )
}

export default LoadingProgress