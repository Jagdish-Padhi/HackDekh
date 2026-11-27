import { motion, useReducedMotion } from "framer-motion";
import { BellRing, Check, CheckCircle2, Users } from "lucide-react";

const trackedItems = [
  {
    name: "ETHIndia 2026",
    squad: "Esc(Reality)",
    status: "REGISTERED",
    alertOn: true,
    stages: [
      { name: "Idea Pitch", done: true },
      { name: "Prototype", active: true },
      { name: "Demo Day", done: false },
    ],
  },
  {
    name: "BuildForBharat AI",
    squad: "BharatBytes",
    status: "IN QUEUE",
    alertOn: true,
    cta: "Mark Registered",
    deadline: "Closes in 2 days",
  },
  {
    name: "HackOn Hills",
    squad: "ARJUN",
    status: "REGISTERED",
    alertOn: false,
    stages: [
      { name: "Shortlist", done: true },
      { name: "Final Round", active: true },
    ],
  },
];

export default function StageTrackingScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
      {/* Header Controls Mirror */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-800 dark:bg-zinc-800/60">
          <span className="rounded-md bg-white px-2 py-0.5 text-[9.5px] font-bold text-zinc-900 shadow-xs dark:bg-zinc-700 dark:text-zinc-100">
            In Queue (2)
          </span>
          <span className="px-2 py-0.5 text-[9.5px] font-semibold text-zinc-500 dark:text-zinc-400">
            Registered (3)
          </span>
          <span className="px-2 py-0.5 text-[9.5px] font-semibold text-zinc-500 dark:text-zinc-400">
            Finished (1)
          </span>
        </div>

        <span className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[9.5px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          All Teams ▾
        </span>
      </div>

      {/* Tracker Cards */}
      <div className="flex flex-col gap-2.5 flex-1 justify-start pt-1">
        {trackedItems.map((item, idx) => (
          <motion.div
            key={item.name}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: idx * 0.08, ease: "easeOut" }}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[11.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.name}
                </p>
                <span
                  className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${item.status === "REGISTERED"
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[8.5px] font-semibold text-zinc-600 dark:text-zinc-300">
                  <Users className="h-2.5 w-2.5" />
                  {item.squad}
                </span>

                {item.alertOn && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[8.5px] font-bold text-amber-700 dark:text-amber-300">
                    <BellRing className="h-2.5 w-2.5" /> Alert On
                  </span>
                )}
              </div>
            </div>

            {/* Right Status / Stage Dots */}
            {item.cta ? (
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {item.cta}
                </span>
                <span className="text-[8.5px] font-medium text-amber-600 dark:text-amber-400">
                  {item.deadline}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {item.stages?.map((st) => (
                  <div key={st.name} className="flex flex-col items-center gap-0.5">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${st.done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : st.active
                          ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                        }`}
                    >
                      {st.done ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </span>
                    <span className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400">
                      {st.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
