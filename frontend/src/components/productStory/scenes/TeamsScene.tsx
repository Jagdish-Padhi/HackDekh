import { motion, useReducedMotion } from "framer-motion";
import { Copy, KeyRound, Plus, Share2, Users } from "lucide-react";

const squads = [
  {
    name: "Esc(Reality)",
    code: "ESC92A",
    members: 4,
    tracked: 3,
    role: "Owner",
  },
  {
    name: "ARJUN",
    code: "ARJ41X",
    members: 3,
    tracked: 2,
    role: "Member",
  },
  {
    name: "KARNA",
    code: "KRN26B",
    members: 4,
    tracked: 4,
    role: "Owner",
  },
  {
    name: "BharatBytes",
    code: "BHB08Z",
    members: 3,
    tracked: 2,
    role: "Member",
  },
];

function initials(n: string) {
  return n.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
}

export default function TeamsScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col h-full justify-between gap-2">
      {/* Top Action Strip */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Your Squads (4)
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[9.5px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <KeyRound className="h-2.5 w-2.5 text-zinc-400" /> Join Code
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[9.5px] font-semibold text-white">
            <Plus className="h-2.5 w-2.5" /> New Squad
          </span>
        </div>
      </div>

      {/* Squad Cards */}
      <div className="flex flex-col gap-2.5 flex-1 justify-start pt-1">
        {squads.map((squad, idx) => (
          <motion.div
            key={squad.name}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: idx * 0.07, ease: "easeOut" }}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-800 text-[11px] font-bold border border-zinc-200/20 dark:border-zinc-700">
              {initials(squad.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {squad.name}
                </p>
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[8.5px] font-bold text-zinc-500 dark:text-zinc-400">
                  {squad.role}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[9.5px] text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                  {squad.members} members
                </span>
                <span>•</span>
                <span>{squad.tracked} tracked</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[9.5px] font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                #{squad.code}
                <Copy className="h-2.5 w-2.5 text-zinc-400" />
              </span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <Share2 className="h-2.5 w-2.5" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Join Hint */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.24, ease: "easeOut" }}
        className="flex items-center justify-between rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/40 shrink-0"
      >
        <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          Share a 6-character code or public schedule link with teammates.
        </p>
        <span className="text-[9.5px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
          /squad/ESC92A
        </span>
      </motion.div>
    </div>
  );
}
