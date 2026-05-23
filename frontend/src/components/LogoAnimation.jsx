import { useState, useEffect, useRef } from "react";

const PHASES = {
  IDLE: "idle",
  INTRO: "intro",       // brackets fly in, bolt zooms in
  ASSEMBLE: "assemble", // everything snaps together + shake
  HOLD: "hold",         // brief hold at peak
  OUTRO: "outro",       // reverse — bolt zooms out, brackets separate
  DONE: "done",
};

/* ─── Bolt SVG paths ─── */
const BoltPath = () => (
  <svg
    viewBox="0 0 80 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: "100%", height: "100%", overflow: "visible" }}
  >
    <defs>
      <linearGradient id="boltGrad" x1="0%" y1="0%" x2="60%" y2="100%">
        <stop offset="0%" stopColor="#6ee7ff" />
        <stop offset="40%" stopColor="#3b7ff5" />
        <stop offset="100%" stopColor="#1a1aff" />
      </linearGradient>
      <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="boltGlowStrong" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="14" result="blur" />
        <feColorMatrix in="blur" type="matrix"
          values="0 0 0 0 0.2  0 0 0 0 0.5  0 0 0 0 1  0 0 0 1 0" result="colored"/>
        <feMerge>
          <feMergeNode in="colored" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Shadow/depth layer */}
    <polygon
      points="48,2 18,62 40,62 32,118 68,48 44,48"
      fill="rgba(0,0,60,0.45)"
      transform="translate(3,4)"
    />
    {/* Main bolt */}
    <polygon
      points="48,2 18,62 40,62 32,118 68,48 44,48"
      fill="url(#boltGrad)"
      filter="url(#boltGlowStrong)"
    />
    {/* Specular highlight */}
    <polygon
      points="48,2 36,40 44,40"
      fill="rgba(180,220,255,0.55)"
    />
  </svg>
);

/* ─── Left bracket ─── */
const LeftBracket = () => (
  <svg viewBox="0 0 70 130" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: "100%", height: "100%" }}>
    <defs>
      <linearGradient id="bracketGradL" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8fa8d0" />
        <stop offset="50%" stopColor="#2d3a52" />
        <stop offset="100%" stopColor="#1a2235" />
      </linearGradient>
      <filter id="bracketShadow" x="-30%" y="-20%" width="160%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#0a0f20" floodOpacity="0.7" />
      </filter>
    </defs>
    {/* < shape */}
    <path
      d="M58 8 L12 65 L58 122"
      stroke="url(#bracketGradL)"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      filter="url(#bracketShadow)"
    />
    {/* specular */}
    <path
      d="M58 8 L12 65"
      stroke="rgba(160,190,230,0.35)"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/* ─── Right bracket ─── */
const RightBracket = () => (
  <svg viewBox="0 0 70 130" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: "100%", height: "100%" }}>
    <defs>
      <linearGradient id="bracketGradR" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8fa8d0" />
        <stop offset="50%" stopColor="#2d3a52" />
        <stop offset="100%" stopColor="#1a2235" />
      </linearGradient>
    </defs>
    <path
      d="M12 8 L58 65 L12 122"
      stroke="url(#bracketGradR)"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      filter="url(#bracketShadow)"
    />
    <path
      d="M12 8 L58 65"
      stroke="rgba(160,190,230,0.35)"
      strokeWidth="6"
      strokeLinecap="round"
      fill="none"
    />
    <defs>
      <filter id="bracketShadow2" x="-30%" y="-20%" width="160%" height="140%">
        <feDropShadow dx="-2" dy="4" stdDeviation="4" floodColor="#0a0f20" floodOpacity="0.7" />
      </filter>
    </defs>
  </svg>
);

/* ─── Ring pulse ─── */
const RingPulse = ({ active }) => (
  <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
    <defs>
      <radialGradient id="ringGrad" cx="50%" cy="50%">
        <stop offset="60%" stopColor="transparent" />
        <stop offset="85%" stopColor="#5b7fff44" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
    {active && (
      <>
        <circle cx="150" cy="150" r="120" fill="none" stroke="#5b7fff" strokeWidth="3"
          style={{ animation: "ringPulse1 0.6s ease-out forwards" }} />
        <circle cx="150" cy="150" r="140" fill="none" stroke="#00cfff" strokeWidth="1.5"
          style={{ animation: "ringPulse2 0.8s ease-out 0.1s forwards" }} />
      </>
    )}
  </svg>
);

/* ─── Energy particles ─── */
const EnergyParticles = ({ active }) => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    angle: (i / 18) * 360,
    dist: 80 + Math.random() * 60,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 0.2,
    color: i % 3 === 0 ? "#00cfff" : i % 3 === 1 ? "#5b7fff" : "#ffffff",
  }));

  if (!active) return null;
  return (
    <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = 150 + Math.cos(rad) * p.dist;
        const y = 150 + Math.sin(rad) * p.dist;
        return (
          <circle
            key={p.id}
            cx={x}
            cy={y}
            r={p.size}
            fill={p.color}
            style={{
              animation: `particleFade 0.6s ease-out ${p.delay}s forwards`,
              opacity: 0,
            }}
          />
        );
      })}
    </svg>
  );
};

/* ─── Main Component ─── */
export default function LogoTransition({
  onComplete,
  autoPlay = true,
  size = 260,
}) {
  const [phase, setPhase] = useState(autoPlay ? PHASES.INTRO : PHASES.IDLE);
  const [shake, setShake] = useState(false);
  const [particles, setParticles] = useState(false);
  const timerRef = useRef([]);

  const clearTimers = () => timerRef.current.forEach(clearTimeout);

  const addTimer = (fn, delay) => {
    const id = setTimeout(fn, delay);
    timerRef.current.push(id);
    return id;
  };

  const runAnimation = () => {
    clearTimers();
    timerRef.current = [];
    setPhase(PHASES.INTRO);
    setShake(false);
    setParticles(false);

    addTimer(() => {
      setPhase(PHASES.ASSEMBLE);
      setShake(true);
      setParticles(true);
      addTimer(() => setShake(false), 500);
      addTimer(() => setParticles(false), 700);
      addTimer(() => {
        setPhase(PHASES.HOLD);
        addTimer(() => {
          setPhase(PHASES.OUTRO);
          addTimer(() => {
            setPhase(PHASES.DONE);
            onComplete?.();
          }, 900);
        }, 800);
      }, 600);
    }, 900);
  };

  useEffect(() => {
    if (autoPlay) runAnimation();
    return clearTimers;
  }, []);

  const isIntro = phase === PHASES.INTRO;
  const isAssembled = phase === PHASES.ASSEMBLE || phase === PHASES.HOLD;
  const isOutro = phase === PHASES.OUTRO;
  const isDone = phase === PHASES.DONE;

  /* ─── bracket positions ─── */
  const bracketOffset = isAssembled ? 0 : isOutro ? -180 : isIntro ? -180 : -180;
  const rightBracketOffset = isAssembled ? 0 : isOutro ? 180 : isIntro ? 180 : 180;

  /* ─── bolt scale ─── */
  const boltScale = isAssembled ? 1 : isOutro ? 0 : isIntro ? 0 : 0;
  const boltOpacity = isAssembled ? 1 : isOutro ? 0 : isIntro ? 0 : 0;

  /* ─── ring glow opacity ─── */
  const glowOpacity = isAssembled ? 1 : 0;

  const easing = isOutro
    ? "cubic-bezier(0.55, 0, 1, 0.45)"
    : "cubic-bezier(0.22, 1, 0.36, 1)";

  const dur = isOutro ? "0.75s" : "0.85s";

  const containerStyle = {
    position: "relative",
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: shake ? undefined : "none",
    animation: shake ? "shakeAnim 0.45s ease-in-out" : "none",
  };

  const outerRingStyle = {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: isAssembled
      ? "conic-gradient(from 180deg, #6030ff, #00cfff, #5b7fff, #6030ff)"
      : "transparent",
    transition: `background ${dur} ${easing}, opacity ${dur} ${easing}`,
    opacity: isAssembled ? 1 : 0,
    padding: 8,
    boxSizing: "border-box",
  };

  const innerDiskStyle = {
    position: "absolute",
    inset: 10,
    borderRadius: "50%",
    background: isAssembled
      ? "radial-gradient(ellipse at 35% 30%, #d8e8ff 0%, #b0c8f0 30%, #7090c0 70%, #3a4a70 100%)"
      : "transparent",
    transition: `background ${dur} ${easing}`,
    boxShadow: isAssembled
      ? "inset 0 4px 24px rgba(255,255,255,0.35), inset 0 -6px 18px rgba(0,0,60,0.4)"
      : "none",
  };

  const ambientGlowStyle = {
    position: "absolute",
    inset: -30,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse, rgba(91,127,255,0.35) 0%, rgba(0,207,255,0.12) 50%, transparent 75%)",
    opacity: glowOpacity,
    transition: `opacity ${dur} ${easing}`,
    pointerEvents: "none",
    filter: "blur(8px)",
  };

  const leftBracketStyle = {
    position: "absolute",
    left: "12%",
    top: "50%",
    width: "28%",
    height: "55%",
    transform: `translate(${bracketOffset}px, -50%)`,
    transition: `transform ${dur} ${easing}`,
    zIndex: 4,
    willChange: "transform",
  };

  const rightBracketStyle = {
    position: "absolute",
    right: "12%",
    top: "50%",
    width: "28%",
    height: "55%",
    transform: `translate(${rightBracketOffset}px, -50%)`,
    transition: `transform ${dur} ${easing}`,
    zIndex: 4,
    willChange: "transform",
  };

  const boltStyle = {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "28%",
    height: "52%",
    transform: `translate(-50%, -52%) scale(${boltScale})`,
    opacity: boltOpacity,
    transition: `transform ${dur} ${easing}, opacity ${dur} ${easing}`,
    zIndex: 5,
    willChange: "transform, opacity",
  };

  if (isDone) return null;

  return (
    <>
      <style>{`
        @keyframes shakeAnim {
          0%   { transform: translate(0,0) rotate(0deg); }
          15%  { transform: translate(-6px, 3px) rotate(-1.5deg); }
          30%  { transform: translate(7px, -4px) rotate(2deg); }
          45%  { transform: translate(-5px, 5px) rotate(-1deg); }
          60%  { transform: translate(6px, -2px) rotate(1.5deg); }
          75%  { transform: translate(-3px, 3px) rotate(-0.5deg); }
          90%  { transform: translate(2px, -1px) rotate(0.3deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        @keyframes ringPulse1 {
          0%   { r: 100; opacity: 1; stroke-width: 3; }
          100% { r: 160; opacity: 0; stroke-width: 1; }
        }
        @keyframes ringPulse2 {
          0%   { r: 110; opacity: 0.8; }
          100% { r: 175; opacity: 0; }
        }
        @keyframes particleFade {
          0%   { opacity: 0; transform: scale(0.5); }
          30%  { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0; transform: scale(0.2); }
        }
        @keyframes boltFlicker {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.6) drop-shadow(0 0 12px #00cfff); }
        }
      `}</style>

      <div style={containerStyle}>
        {/* Ambient glow */}
        <div style={ambientGlowStyle} />

        {/* Outer ring */}
        <div style={outerRingStyle} />

        {/* Inner disk */}
        <div style={innerDiskStyle} />

        {/* Grid texture on disk */}
        {isAssembled && (
          <svg
            style={{ position: "absolute", inset: 10, borderRadius: "50%", opacity: 0.12, pointerEvents: "none", zIndex: 1 }}
            viewBox="0 0 200 200"
          >
            <defs>
              <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#9ab" strokeWidth="0.6" />
              </pattern>
              <clipPath id="diskClip">
                <circle cx="100" cy="100" r="96" />
              </clipPath>
            </defs>
            <rect width="200" height="200" fill="url(#grid)" clipPath="url(#diskClip)" />
          </svg>
        )}

        {/* Ring pulse on assemble */}
        <RingPulse active={particles} />

        {/* Particles */}
        <EnergyParticles active={particles} />

        {/* Left bracket */}
        <div style={leftBracketStyle}>
          <LeftBracket />
        </div>

        {/* Right bracket */}
        <div style={rightBracketStyle}>
          <RightBracket />
        </div>

        {/* Lightning bolt */}
        <div style={boltStyle}>
          <BoltPath />
        </div>
      </div>
    </>
  );
}

/* ─── Demo wrapper ─── */
export function LogoTransitionDemo() {
  const [key, setKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const play = () => {
    setDone(false);
    setRunning(true);
    setKey((k) => k + 1);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0d1117 0%, #0a0e1a 50%, #0d1117 100%)",
      fontFamily: "'SF Pro Display', system-ui, sans-serif",
      gap: 40,
    }}>
      {/* Demo on transparent bg */}
      <div style={{
        display: "flex",
        gap: 48,
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
      }}>
        {/* Dark BG demo */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4a5568", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Dark Surface</p>
          <div style={{
            width: 320,
            height: 320,
            background: "#0d1117",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #1e2435",
          }}>
            <LogoTransition
              key={key}
              size={240}
              autoPlay={running}
              onComplete={() => { setRunning(false); setDone(true); }}
            />
            {!running && (
              <div style={{ color: "#3a4058", fontSize: 14 }}>
                {done ? "✓ Done" : "Press play ↓"}
              </div>
            )}
          </div>
        </div>

        {/* Light BG demo */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4a5568", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Light Surface</p>
          <div style={{
            width: 320,
            height: 320,
            background: "#f0f4ff",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #dde3f0",
          }}>
            <LogoTransition
              key={key + 10000}
              size={240}
              autoPlay={running}
              onComplete={() => {}}
            />
            {!running && (
              <div style={{ color: "#b0b8d0", fontSize: 14 }}>
                {done ? "✓ Done" : "Press play ↓"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={play}
        disabled={running}
        style={{
          background: running
            ? "#1a2235"
            : "linear-gradient(135deg, #5b7fff 0%, #00cfff 100%)",
          color: running ? "#3a4a6a" : "#fff",
          border: "none",
          borderRadius: 12,
          padding: "14px 40px",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 1,
          cursor: running ? "not-allowed" : "pointer",
          transition: "all 0.3s ease",
          boxShadow: running ? "none" : "0 4px 24px rgba(91,127,255,0.4)",
        }}
      >
        {running ? "Animating..." : "▶  Play Animation"}
      </button>

      <p style={{ color: "#2a3048", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
        Logo Transition · Transparent Background · Drop-in React Component
      </p>
    </div>
  );
}
