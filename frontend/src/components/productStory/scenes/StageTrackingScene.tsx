import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Trophy } from "lucide-react";

const hackathons = [
  {
    name: "Odoo Hackathon 2026",
    team: "Jagdish & Saman",
    stages: [
      { name: "24h Architecture & Build", status: "cleared", note: "Qualified ✓" },
      { name: "Grand Jury Pitch", status: "winner", note: "Winner 🏆" },
    ],
  },
  {
    name: "Far Away Hackathon",
    team: "Jagdish & Twinkle",
    stages: [
      { name: "International Screening", status: "cleared", note: "Qualified ✓" },
      { name: "Tokyo On-Site Finals", status: "winner", note: "Finalist 🇯🇵" },
    ],
  },
  {
    name: "Google Solution Challenge",
    team: "Esc(Reality) • Jagdish",
    stages: [
      { name: "UN SDG Ideation & Prototype", status: "cleared", note: "Qualified ✓" },
      { name: "Global Evaluation", status: "winner", note: "Top 100 🏆" },
    ],
  },
  {
    name: "HackHazards 2026",
    team: "Twinkle & Team",
    stages: [
      { name: "Phase 1: Initial Prototype", status: "cleared", note: "Qualified ✓" },
      { name: "Phase 2: Jury Review", status: "winner", note: "Top 50 🏆" },
    ],
  },
];

export default function StageTrackingScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
      <div className="grid grid-cols-2 gap-2">
        {hackathons.map((hack, hIdx) => (
          <motion.div
            key={hack.name}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: hIdx * 0.08, ease: "easeOut" }}
            className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900 flex flex-col justify-between"
          >
            {/* Header */}
            <div className="border-b border-zinc-100 pb-1.5 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {hack.name}
                </p>
                <Trophy className="h-2.5 w-2.5 text-amber-500 shrink-0" />
              </div>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium truncate">
                {hack.team}
              </p>
            </div>

            {/* Stages */}
            <div className="mt-1.5 space-y-1">
              {hack.stages.map((stage, sIdx) => {
                const isWinner = stage.status === "winner";
                return (
                  <motion.div
                    key={stage.name}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: hIdx * 0.08 + sIdx * 0.06, ease: "easeOut" }}
                    className="flex items-center justify-between text-[9px]"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400 truncate pr-1">
                      {stage.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold shrink-0 ${
                        isWinner
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <CheckCircle2 className="h-2 w-2" />
                      {stage.note}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
