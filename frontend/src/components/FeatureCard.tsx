type FeatureCardProps = {
  emoji: string;
  title: string;
  desc: string;
};

const FeatureCard = ({ emoji, title, desc }: FeatureCardProps) => (
  <div className="theme-card flex h-full flex-col items-start rounded-[1.75rem] p-7 text-left">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {emoji}
    </div>
    <h3 className="mb-3 text-xl font-semibold tracking-tight text-text-primary">{title}</h3>
    <p className="text-sm leading-7 text-text-secondary sm:text-base">{desc}</p>
  </div>
);

export default FeatureCard;