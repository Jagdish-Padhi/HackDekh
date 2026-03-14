import { motion, useReducedMotion } from "framer-motion";
import { Users } from "lucide-react";
import TeamCard from "../shared/TeamCard";

const teams = [
  { teamName: "ByteCoders", leader: "Rahul", members: 4 },
  { teamName: "HackNinjas", leader: "Priya", members: 3 },
  { teamName: "CodeMonks", leader: "Arjun", members: 5 },
];

export default function TeamsScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="flex h-full flex-col">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Keep every team identity in one place so members avoid cross-team confusion.
      </p>

      <div className="mt-4 grid gap-3">
        {teams.map((team, index) => (
          <motion.div
            key={team.teamName}
            initial={shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: shouldReduceMotion ? 0.2 : 0.35,
              delay: shouldReduceMotion ? 0 : index * 0.3,
              ease: "easeOut",
            }}
          >
            <TeamCard {...team} icon={Users} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
