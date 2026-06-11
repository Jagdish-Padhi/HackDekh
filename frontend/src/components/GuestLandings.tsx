import { Link } from "react-router-dom";
import { 
  Users, 
  Shield, 
  Calendar, 
  Flag, 
  BookOpen, 
  Trophy, 
  ArrowRight, 
  Lock 
} from "lucide-react";

export function PublicTeamsLanding() {
  return (
    <div className="relative min-h-[75vh] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Dynamic ambient backgrounds */}
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_40%),radial-gradient(circle_at_right,_rgba(16,165,233,0.05),_transparent_35%)]" />
      <div className="pointer-events-none absolute top-10 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[80px] dark:bg-blue-500/15 animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[80px] dark:bg-indigo-500/15 animate-[pulse_8s_ease-in-out_infinite]" />
      
      <div className="relative mx-auto max-w-4xl text-center space-y-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/8 dark:bg-blue-500/15 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <Users className="h-4 w-4" />
          <span>Multi-Team Operations</span>
        </div>
        
        <div className="space-y-5">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl leading-none">
            Command & Sync Your <span className="bg-linear-to-r from-blue-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-sky-400 font-extrabold">Hackathon Squads</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-650 dark:text-zinc-300">
            Ditch the chaotic group chats, scattered sheets, and lost links. Bring your teams under a unified collaborative hub where rosters, roles, and milestones align in perfect sync.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 text-left">
          {/* Card 1 */}
          <div className="group relative rounded-[2rem] border border-zinc-200 bg-white/45 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-450 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Squad Directories</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Build your dream rosters, delegate ownership, and track every collaborator's participation history across all campaigns.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-[2rem] border border-zinc-200 bg-white/45 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-450 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Milestone Alignment</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Keep everyone laser-focused. Sync round submissions, project deliverables, and critical timelines in one central interface.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group relative rounded-[2rem] border border-zinc-200 bg-white/45 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-450 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Frictionless Onboarding</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Bring co-founders and builders on board in seconds with fast, single-use invite codes and custom magic links.
            </p>
          </div>
        </div>

        {/* Locked Feature CTA */}
        <div className="relative overflow-hidden rounded-[2.25rem] border border-zinc-250 bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-white/40 p-8 dark:border-zinc-800 dark:from-zinc-900/40 dark:via-zinc-900/20 dark:to-zinc-950/40 shadow-xs sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl animate-[pulse_5s_ease-in-out_infinite]" />
          <div className="flex items-start gap-4 text-left relative z-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200 text-blue-650 dark:bg-zinc-900 dark:border-zinc-800 dark:text-blue-450 shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Ready to align your squad?</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-1 leading-normal">
                Unlock collaborative workspaces, roles, invite codes, and stage timelines for your team.
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 relative z-10 shrink-0">
            <Link
              to="/signup?returnTo=/teams"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-xs font-bold shadow-md shadow-blue-500/15 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?returnTo=/teams"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 px-5 py-3 text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicDashboardLanding() {
  return (
    <div className="relative min-h-[75vh] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Dynamic ambient backgrounds */}
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_40%),radial-gradient(circle_at_right,_rgba(16,165,233,0.05),_transparent_35%)]" />
      <div className="pointer-events-none absolute top-10 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[80px] dark:bg-blue-500/15 animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[80px] dark:bg-indigo-500/15 animate-[pulse_8s_ease-in-out_infinite]" />
      
      <div className="relative mx-auto max-w-4xl text-center space-y-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/8 dark:bg-blue-500/15 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <Trophy className="h-4 w-4" />
          <span>Performance Intelligence</span>
        </div>
        
        <div className="space-y-5">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl leading-none">
            Accelerate Your <span className="bg-linear-to-r from-blue-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-sky-400 font-extrabold">Hackathon Win Rate</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-655 dark:text-zinc-300">
            Track your standing from registration to the final pitch. Log milestones, capture critical judge reflections, and build a winning playbook using performance intelligence.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 text-left">
          {/* Card 1 */}
          <div className="group relative rounded-[2rem] border border-zinc-200 bg-white/45 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-450 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Flag className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Visual Milestones</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Track your standing at a glance. Filter active campaigns, finalist runs, and podium finishes across all your teams.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-[2rem] border border-zinc-200 bg-white/45 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-450 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Strategic Learnings</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Turn setbacks into success. Document judge feedback, log team lessons, and build an institutional playbook for the next run.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group relative rounded-[2rem] border border-zinc-200 bg-white/45 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/20 dark:hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-455 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">Actionable Timelines</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed">
              Visualize the entire route. Transition stages instantly from applied to finalist, keeping notes on what worked and what didn't.
            </p>
          </div>
        </div>

        {/* Locked Feature CTA */}
        <div className="relative overflow-hidden rounded-[2.25rem] border border-zinc-250 bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-white/40 p-8 dark:border-zinc-800 dark:from-zinc-900/40 dark:via-zinc-900/20 dark:to-zinc-950/40 shadow-xs sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl animate-[pulse_5s_ease-in-out_infinite]" />
          <div className="flex items-start gap-4 text-left relative z-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200 text-blue-650 dark:bg-zinc-900 dark:border-zinc-800 dark:text-blue-450 shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">Unlock your performance analytics</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-1 leading-normal">
                Sign up to create your dashboard, manage milestones, log lessons, and view performance charts.
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3 relative z-10 shrink-0">
            <Link
              to="/signup?returnTo=/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 text-xs font-bold shadow-md shadow-blue-500/15 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              Unlock Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?returnTo=/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 px-5 py-3 text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
