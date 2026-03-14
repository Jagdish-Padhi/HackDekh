import { motion, useReducedMotion } from "framer-motion";
import { Flag } from "lucide-react";
import HackathonCard, { type StageStatus } from "../shared/HackathonCard";

type StageInfo = {
  name: string;
  status: StageStatus;
};

type HackathonProgress = {
  name: string;
  stages: StageInfo[];
};

const stageCards: HackathonProgress[] = [
  {
    name: "Devfolio Hackathon",
    stages: [
      { name: "Stage 1", status: "qualified" },
      { name: "Stage 2", status: "rejected" },
    ],
  },
  {
    name: "Unstop Hackathon",
    stages: [
      { name: "Stage 1", status: "qualified" },
      { name: "Stage 2", status: "pending" },
    ],
  },
];

export default function StageTrackingScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="flex h-full flex-col">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Follow stage-by-stage outcomes to spot where each hackathon changed direction.
      </p>

      <div className="mt-4 grid gap-3">
        {stageCards.map((card, index) => (
          <motion.div
            key={card.name}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.2 : 0.35,
              delay: shouldReduceMotion ? 0 : index * 0.15,
              ease: "easeOut",
            }}
          >
            <HackathonCard
              name={card.name}
              stages={card.stages}
              icon={Flag}
              stageDelayOffset={shouldReduceMotion ? 0 : index * 0.3}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
