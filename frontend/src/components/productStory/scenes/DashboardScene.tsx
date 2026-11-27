import { motion, useReducedMotion } from "framer-motion";
import { BellRing, Calendar, CheckCircle2, Clock, Flag, Users } from "lucide-react";

const upcomingDeadlines = [
  {
    stage: "Prototype Submission",
    event: "ETHIndia 2026 • Esc(Reality)",
    date: "29 Nov 2026",
    due: "Tomorrow",
    urgent: true,
  },
  {
    stage: "Registration Cutoff",
    event: "BuildForBharat AI • BharatBytes",
    date: "30 Nov 2026",
    due: "2 days left",
    urgent: true,
  },
  {
    stage: "Finalist Pitch Deck",
    event: "HackOn Hills • ARJUN",
    date: "03 Dec 2026",
    due: "5 days left",
    urgent: false,
  },
  {
    stage: "Demo Day Video",
    event: "HackHazards • KARNA",
    date: "07 Dec 2026",
    due: "9 days left",
    urgent: false,
  },
];

const counters = [
  { label: "In Queue", value: "4", icon: Clock },
  { label: "Registered", value: "2", icon: CheckCircle2 },
  { label: "Pending Stages", value: "4", icon: Flag },
  { label: "Squads", value: "2", icon: Users },
];

export default function DashboardScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-[1.7fr_1fr] gap-3 h-full overflow-hidden items-stretch">
      {/* Left 75%: Upcoming Stages & Deadlines */}
      <div className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Upcoming Stages &amp; Deadlines
            </span>
          </div>
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[8.5px] font-semibold text-zinc-600 dark:text-zinc-300">
            4 pending
          </span>
        </div>

        <div className="relative border-l border-zinc-200 dark:border-zinc-800 pl-3.5 ml-1.5 space-y-3 pt-0.5">
          {upcomingDeadlines.map((item, idx) => (
            <motion.div
              key={item.stage}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.06 }}
              className="relative"
            >
              <span
                className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${item.urgent ? "bg-amber-500" : "bg-blue-600"
                  }`}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.stage}
                </p>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${item.urgent
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                >
                  {item.due}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                {item.event}
              </p>
              <p className="text-[8px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                Deadline: {item.date}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right 25%: Compact Horizontal Counter Strips */}
      <div className="flex flex-col gap-2">
        {counters.map((c, idx) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 * idx }}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                <Icon className="h-3 w-3 shrink-0 text-zinc-400" />
                {c.label}
              </span>
              <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {c.value}
              </span>
            </motion.div>
          );
        })}

        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.24 }}
          className="mt-auto rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-zinc-800 dark:text-zinc-200">
            <BellRing className="h-3 w-3 text-amber-500 shrink-0" />
            <span>24h Alerts Active</span>
          </div>
          <p className="mt-1 text-[8.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Email &amp; Discord reminders armed for 3 upcoming cutoffs.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
