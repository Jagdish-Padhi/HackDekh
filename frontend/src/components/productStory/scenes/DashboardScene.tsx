import { useReducedMotion } from "framer-motion";
import {
  Award,
  ClipboardList,
  Trophy,
  type LucideIcon,
  Users,
  XCircle,
} from "lucide-react";
import MetricCard from "../shared/MetricCard";

const dashboardMetrics = [
  { label: "Total Participated", value: 12, icon: ClipboardList },
  { label: "Won", value: 2, icon: Trophy },
  { label: "Finalist", value: 4, icon: Award },
  { label: "Lost", value: 6, icon: XCircle },
] satisfies Array<{ label: string; value: number; icon: LucideIcon }>;

const bestTeamMetric = {
  label: "Best Team",
  value: "Esc(matrix);",
  icon: Users,
};

export default function DashboardScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="flex h-full flex-col">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Get one dashboard view of outcomes, consistency, and your strongest team.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {dashboardMetrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            delay={shouldReduceMotion ? 0 : index * 0.12}
          />
        ))}

        <MetricCard
          label={bestTeamMetric.label}
          value={bestTeamMetric.value}
          icon={bestTeamMetric.icon}
          delay={shouldReduceMotion ? 0 : dashboardMetrics.length * 0.12}
          className="col-span-2"
        />
      </div>
    </section>
  );
}
