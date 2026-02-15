type FeatureCardProps = {
  emoji: string;
  title: string;
  desc: string;
};

const FeatureCard = ({ emoji, title, desc }: FeatureCardProps) => (
  <div className="bg-background-card border border-background-border rounded-xl p-6 flex flex-col items-center shadow hover:shadow-violet transition">
    <div className="text-3xl mb-2">{emoji}</div>
    <h3 className="text-xl font-bold text-text-primary mb-1">{title}</h3>
    <p className="text-text-secondary">{desc}</p>
  </div>
);

export default FeatureCard;