import FeatureCard from "../components/FeatureCard";

const HomePage = () => (
    <section className="flex min-h-[76vh] flex-col items-center justify-center gap-14 py-6 text-center sm:py-10">
        <div className="w-full max-w-5xl">
            <div className="relative overflow-hidden rounded-4xl border border-gray-200/80 bg-white/85 px-6 py-10 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-colors duration-300 sm:px-10 sm:py-14 md:px-14 dark:border-[#1F1F22] dark:bg-[#121214]/82 dark:shadow-[0_30px_70px_rgba(0,0,0,0.5)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(59,130,246,0.16),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_center,rgba(79,140,255,0.22),transparent_36%)]" />
                <div className="mx-auto max-w-3xl">
                    <h1 className="relative text-4xl font-extrabold tracking-[-0.04em] text-gray-900 sm:text-5xl md:text-6xl dark:text-white">
                        Discover, Track & Win <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent dark:from-blue-300 dark:to-blue-500">Hackathons</span>
                    </h1>
                    <p className="relative mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg md:text-xl dark:text-gray-300">
                        HackDekh is your premium, developer-first platform to find, organize, and conquer hackathons from all major platforms—Devfolio, Unstop, Devpost, MLH, and more.
                    </p>
                    <div className="relative mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <a
                    href="/hackathons"
                    className="inline-flex w-full items-center justify-center rounded-full border border-blue-500/35 bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_32px_rgba(59,130,246,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-[0_18px_40px_rgba(59,130,246,0.32)] dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400 sm:w-auto"
                >
                    Explore Hackathons
                </a>
                <a
                    href="/teams"
                    className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white/80 px-7 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-100 hover:text-gray-900 dark:border-[#2A2A30] dark:bg-white/3 dark:text-gray-200 dark:hover:border-blue-400/35 dark:hover:bg-white/9 dark:hover:text-white sm:w-auto"
                >
                    Create Your Team
                </a>
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