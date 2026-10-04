import { motion, useReducedMotion } from "framer-motion";
import { Crown, Plus, Trophy } from "lucide-react";

const teams = [
  {
    name: "Odoo Champions",
    members: "Jagdish & Saman",
    count: 2,
    badge: "Winner 🏆",
    event: "Odoo Hackathon 2026",
    tag: "1st Place",
  },
  {
    name: "Far Away Team",
    members: "Jagdish & Twinkle",
    count: 2,
    badge: "Finalist 🇯🇵",
    event: "Far Away Hackathon",
    tag: "Tokyo, Japan",
  },
  {
    name: "Esc(Reality)",
    members: "Jagdish (Lead) + 3",
    count: 4,
    badge: "Top 100 🏆",
    event: "Google Solution Challenge",
    tag: "Global Top 100",
  },
  {
    name: "HackHazards Team",
    members: "Twinkle (Lead) + 3",
    count: 4,
    badge: "Top 50",
    event: "HackHazards 2026",
    tag: "Round 2 Finalist",
  },
];

function initials(n: string) {
  return n.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
}

export default function TeamsScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col h-full justify-between gap-1.5">
      <div className="flex flex-col gap-2">
        {teams.map((team, idx) => (
          <motion.div
            key={team.name}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: idx * 0.07, ease: "easeOut" }}
            className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900"
          >
            {/* Team Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-800 text-xs font-bold border border-zinc-700/40">
              {initials(team.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {team.name}
                </p>
                <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 truncate">
                  • {team.event}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Crown className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">{team.members}</span>
                </span>
                <span className="text-zinc-400">• {team.tag}</span>
              </div>
            </div>

            {/* Achievement Badge */}
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[9.5px] font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <Trophy className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                {team.badge}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Team Action */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.28, ease: "easeOut" }}
        className="flex items-center gap-2.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-1.5 cursor-pointer transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
          <Plus className="h-3 w-3 text-zinc-400" />
        </div>
        <p className="text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400">
          Assemble teams with a single invitation link
        </p>
      </motion.div>
    </div>
  );
}
