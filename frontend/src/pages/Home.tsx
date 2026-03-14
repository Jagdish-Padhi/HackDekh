import FeatureCard from "../components/FeatureCard";

const HomePage = () => (
    <section className="flex min-h-[76vh] flex-col items-center justify-center gap-14 py-6 text-center sm:py-10">
        <div className="w-full max-w-5xl">
            <div className="theme-hero rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14 md:px-14">
                <div className="mx-auto max-w-3xl">
                    <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl md:text-6xl">
                        Discover, Track & Win <span className="accent-text">Hackathons</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg md:text-xl">
                        HackDekh is your premium, developer-first platform to find, organize, and conquer hackathons from all major platforms—Devfolio, Unstop, Devpost, MLH, and more.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <a
                    href="/hackathons"
                    className="theme-button-primary w-full px-7 py-3.5 text-base font-semibold sm:w-auto"
                >
                    Explore Hackathons
                </a>
                <a
                    href="/teams"
                    className="theme-button-secondary w-full px-7 py-3.5 text-base font-semibold sm:w-auto"
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