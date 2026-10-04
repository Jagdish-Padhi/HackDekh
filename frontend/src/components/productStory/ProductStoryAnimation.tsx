import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  BarChart3,
  Compass,
  Flag,
  Lock,
  MessageSquareText,
  type LucideIcon,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import BrowseScene from "./scenes/BrowseScene";
import DashboardScene from "./scenes/DashboardScene";
import ReflectionScene from "./scenes/ReflectionScene";
import StageTrackingScene from "./scenes/StageTrackingScene";
import TeamsScene from "./scenes/TeamsScene";

type StoryScene = {
  id: number;
  shortLabel: string;
  icon: LucideIcon;
  component: ComponentType;
  sceneTitle: string;
};

const SCENE_DURATION_MS = 6500;

const storyScenes: StoryScene[] = [
  { id: 0, shortLabel: "Discovery",   icon: Compass,           component: BrowseScene,        sceneTitle: "Live Hackathons • Devfolio & Unstop" },
  { id: 1, shortLabel: "Teams",       icon: Users,             component: TeamsScene,         sceneTitle: "Team Workspace & Roles" },
  { id: 2, shortLabel: "Stages",      icon: Flag,              component: StageTrackingScene, sceneTitle: "Stage-by-Stage Milestone Tracker" },
  { id: 3, shortLabel: "Reflections", icon: MessageSquareText, component: ReflectionScene,    sceneTitle: "Judge Feedback & Learnings" },
  { id: 4, shortLabel: "Analytics",   icon: BarChart3,         component: DashboardScene,     sceneTitle: "Performance & Analytics" },
];

export default function ProductStoryAnimation() {
  const shouldReduceMotion = useReducedMotion();
  const [scene, setScene] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setScene((prev) => (prev + 1) % storyScenes.length);
    }, SCENE_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [scene]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 30, stiffness: 220 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -2]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 2]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const active = storyScenes[scene];
  const ActiveScene = active.component;

  return (
    <div className="relative w-full [perspective:1200px]">
      <motion.div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white
          shadow-[0_16px_40px_-8px_rgba(0,0,0,0.12)]
          dark:border-zinc-800/90 dark:bg-zinc-950
          dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.65)]"
      >
        {/* Browser Chrome Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100
          bg-zinc-50/90 px-3.5 py-1.5 dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-200/80
              bg-white px-2.5 py-0.5 text-[10px] text-zinc-500
              dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <Lock className="h-2 w-2 text-emerald-500 shrink-0" />
              <span className="font-mono">hackdekh.jdecodes.tech</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9.5px] font-semibold text-zinc-400 dark:text-zinc-500 hidden sm:inline">Live</span>
          </div>
        </div>

        {/* Clean Theme Tab Navigation — no loud colors */}
        <div className="flex items-center justify-between border-b border-zinc-100
          bg-zinc-50/40 px-2.5 py-1 overflow-x-auto no-scrollbar
          dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div className="flex items-center gap-1">
            {storyScenes.map((s, idx) => {
              const isActive = idx === scene;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setScene(idx)}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px]
                    font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-2.5 w-2.5 shrink-0" />
                  <span>{s.shortLabel}</span>
                </button>
              );
            })}
          </div>


        </div>

        {/* Scene Body — contained height (18.5rem) to ensure 1-view fit without page scroll */}
        <div className="relative bg-zinc-50/30 dark:bg-zinc-950" style={{ height: "22.5rem" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute inset-0 p-3 overflow-hidden flex flex-col"
            >
              <ActiveScene />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
