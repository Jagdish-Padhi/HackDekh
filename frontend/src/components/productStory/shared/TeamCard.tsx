import type { LucideIcon } from "lucide-react";

type TeamCardProps = {
  teamName: string;
  leader: string;
  members: number;
  icon?: LucideIcon;
  className?: string;
};

export default function TeamCard({
  teamName,
  leader,
  members,
  icon: Icon,
  className = "",
}: TeamCardProps) {
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

        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{teamName}</p>
      </div>

      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Leader: {leader}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Members: {members}</p>
    </div>
  );
}
