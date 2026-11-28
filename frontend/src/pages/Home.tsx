import { motion } from "framer-motion";
import FeatureCard from "../components/FeatureCard";
import {
    BarChart3,
    Calendar,
    Compass,
    Lightbulb,
    Search,
    ShieldCheck,
    Users,
    Workflow,
    ArrowRight,
} from "lucide-react";
import ProductStoryAnimation from "../components/productStory/ProductStoryAnimation";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSeo } from "../utils/useSeo";

const HomePage = () => {
    const { isAuthenticated, isLoading } = useAuth();

    useSeo({
        title: "HackDekh — Discover Hackathons, Check Fit & Track Deadlines",
        description:
            "Find live hackathons from Devfolio, Unstop, Devpost, MLH, and Hack2Skill in one feed. Check if an event fits your city and prize goals, get 24h deadline alerts, and sync with your squad.",
        path: "/",
    });

    if (!isLoading && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="relative flex flex-col items-center justify-center gap-24 sm:gap-32 lg:gap-36 pt-0 pb-16 sm:pb-20 lg:pb-28 w-full">
            {/* 1. Hero Section */}
            <section className="relative w-full min-h-[calc(100vh-4.25rem)] lg:h-[calc(100vh-4.25rem)] flex items-center justify-center">
                <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ willChange: "transform, opacity" }}
                        className="relative text-center lg:text-left flex flex-col items-center lg:items-start lg:-translate-y-5"
                    >
                        {/* Pure Clean Industry-Grade Headline Lockup */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.65rem] font-extrabold tracking-[-0.035em] leading-[1.15] text-zinc-900 dark:text-white text-center lg:text-left select-none flex flex-col gap-2 sm:gap-2.5 lg:gap-3">
                            <span className="block whitespace-nowrap">Discover Faster.</span>
                            <span className="block whitespace-nowrap">Build Better.</span>
                            <span className="relative inline-block w-fit whitespace-nowrap pb-4">
                                <span className="moving-logo-gradient">Win Together.</span>
                                {/* Handwritten pen scribble underline — cleanly below 'g' */}
                                <svg
                                    viewBox="0 0 260 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="absolute -bottom-2.5 left-0 w-full overflow-visible pointer-events-none text-blue-500/90 dark:text-blue-400/90"
                                    aria-hidden="true"
                                >
                                    <motion.path
                                        d="M 2 6 C 50 3, 130 3, 258 5 C 195 8.5, 90 11, 18 13 C 90 12, 185 10, 248 11"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 0.85, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                </svg>
                            </span>
                        </h1>

                        <div className="mt-10 lg:mt-11 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <Link
                                to="/hackathons"
                                className="btn-brand-primary w-full sm:w-auto rounded-lg px-7 py-3.5 text-base gap-2"
                            >
                                <span>Explore Hackathons</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                to="/signup?returnTo=/teams"
                                className="btn-brand-secondary w-full sm:w-auto rounded-lg px-7 py-3.5 text-base gap-2"
                            >
                                Create Your Team
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                        style={{ willChange: "transform, opacity" }}
                        className="relative mx-auto w-full max-w-2xl lg:max-w-none flex justify-center lg:justify-end"
                    >
                        <ProductStoryAnimation />
                    </motion.div>
                </div>
            </section>

            {/* 2. Team Collaboration Highlights (Scroll Reveal) */}
            <motion.section
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
                className="w-full space-y-10"
            >
                <div className="mx-auto max-w-3xl text-center space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
                        Stop losing track of hackathons in group chats
                    </h2>
                    <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                        No more buried Devfolio links, forgotten Unstop cutoffs, or asking your squad whether anyone actually registered.
                    </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-3 text-left">
                    {/* Highlight 1 */}
                    <div className="group premium-border-card relative overflow-hidden rounded-xl border border-zinc-200 bg-white/75 p-7 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/75 dark:hover:border-zinc-700">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Users className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            One Squad, Same Page
                        </h3>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Share a quick squad code so your teammates see the exact same tracked hackathons and deadlines, with no more &ldquo;did we apply?&rdquo; texts.
                        </p>
                    </div>

                    {/* Highlight 2 */}
                    <div className="group premium-border-card relative overflow-hidden rounded-xl border border-zinc-200 bg-white/75 p-7 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/75 dark:hover:border-zinc-700">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            One-Click Track & Stage Flow
                        </h3>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Save any hackathon in one click, mark it registered once you apply, and update each round cleanly as results drop.
                        </p>
                    </div>

                    {/* Highlight 3 */}
                    <div className="group premium-border-card relative overflow-hidden rounded-xl border border-zinc-200 bg-white/75 p-7 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/75 dark:hover:border-zinc-700">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            &ldquo;Worth It?&rdquo; Fit Check
                        </h3>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            Set your city, preferred mode, and minimum prize once. Instantly see if an event is worth your weekend and travel.
                        </p>
                    </div>
                </div>
            </motion.section>

            {/* 3. Core Capabilities Grid (Scroll Reveal) */}
            <motion.section
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
                className="w-full space-y-10"
            >
                <div className="mx-auto max-w-3xl text-center space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
                        Built for how students actually compete
                    </h2>
                    <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                        Everything you need from finding the right event to tracking every round with your squad.
                    </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    <FeatureCard
                        icon={Search}
                        title="All Major Platforms, One Feed"
                        desc="Live listings synced daily from Devfolio, Unstop, Devpost, MLH, and Hack2Skill. Filter by mode, city, team size, prize, and deadline."
                    />
                    <FeatureCard
                        icon={Users}
                        title="Solo or Squad Tracking"
                        desc="Start tracking solo with one click, or switch between squads in your Tracker header when you team up with different friends."
                    />
                    <FeatureCard
                        icon={Workflow}
                        title="Clean Stage Pipeline"
                        desc="Move hackathons from In Queue to Registered and Finished, with every upcoming round and submission cutoff clear at a glance."
                    />
                    <FeatureCard
                        icon={Lightbulb}
                        title="Deadline-First Dashboard"
                        desc="See your upcoming stage deadlines and active counts on one screen so your team never misses a submission window."
                    />
                    <FeatureCard
                        icon={Compass}
                        title="Shareable Event & Squad Links"
                        desc="Send a clean HackDekh link for any hackathon or public squad schedule, showing prizes, deadlines, and team size without login walls."
                    />
                    <FeatureCard
                        icon={BarChart3}
                        title="24h Deadline Alerts"
                        desc="Toggle reminders in one click and get a heads-up 24 hours before cutoffs via Email, Discord, or Telegram."
                    />
                </div>
            </motion.section>

            {/* 4. Bottom CTA Section */}
            <motion.section
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
                className="w-full"
            >
                <div className="group premium-border-card relative overflow-hidden rounded-xl border border-zinc-200 bg-white/75 p-8 sm:p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/75 backdrop-blur-md">
                    <div className="mx-auto max-w-2xl space-y-4">
                        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
                            Ready for your next hackathon?
                        </h2>
                        <p className="text-base text-zinc-600 dark:text-zinc-400">
                            Find events worth your weekend, sync with your squad using a 6-digit code, and track every deadline in one place.
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/signup"
                                className="btn-brand-primary w-full sm:w-auto rounded-lg px-7 py-3.5 text-base gap-2"
                            >
                                <span>Get Started Free</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                to="/hackathons"
                                className="btn-brand-secondary w-full sm:w-auto rounded-lg px-7 py-3.5 text-base"
                            >
                                Browse Hackathons
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.section>
        </div>
    );
};

export default HomePage;
