import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
}

const ComingSoon = ({
  title,
  description,
  ctaText = 'Back to Home',
  ctaLink = '/',
}: ComingSoonProps) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  return (
    <section className="relative flex min-h-[76vh] flex-col items-center justify-center overflow-hidden px-4 py-20 sm:px-6 md:px-8">
      {/* Animated background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(168,85,247,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_30%,rgba(168,85,247,0.12),transparent_50%)]" />
      </div>

      {/* Animated floating elements */}
      <div className="pointer-events-none absolute left-10 top-20 h-64 w-64 animate-blob rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/15" />
      <div className="pointer-events-none absolute right-10 top-40 h-64 w-64 animate-blob animation-delay-2000 rounded-full bg-purple-300/20 blur-3xl dark:bg-purple-500/15" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 animate-blob animation-delay-4000 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/15" />

      {/* Content */}
      <div
        className={`relative z-10 mx-auto max-w-2xl space-y-8 text-center transition-all duration-1000 ${
          animateIn
            ? 'translate-y-0 opacity-100'
            : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Glowing badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-600 backdrop-blur-sm dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Coming Soon</span>
        </div>

        {/* Main heading */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl dark:text-white">
            {title.split(' ').map((word, idx) => (
              <span
                key={idx}
                className={`inline-block transition-all duration-1000 ${
                  animateIn
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
                }`}
                style={{
                  transitionDelay: `${idx * 100}ms`,
                }}
              >
                {word}&nbsp;
              </span>
            ))}
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-300">
            {description}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="space-y-3">
          <div className="h-1 w-full max-w-64 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-2000 ${
                animateIn ? 'w-3/4' : 'w-0'
              }`}
            />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Crafting something awesome
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center pt-4">
          <a
            href={ctaLink}
            className="inline-flex items-center gap-2 rounded-full border border-blue-500/35 bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-lg dark:border-blue-400/40 dark:bg-blue-500 dark:hover:bg-blue-400 active:translate-y-0"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* Decorative elements */}
        <div className="pt-8">
          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 dark:bg-purple-400" style={{ animationDelay: '0.2s' }} />
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-500 dark:bg-cyan-400" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>

      {/* CSS for blob animation - injected via style tag */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
};

export default ComingSoon;
