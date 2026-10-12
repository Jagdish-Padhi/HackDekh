import LogoTransition from "./LogoAnimation";

type LoadingProgressProps = {
    progress?: number;
    label?: string;
    simulate?: boolean;
    description?: string;
};

const LoadingProgress = ({
    label = 'Loading hackathons',
    description = '',
}: LoadingProgressProps) => {
    return (
        <div className="relative text-center max-w-sm mx-auto flex flex-col items-center justify-center min-h-[280px]">
            {/* Soft, pulsing ambient backdrop glow behind the logo */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-72 h-72 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.18)_0%,_rgba(79,70,229,0.08)_45%,_transparent_70%)] blur-2xl animate-pulse pointer-events-none" />

            <div className="flex items-center justify-center overflow-visible select-none pointer-events-none">
                <LogoTransition width={330} height={225} loop={true} />
            </div>
            
            <div className="w-full mt-2 flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xs">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400" />
                    </span>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">
                        {label}
                    </p>
                </div>

                {description && (
                    <p className="mt-2 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 max-w-xs leading-normal">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoadingProgress;
