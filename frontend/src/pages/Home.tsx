import FeatureCard from "../components/FeatureCard";
import ProductStoryAnimation from "../components/productStory/ProductStoryAnimation";

const HomePage = () => (
    <section className="flex min-h-[76vh] flex-col items-center justify-center gap-14 py-6 sm:py-10">
        <div className="w-full max-w-6xl">
            <div className="relative overflow-hidden rounded-4xl border border-zinc-200/90 bg-white px-6 py-10 shadow-sm backdrop-blur-md transition-all duration-200 sm:px-10 sm:py-14 md:px-14 dark:border-zinc-800 dark:bg-zinc-900/82 dark:shadow-md">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(59,130,246,0.16),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_center,rgba(79,140,255,0.22),transparent_36%)]" />
                <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
                    <div className="relative text-center lg:pl-3 lg:text-left">
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                            Team-First Hackathon OS
                        </span>
                        <h1 className="relative mt-4 text-[2.25rem] font-extrabold tracking-[-0.04em] text-zinc-900 sm:text-5xl md:text-[3.4rem] lg:text-[3.7rem] dark:text-white">
                            Build, Track & Win with Your <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-500">Team</span>
                        </h1>
                        <p className="relative mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg md:text-xl lg:mx-0 lg:max-w-xl dark:text-zinc-300">
                            HackDekh gives your team one place to discover hackathons, track each stage, capture reflections, and improve win rate with clear visibility.
                        </p>
                        <div className="relative mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <a
                    href="/hackathons"
                    className="inline-flex w-full items-center justify-center rounded-full border border-blue-500/35 bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-md dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400 sm:w-auto"
                >
                    Explore Hackathons
                </a>
                <a
                    href="/teams"
                    className="inline-flex w-full items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 px-7 py-3.5 text-base font-semibold text-zinc-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-zinc-900 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70 dark:hover:text-white sm:w-auto"
                >
                    Create Your Team
                </a>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-115 lg:ml-auto lg:translate-x-2">
                        <ProductStoryAnimation />
                    </div>
                </div>
            </div>
        </div>

        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            <FeatureCard
                emoji="🕸️"
                title="Aggregated Hackathons"
                desc="All top platforms, one place. No more endless searching."
            />
            <FeatureCard
                emoji="👥"
                title="Team Management"
                desc="Create teams, save hackathons, track registrations, wins, and learning."
            />
            <FeatureCard
                emoji="🕒"
                title="Auto Updates"
                desc="Daily cron jobs keep hackathons fresh and up-to-date."
            />
        </div>
    </section>
);



export default HomePage;