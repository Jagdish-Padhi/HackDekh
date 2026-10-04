import { motion, useReducedMotion } from "framer-motion";
import { MessageSquareText } from "lucide-react";

const reflections = [
  {
    event: "Odoo Hackathon 2026",
    team: "Jagdish & Saman",
    tag: "Winner 🏆",
    note: "Full-stack module integration completed hours ahead of the deadline. Jury loved the clean business logic, realtime synchronization, and instant ERP deployment.",
  },
  {
    event: "Far Away Hackathon (Japan)",
    team: "Jagdish & Twinkle",
    tag: "Finalist 🇯🇵",
    note: "Selected for Tokyo on-site finals. Live hardware-software bridge demo pitched before international jury; commended on architecture elegance.",
  },
  {
    event: "Google Solution Challenge",
    team: "Esc(Reality) • Jagdish",
    tag: "Top 100 🏆",
    note: "UN SDG alignment and scalable cloud microservice design scored high in global top 100 evaluation. Recommended latency benchmarks for final review.",
  },
];

export default function ReflectionScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
      <div className="flex flex-col gap-2">
        {reflections.map((r, idx) => (
          <motion.div
            key={r.event}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: idx * 0.08, ease: "easeOut" }}
            className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-xs dark:border-zinc-800/90 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <MessageSquareText className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                  {r.event}
                </span>
              </div>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[8.5px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {r.tag}
              </span>
            </div>

            <p className="text-[9.5px] leading-relaxed text-zinc-600 dark:text-zinc-300">
              "{r.note}"
            </p>

            <div className="mt-1.5 flex items-center justify-between border-t border-zinc-100 pt-1 dark:border-zinc-800/80 text-[8.5px] text-zinc-400">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">{r.team}</span>
              <span>Team Logged</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
