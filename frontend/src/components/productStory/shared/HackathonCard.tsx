import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

export type StageStatus = "pending" | "qualified" | "rejected";

type HackathonStage = {
  name: string;
  status: StageStatus;
  delay?: number;
};

type HackathonCardProps = {
  name: string;
  stages?: HackathonStage[];
  children?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  stageDelayOffset?: number;
};

const statusLabel: Record<StageStatus, string> = {
  pending: "Pending",
  qualified: "Qualified",
  rejected: "Rejected",
};

const statusColor: Record<StageStatus, string> = {
  pending: "text-amber-600 dark:text-amber-400",
  qualified: "text-green-600 dark:text-green-400",
  rejected: "text-red-600 dark:text-red-400",
};

const statusIcon: Record<StageStatus, LucideIcon> = {
  pending: Clock3,
  qualified: CheckCircle2,
  rejected: XCircle,
};

export default function HackathonCard({
  name,
  stages,
  children,
  icon: Icon,
  className = "",
  stageDelayOffset = 0,
}: HackathonCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
        ) : null}

        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name}</p>
      </div>

      {stages && stages.length > 0 ? (
        <div className="mt-3 space-y-2">
          {stages.map((stage, index) => (
            <motion.div
              key={`${name}-${stage.name}`}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0.18 : 0.3,
                delay: shouldReduceMotion
                  ? 0
                  : stageDelayOffset + index * 0.22 + (stage.delay ?? 0),
                ease: "easeOut",
              }}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-zinc-700 dark:text-zinc-200">{stage.name} -&gt;</span>

              <span className={`inline-flex items-center gap-1 font-medium ${statusColor[stage.status]}`}>
                {(() => {
                  const StatusIcon = statusIcon[stage.status];
                  return <StatusIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />;
                })()}
                {statusLabel[stage.status]}
              </span>
            </motion.div>
          ))}
        </div>
      ) : null}

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
