import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Users, Crosshair, BarChart3, Settings, Check } from "lucide-react";

export type TabGuideKey = "hackathons" | "teams" | "tracker" | "dashboard" | "settings";

interface GuideStep {
  title: string;
  description: string;
}

interface TabGuideConfig {
  key: TabGuideKey;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  steps: GuideStep[];
}

const TAB_GUIDES: Record<TabGuideKey, TabGuideConfig> = {
  hackathons: {
    key: "hackathons",
    title: "Hackathons Guide",
    subtitle: "Discover, filter, and track hackathons across global platforms.",
    icon: Trophy,
    steps: [
      {
        title: "1. Explore & Filter",
        description: "Search hackathons by keyword or filter by platform (Devpost, Unstop, Devfolio, MLH) and mode (Online, In-Person, Hybrid).",
      },
      {
        title: "2. Inspect Schedule & Details",
        description: "Open any hackathon card to inspect registration windows, milestone deadlines, prize pools, and the official event website.",
      },
      {
        title: "3. Track to Team Workspace",
        description: "Click Track on any card to attach the hackathon to one of your teams, creating structured stage tracking in your workspace.",
      },
      {
        title: "4. Track to Teams",
        description: "Tracked hackathons automatically populate your active workspaces and synchronize stage milestones to your Tracker timeline.",
      },
    ],
  },
  teams: {
    key: "teams",
    title: "Teams & Workspace Guide",
    subtitle: "Form collaborative squads, invite teammates, and manage collective hackathons.",
    icon: Users,
    steps: [
      {
        title: "1. Create or Join a Team",
        description: "Click Create Team to set up a new squad with GitHub teammate search, or use an invite code to join an existing team.",
      },
      {
        title: "2. Invite Collaborators",
        description: "Send invitation emails to teammates and review pending invitations from your team workspace.",
      },
      {
        title: "3. Open Team Workspace",
        description: "Select any team card to open its dedicated workspace, showing shared hackathons, milestones, and stage reflections.",
      },
      {
        title: "4. Track Milestone Progress",
        description: "Update stage evaluation results (Qualified, Pending, Rejected) and log milestone notes to coordinate deliverables.",
      },
    ],
  },
  tracker: {
    key: "tracker",
    title: "Hackathon Tracker Guide",
    subtitle: "Monitor active timelines, stage deadlines, and competition outcomes.",
    icon: Crosshair,
    steps: [
      {
        title: "1. Review Queues",
        description: "Use the upper tabs to switch between In Queue (upcoming hackathons), Registered (active participations), and Finished.",
      },
      {
        title: "2. Track Submission Deadlines",
        description: "Follow milestone dates in chronological order—including registration close, round deliverables, and result dates.",
      },
      {
        title: "3. Update Participation Outcomes",
        description: "When results are announced, transition participations to Won, Finalist, or Eliminated to maintain your competition portfolio.",
      },
      {
        title: "4. Untrack Inactive Events",
        description: "If your squad decides not to participate, safely untrack the hackathon to keep your timeline clean and focused.",
      },
    ],
  },
  dashboard: {
    key: "dashboard",
    title: "Dashboard Overview Guide",
    subtitle: "Your central command center for upcoming deadlines, metrics, and reflections.",
    icon: BarChart3,
    steps: [
      {
        title: "1. Monitor Key Metrics",
        description: "Review your tracking queue size, active registrations, pending stage reflections, and completed outcomes in one clean view.",
      },
      {
        title: "2. Upcoming Stage Deadlines",
        description: "Check the timeline list sorted by days remaining to stay ahead of upcoming submission cutoffs and evaluation rounds.",
      },
      {
        title: "3. Complete Stage Reflections",
        description: "When milestone stages conclude, submit team reflections and review notes logged by your teammates.",
      },
      {
        title: "4. Outcomes & Results",
        description: "Review finalized competition outcomes (Won, Finalist, Eliminated) to maintain your team portfolio.",
      },
    ],
  },
  settings: {
    key: "settings",
    title: "Account Settings Guide",
    subtitle: "Manage your profile information, password security, and interface appearance.",
    icon: Settings,
    steps: [
      {
        title: "1. Profile Details",
        description: "Update your full display name and contact email address visible across your teams.",
      },
      {
        title: "2. Password Security",
        description: "Update your account password with real-time strength validation to ensure account security.",
      },
      {
        title: "3. Appearance & Theme",
        description: "Toggle between Light and Dark modes to match your preferred workspace aesthetic.",
      },
      {
        title: "4. Danger Zone",
        description: "Safely review account actions or manage permanent account deletion options when needed.",
      },
    ],
  },
};

export const getTabGuideKeyFromPath = (pathname: string): TabGuideKey => {
  if (pathname.startsWith("/teams")) return "teams";
  if (pathname.startsWith("/tracker")) return "tracker";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/settings")) return "settings";
  return "hackathons";
};

interface TabGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabKey: TabGuideKey;
}

export default function TabGuideModal({ isOpen, onClose, tabKey }: TabGuideModalProps) {
  const guide = TAB_GUIDES[tabKey] || TAB_GUIDES.hackathons;
  const Icon = guide.icon;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 z-10"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {guide.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:border-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
                aria-label="Close guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step-by-Step Flow */}
            <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {guide.steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3.5 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-950/40"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500 font-bold text-[11px] mt-0.5">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {step.title}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500 cursor-pointer dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Got it</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
