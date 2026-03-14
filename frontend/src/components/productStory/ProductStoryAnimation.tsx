import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  ClipboardList,
  Flag,
  MessageSquareText,
  type LucideIcon,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import DashboardScene from "./scenes/DashboardScene";
import ParticipationScene from "./scenes/ParticipationScene";
import ReflectionScene from "./scenes/ReflectionScene";
import StageTrackingScene from "./scenes/StageTrackingScene";
import TeamsScene from "./scenes/TeamsScene";
import useSceneTimeline from "./useSceneTimeline";

type StoryScene = {
  id: number;
  title: string;
  icon: LucideIcon;
  component: ComponentType;
};

const SCENE_DURATION_MS = 5200;

const storyScenes: StoryScene[] = [
  {
    id: 0,
    title: "Multiple Teams Mess-Up Solved",
    icon: Users,
    component: TeamsScene,
  },
  {
    id: 1,
    title: "Track Every Hackathon Participation",
    icon: ClipboardList,
    component: ParticipationScene,
  },
  {
    id: 2,
    title: "Every Hackathon Stage Recorded",
    icon: Flag,
    component: StageTrackingScene,
  },
  {
    id: 3,
    title: "Reflect and Learn From Rejections",
    icon: MessageSquareText,
    component: ReflectionScene,
  },
  {
    id: 4,
    title: "Complete Hackathon Analytics",
    icon: BarChart3,
    component: DashboardScene,
  },
];

export default function ProductStoryAnimation() {
  const shouldReduceMotion = useReducedMotion();
  const scene = useSceneTimeline(storyScenes.length, SCENE_DURATION_MS);
  const activeScene = storyScenes[scene];
  const ActiveScene = activeScene.component;
  const SceneIcon = activeScene.icon;
  const progress = ((scene + 1) / storyScenes.length) * 100;

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.2 : 0.55, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-115"
    >
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-4xl bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(79,140,255,0.18),transparent_70%)]" />

      <div className="relative h-117.5 overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.08),transparent_36%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(79,140,255,0.12),transparent_38%)]" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <SceneIcon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>

              <h3 className="whitespace-nowrap text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
                {activeScene.title}
              </h3>
            </div>

            <span className="hidden shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 tabular-nums dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 sm:inline-flex">
              {String(scene + 1).padStart(2, "0")}/05
            </span>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: shouldReduceMotion ? 0.12 : 0.4, ease: "easeInOut" }}
            />
          </div>

          <div className="relative mt-5 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={storyScenes[scene].id}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: shouldReduceMotion ? 0.15 : 0.34, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <ActiveScene />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
