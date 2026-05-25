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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_40%),radial-gradient(circle_at_right,_rgba(16,165,233,0.05),_transparent_35%)] pointer-events-none" />
      
      <div className="relative mx-auto max-w-4xl text-center space-y-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/8 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <Users className="h-4 w-4" />
          Collaborative Workspace
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
            Unified Team Workspace
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Collaborate, invite teammates, and track collective progress across all hackathons. Replace scattered files and messages with a single platform asset.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Team Rosters</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Create unlimited teams, assign owners, and manage member profiles in a clean directory.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Shared Milestones</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Keep the entire roster aligned on round schedules, submission tasks, and stage deadlines.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Invite Links</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Instantly generate secure single-use invitation tokens to bring teammates on board.
            </p>
          </div>
        </div>

        <div className="rounded-[2.25rem] border border-dashed border-zinc-200 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/10 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Locked Feature</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You must sign up or login to access team workspaces and generate invitations.
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3">
            <Link
              to="/signup?returnTo=/teams"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Create Team Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?returnTo=/teams"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_40%),radial-gradient(circle_at_right,_rgba(16,165,233,0.05),_transparent_35%)] pointer-events-none" />
      
      <div className="relative mx-auto max-w-4xl text-center space-y-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/8 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <Trophy className="h-4 w-4" />
          Lifecycle Tracking
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
            Ultimate Hackathon Tracker
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Monitor milestones, record reflections, and avoid technical debt in one central operating panel. Stay on top of multiple applications.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Flag className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Global Progress</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Filter by status: Active, Finalist, Won, or Eliminated, across all your participations.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Reflection Logs</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Capture learnings on every elimination, translating losses into insights to build team strength.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/70 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">Stage Timeline</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Interactive right-side drawer allows you to cycle results (Qualified/Rejected) and log inline notes.
            </p>
          </div>
        </div>

        <div className="rounded-[2.25rem] border border-dashed border-zinc-200 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/10 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Locked Feature</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You must sign up or login to build a dashboard and track participation records.
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-3">
            <Link
              to="/signup?returnTo=/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Unlock Tracker Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login?returnTo=/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
