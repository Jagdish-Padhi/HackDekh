import type { LucideIcon } from "lucide-react";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const FeatureCard = ({ icon: Icon, title, desc }: FeatureCardProps) => (
  <div className="group relative flex h-full flex-col items-start overflow-hidden rounded-[1.75rem] border border-zinc-200/90 bg-white p-7 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md dark:hover:border-zinc-700 dark:hover:shadow-lg">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(59,130,246,0.08),transparent_42%,rgba(24,24,27,0.03))] dark:bg-[linear-gradient(140deg,rgba(96,165,250,0.14),transparent_46%,rgba(255,255,255,0.02))]" />

    <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-linear-to-br from-zinc-50 to-zinc-100 text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors duration-300 dark:border-zinc-800 dark:bg-linear-to-br dark:from-zinc-900 dark:to-zinc-800 dark:text-zinc-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <Icon className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
    </div>

    <h3 className="relative z-10 mb-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
    <p className="relative z-10 text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base">{desc}</p>
  </div>
);

export default FeatureCard;