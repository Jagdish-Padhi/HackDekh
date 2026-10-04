import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Award } from "lucide-react";

const records = [
  {
    initials: "OD",
    name: "Odoo Hackathon 2026",
    team: "Jagdish & Saman • 1st Place",
    meta: "Gandhinagar • 24h Build & Architecture",
    badge: "Winner 🏆",
    isWin: true,
  },
  {
    initials: "FA",
    name: "Far Away Hackathon",
    team: "Jagdish & Twinkle • International",
    meta: "Tokyo, Japan • On-Site Grand Finale",
    badge: "Finalist 🇯🇵",
    isWin: false,
  },
  {
    initials: "ER",
    name: "Google Solution Challenge",
    team: "Esc(Reality) • Jagdish (Lead) + 3",
    meta: "Global Evaluation • UN SDG Architecture",
    badge: "Top 100 🏆",
    isWin: true,
  },
  {
    initials: "HH",
    name: "HackHazards 2026",
    team: "Twinkle & Team • Round 2 Review",
    meta: "Online Build • Selected Top 50 Finalist",
    badge: "Top 50",
    isWin: false,
  },
];

export default function DashboardScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* 4 Stat Tiles */}
      <div className="grid grid-cols-4 gap-1.5 shrink-0">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-zinc-200/90 bg-white p-2 text-center dark:border-zinc-800/90 dark:bg-zinc-900"
        >
          <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">18</p>
          <p className="text-[8.5px] font-medium text-zinc-400">Events</p>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="rounded-xl border border-zinc-200/90 bg-white p-2 text-center dark:border-zinc-800/90 dark:bg-zinc-900"
        >
          <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">Winner 🏆</p>
          <p className="text-[8.5px] font-medium text-zinc-400">Odoo 2026</p>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="rounded-xl border border-zinc-200/90 bg-white p-2 text-center dark:border-zinc-800/90 dark:bg-zinc-900"
        >
          <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Finalist 🇯🇵</p>
          <p className="text-[8.5px] font-medium text-zinc-400">Tokyo, Japan</p>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="rounded-xl border border-zinc-200/90 bg-white p-2 text-center dark:border-zinc-800/90 dark:bg-zinc-900"
        >
          <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Top 100</p>
          <p className="text-[8.5px] font-medium text-zinc-400">Google</p>
        </motion.div>
      </div>

      {/* Evenly Spaced Records List — perfectly consistent rhythm */}
      <div className="flex flex-col gap-1.5 flex-1 justify-between">
        {records.map((r, idx) => (
          <motion.div
            key={r.name}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.12 + idx * 0.05 }}
            className="rounded-xl border border-zinc-200/90 bg-white px-2.5 py-1.5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-800 text-[9.5px] font-bold">
                  {r.initials}
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {r.name}
                  </p>
                  <p className="text-[8.5px] text-zinc-400 truncate">
                    {r.team}
                  </p>
                </div>
              </div>

              <span className="shrink-0 ml-2 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[8.5px] font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {r.isWin ? (
                  <Trophy className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Award className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                )}
                {r.badge}
              </span>
            </div>
            <p className="text-[8.5px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 mt-1 pt-1 dark:border-zinc-800/70 truncate">
              {r.meta}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
