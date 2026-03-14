import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delay?: number;
  className?: string;
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  delay = 0,
  className = "",
}: MetricCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: shouldReduceMotion ? 0.18 : 0.35,
        delay: shouldReduceMotion ? 0 : delay,
        ease: "easeOut",
      }}
      className={`rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      {Icon ? (
        <span className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </span>
      ) : null}

      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </motion.div>
  );
}
