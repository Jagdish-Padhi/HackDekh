import FeatureCard from "../components/FeatureCard";

const HomePage = () => (
    <section className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        {/* Hero Section */}
        <div className="max-w-2xl">
            <div className="bg-brand-gradient rounded-2xl p-1 mb-6 shadow-violet">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white py-8 font-sans tracking-tight">
                    Discover, Track & Win <span className="text-violet-accent">Hackathons</span>
                </h1>
            </div>
            <p className="text-text-secondary text-lg md:text-xl mb-8 font-sans">
                HackDekh is your premium, developer-first platform to find, organize, and conquer hackathons from all major platforms—Devfolio, Unstop, Devpost, MLH, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <a
                    href="/hackathons"
                    className="bg-violet-brand hover:bg-violet-accent active:bg-violet-dark text-white font-semibold px-8 py-3 rounded-lg shadow-violet glow-violet transition text-lg"
                >
                    Explore Hackathons
                </a>
                <a
                    href="/teams"
                    className="border border-violet-brand text-violet-brand hover:bg-background-card hover:text-violet-accent px-8 py-3 rounded-lg font-semibold transition text-lg"
                >
                    Create Your Team
                </a>
            </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
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