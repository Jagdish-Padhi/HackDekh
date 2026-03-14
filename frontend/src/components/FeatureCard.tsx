type FeatureCardProps = {
  emoji: string;
  title: string;
  desc: string;
};

const FeatureCard = ({ emoji, title, desc }: FeatureCardProps) => (
  <div className="group flex h-full flex-col items-start rounded-[1.75rem] border border-gray-200/90 bg-white p-7 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_20px_45px_rgba(59,130,246,0.18)] dark:border-[#1F1F22] dark:bg-[#121214] dark:shadow-[0_20px_44px_rgba(0,0,0,0.38)] dark:hover:border-blue-400/40 dark:hover:shadow-[0_24px_50px_rgba(79,140,255,0.2)]">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors duration-300 dark:border-[#2A2A30] dark:bg-white/5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {emoji}
    </div>
    <h3 className="mb-3 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{title}</h3>
    <p className="text-sm leading-7 text-gray-600 dark:text-gray-400 sm:text-base">{desc}</p>
  </div>
);

export default FeatureCard;