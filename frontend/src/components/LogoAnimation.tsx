import { useEffect, useRef, useState } from "react";

type LogoTransitionProps = {
  onComplete?: () => void;
  autoPlay?: boolean;
  size?: number;
};

const PHASES = {
  IDLE: "idle",
  INTRO: "intro",
  IMPACT: "impact",
  HOLD: "hold",
  OUTRO: "outro",
  DONE: "done",
} as const;

const TIMING = {
  intro: 280,
  impact: 260,
  hold: 420,
  outro: 420,
};

type Phase = (typeof PHASES)[keyof typeof PHASES];

const Bolt = ({ phase }: { phase: Phase }) => (
  <svg viewBox="0 0 120 180" className={`bolt ${phase}`} aria-hidden="true">
    <defs>
      <linearGradient id="boltFill" x1="10%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="#9edcff" />
        <stop offset="35%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1d1cf0" />
      </linearGradient>
      <filter id="boltGlow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.2  0 1 0 0 0.45  0 0 1 0 1  0 0 0 1 0" result="colored" />
        <feMerge>
          <feMergeNode in="colored" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path
      d="M66 6 L28 80 H52 L42 174 L92 92 H66 Z"
      fill="url(#boltFill)"
      filter="url(#boltGlow)"
    />
    <path
      d="M67 10 L50 62 H67 L53 138 L83 86 H67 Z"
      fill="rgba(255,255,255,0.24)"
      opacity="0.55"
    />
  </svg>
);

const Bracket = ({ side, phase }: { side: "left" | "right"; phase: Phase }) => (
  <svg viewBox="0 0 90 170" className={`bracket ${side} ${phase}`} aria-hidden="true">
    <defs>
      <linearGradient id={`bracketGrad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#aab6da" />
        <stop offset="55%" stopColor="#263044" />
        <stop offset="100%" stopColor="#111827" />
      </linearGradient>
      <filter id={`bracketGlow-${side}`} x="-30%" y="-20%" width="170%" height="150%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.45" />
      </filter>
    </defs>
    {side === "left" ? (
      <path
        d="M62 12 L22 85 L62 158"
        stroke={`url(#bracketGrad-${side})`}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#bracketGlow-${side})`}
      />
    ) : (
      <path
        d="M28 12 L68 85 L28 158"
        stroke={`url(#bracketGrad-${side})`}
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#bracketGlow-${side})`}
      />
    )}
    {side === "left" ? (
      <path d="M62 12 L22 85" stroke="rgba(185, 205, 245, 0.42)" strokeWidth="6" strokeLinecap="round" fill="none" />
    ) : (
      <path d="M28 12 L68 85" stroke="rgba(185, 205, 245, 0.42)" strokeWidth="6" strokeLinecap="round" fill="none" />
    )}
  </svg>
);

const EnergyBar = ({ phase }: { phase: Phase }) => (
  <div className={`energy-bar ${phase}`} aria-hidden="true">
    <div className="energy-core" />
  </div>
);

export default function LogoTransition({
  onComplete,
  autoPlay = true,
  size = 220,
}: LogoTransitionProps) {
  const [phase, setPhase] = useState<Phase>(autoPlay ? PHASES.INTRO : PHASES.IDLE);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const queue = (callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timersRef.current.push(id);
  };

  useEffect(() => {
    if (!autoPlay) {
      return undefined;
    }

    clearTimers();
    setPhase(PHASES.INTRO);
    queue(() => setPhase(PHASES.IMPACT), TIMING.intro);
    queue(() => setPhase(PHASES.HOLD), TIMING.intro + TIMING.impact);
    queue(() => setPhase(PHASES.OUTRO), TIMING.intro + TIMING.impact + TIMING.hold);
    queue(() => {
      setPhase(PHASES.DONE);
      onComplete?.();
    }, TIMING.intro + TIMING.impact + TIMING.hold + TIMING.outro);

    return clearTimers;
  }, [autoPlay, onComplete]);

  if (phase === PHASES.DONE) {
    return null;
  }

  const isIdle = phase === PHASES.IDLE;

  return (
    <div
      className="logo-transition-shell"
      style={{
        width: size,
        height: size,
      }}
    >
      <style>{`
        .logo-transition-shell {
          position: relative;
          display: grid;
          place-items: center;
          background: transparent;
          overflow: visible;
        }

        .logo-core {
          position: relative;
          width: min(100%, ${size}px);
          height: min(100%, ${size}px);
          display: grid;
          place-items: center;
          transform-origin: center;
        }

        .logo-core.impact {
          animation: logoShake 240ms ease-in-out both;
        }

        .logo-core.outro {
          animation: logoOut 420ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        .bracket,
        .bolt,
        .energy-bar {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
        }

        .bracket {
          filter: drop-shadow(0 10px 18px rgba(15, 23, 42, 0.18));
        }

        .bracket.left {
          transform-origin: 72% 50%;
        }

        .bracket.right {
          transform-origin: 28% 50%;
        }

        .energy-bar {
          left: 50%;
          top: 50%;
          width: 68%;
          height: 16px;
          transform: translate(-50%, -50%) scaleX(0.08);
          opacity: 0;
        }

        .energy-core {
          position: absolute;
          inset: 3px 0;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.18), rgba(34,211,238,0.92), rgba(59,130,246,0.18), transparent);
          box-shadow: 0 0 24px rgba(34, 211, 238, 0.65), 0 0 42px rgba(37, 99, 235, 0.35);
          filter: blur(0.15px);
        }

        .intro .bracket.left {
          animation: leftIn 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .intro .bracket.right {
          animation: rightIn 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .intro .bolt {
          animation: boltIn 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .intro .energy-bar {
          animation: energyIn 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .impact .bracket.left,
        .hold .bracket.left {
          animation: leftSettle 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .impact .bracket.right,
        .hold .bracket.right {
          animation: rightSettle 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .impact .bolt,
        .hold .bolt {
          animation: boltSettle 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .impact .energy-bar,
        .hold .energy-bar {
          animation: energyPulse 280ms cubic-bezier(0.2, 1, 0.36, 1) forwards;
        }

        .outro .bracket.left {
          animation: leftOut 420ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        .outro .bracket.right {
          animation: rightOut 420ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        .outro .bolt {
          animation: boltOut 420ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        .outro .energy-bar {
          animation: energyOut 420ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }

        .idle .bracket.left {
          transform: translateX(-7%) scale(0.94);
          opacity: 0.72;
        }

        .idle .bracket.right {
          transform: translateX(7%) scale(0.94);
          opacity: 0.72;
        }

        .idle .bolt {
          transform: scale(0.88);
          opacity: 0.86;
        }

        .idle .energy-bar {
          transform: translate(-50%, -50%) scaleX(0.26);
          opacity: 0.32;
        }

        @keyframes leftIn {
          0% { transform: translateX(-26%) scale(0.62); opacity: 0; }
          70% { transform: translateX(2%) scale(1.04); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }

        @keyframes rightIn {
          0% { transform: translateX(26%) scale(0.62); opacity: 0; }
          70% { transform: translateX(-2%) scale(1.04); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }

        @keyframes boltIn {
          0% { transform: scale(0.36) translateY(12px); opacity: 0; }
          70% { transform: scale(1.12) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes energyIn {
          0% { transform: translate(-50%, -50%) scaleX(0.08); opacity: 0; }
          70% { transform: translate(-50%, -50%) scaleX(1.04); opacity: 1; }
          100% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
        }

        @keyframes leftSettle {
          0% { transform: translateX(0) scale(1); }
          40% { transform: translateX(-1.5%) scale(1.015); }
          100% { transform: translateX(0) scale(1); }
        }

        @keyframes rightSettle {
          0% { transform: translateX(0) scale(1); }
          40% { transform: translateX(1.5%) scale(1.015); }
          100% { transform: translateX(0) scale(1); }
        }

        @keyframes boltSettle {
          0% { transform: scale(1); }
          30% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }

        @keyframes energyPulse {
          0% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
          45% { transform: translate(-50%, -50%) scaleX(1.12); opacity: 1; }
          100% { transform: translate(-50%, -50%) scaleX(1); opacity: 0.9; }
        }

        @keyframes leftOut {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(-28%) scale(0.72); opacity: 0; }
        }

        @keyframes rightOut {
          0% { transform: translateX(0) scale(1); opacity: 1; }
          100% { transform: translateX(28%) scale(0.72); opacity: 0; }
        }

        @keyframes boltOut {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.58) translateY(-12px); opacity: 0; }
        }

        @keyframes energyOut {
          0% { transform: translate(-50%, -50%) scaleX(1); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scaleX(0.04); opacity: 0; }
        }

        @keyframes logoShake {
          0% { transform: translate3d(0,0,0); }
          20% { transform: translate3d(-2px,1px,0); }
          40% { transform: translate3d(3px,-2px,0); }
          60% { transform: translate3d(-2px,2px,0); }
          80% { transform: translate3d(2px,-1px,0); }
          100% { transform: translate3d(0,0,0); }
        }

        @keyframes logoOut {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-core,
          .bracket,
          .bolt,
          .energy-bar {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className={`logo-core ${isIdle ? PHASES.IDLE : phase}`}>
        <EnergyBar phase={isIdle ? PHASES.IDLE : phase} />
        <Bracket side="left" phase={isIdle ? PHASES.IDLE : phase} />
        <Bracket side="right" phase={isIdle ? PHASES.IDLE : phase} />
        <Bolt phase={isIdle ? PHASES.IDLE : phase} />
      </div>
    </div>
  );
}
