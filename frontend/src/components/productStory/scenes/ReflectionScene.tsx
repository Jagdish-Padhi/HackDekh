import { motion, useReducedMotion } from "framer-motion";
import { MessageSquareText } from "lucide-react";
import HackathonCard from "../shared/HackathonCard";

const reflections = [
  {
    author: "Rahul",
    note: "We should have validated the problem earlier.",
  },
  {
    author: "Priya",
    note: "Our prototype needed better UX.",
  },
];

export default function ReflectionScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="flex h-full flex-col">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Capture rejection insights while context is fresh so the next attempt is smarter.
      </p>

      <div className="mt-4">
        <HackathonCard name="Devfolio Hackathon" icon={MessageSquareText}>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Reflection Notes</p>
          <div className="mt-2 space-y-2">
            {reflections.map((reflection, index) => (
              <motion.div
                key={reflection.author}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0.2 : 0.35,
                  delay: shouldReduceMotion ? 0 : index * 0.35,
                  ease: "easeOut",
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {reflection.author}
                </p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-200">"{reflection.note}"</p>
              </motion.div>
            ))}
          </div>
        </HackathonCard>
      </div>
    </section>
  );
}
