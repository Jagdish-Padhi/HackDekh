import FeatureCard from "../components/FeatureCard";
import {
    BarChart3,
    ClipboardCheck,
    Lightbulb,
    Search,
    Users,
    Workflow,
} from "lucide-react";
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

        <div className="w-full max-w-6xl space-y-7">
            <div className="mx-auto max-w-3xl text-center">
                <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                    Core Capabilities
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-zinc-900 sm:text-4xl dark:text-zinc-100">
                    Built for Hackathon Team Performance
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base dark:text-zinc-400">
                    Discover hackathons, run team workflows, and improve results from one unified system.
                </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
                <FeatureCard
                    icon={Search}
                    title="Discover Hackathons in One Place"
                    desc="Automatically aggregate hackathons from Devfolio, Unstop, and more so you never miss an opportunity."
                />
                <FeatureCard
                    icon={Users}
                    title="Manage Multiple Hackathon Teams"
                    desc="Create and manage different teams, assign leaders, and track members across participations."
                />
                <FeatureCard
                    icon={ClipboardCheck}
                    title="Track Every Hackathon Journey"
                    desc="Record which teams participated in which hackathons and monitor progress across stages."
                />
                <FeatureCard
                    icon={Workflow}
                    title="Track Every Stage"
                    desc="Keep a record of each stage: applied, qualified, rejected, finalist, or winner."
                />
                <FeatureCard
                    icon={Lightbulb}
                    title="Capture Reflections After Every Hackathon"
                    desc="Teams can record learnings, mistakes, and insights to improve future performance."
                />
                <FeatureCard
                    icon={BarChart3}
                    title="Team Performance Dashboard"
                    desc="View participations, wins, finalist counts, and identify your most successful teams."
                />
            </div>
        </div>
    </section>
);



export default HomePage;