type FeatureCardProps = {
  emoji: string;
  title: string;
  desc: string;
};

const FeatureCard = ({ emoji, title, desc }: FeatureCardProps) => (
  <div className="group flex h-full flex-col items-start rounded-[1.75rem] border border-zinc-200/90 bg-white p-7 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-md dark:hover:border-zinc-700 dark:hover:shadow-lg">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {emoji}
    </div>
    <h3 className="mb-3 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
    <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base">{desc}</p>
  </div>
);

export default FeatureCard;