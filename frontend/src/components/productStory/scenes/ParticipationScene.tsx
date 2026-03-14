import { motion, useReducedMotion } from "framer-motion";
import {
  Award,
  ClipboardList,
  Trophy,
  type LucideIcon,
} from "lucide-react";

type TeamParticipation = {
  teamName: string;
  metrics: Array<{ label: string; value: number; icon: LucideIcon }>;
};

const participationCards: TeamParticipation[] = [
  {
    teamName: "ByteCoders",
    metrics: [
      { label: "Participated", value: 6, icon: ClipboardList },
      { label: "Won", value: 1, icon: Trophy },
      { label: "Finalist", value: 2, icon: Award },
    ],
  },
  {
    teamName: "HackNinjas",
    metrics: [
      { label: "Participated", value: 4, icon: ClipboardList },
      { label: "Won", value: 0, icon: Trophy },
      { label: "Finalist", value: 1, icon: Award },
    ],
  },
];

export default function ParticipationScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="flex h-full flex-col">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Compare participation outcomes across teams in a quick glance.
      </p>

      <div className="mt-4 grid gap-3">
        {participationCards.map((card, cardIndex) => (
          <motion.div
            key={card.teamName}
            initial={shouldReduceMotion ? { opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0.2 : 0.4,
              delay: shouldReduceMotion ? 0 : cardIndex * 0.2,
              ease: "easeOut",
            }}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                <ClipboardList className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Team {card.teamName}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {card.metrics.map((metric, metricIndex) => (
                <motion.span
                  key={`${card.teamName}-${metric.label}`}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.15 : 0.25,
                    delay: shouldReduceMotion
                      ? 0
                      : cardIndex * 0.2 + 0.15 + metricIndex * 0.15,
                    ease: "easeOut",
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <metric.icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    <span>{metric.label}: {metric.value}</span>
                  </span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
