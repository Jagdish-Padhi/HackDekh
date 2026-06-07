import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

// ─── easing library ──────────────────────────────────────────
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;

const ease = {
  outBack:    (t: number, s: number = 2.2) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outExpo:    (t: number)          => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outElastic: (t: number) => {
    const c = (2 * Math.PI) / 3.6;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.8) * c) + 1;
  },
  inExpo:  (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  inBack:  (t: number, s: number = 2.0) => (s + 1) * t * t * t - s * t * t,
};

// ─── timeline constants (ms) ──────────────────────────────────
const TL = {
  bktDur:  720,   // brackets fly in duration
  bltDelay:200,   // bolt starts this many ms after brackets
  bltDur:  660,   // bolt zoom-in duration
  impactAt:900,   // when impact fires
  holdDur: 980,   // hold duration after shake settles
  outroDur:680,   // outro duration
  shakeDur:500,   // shake duration
  outroAt: 900 + 50 + 980,   // ~1930
  doneAt:  900 + 50 + 980 + 680 + 220, // ~2830
};

export interface LogoTransitionRef {
  play: () => void;
}

export interface LogoTransitionProps {
  autoPlay?: boolean;
  onComplete?: () => void;
  width?: number;
  height?: number;
  loop?: boolean;
}

const LogoTransition = forwardRef<LogoTransitionRef, LogoTransitionProps>(
  function LogoTransition(
    { autoPlay = true, onComplete, width = 400, height = 240, loop = false },
    ref
  ) {
    const arenaRef  = useRef<HTMLDivElement>(null);
    const glRef     = useRef<HTMLDivElement>(null);
    const grRef     = useRef<HTMLDivElement>(null);
    const gsRef     = useRef<HTMLDivElement>(null);
    const rafRef    = useRef<number | null>(null);
    const running   = useRef<boolean>(false);

    const reset = useCallback(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      const gl = glRef.current;
      const gr = grRef.current;
      const gs = gsRef.current;
      const ar = arenaRef.current;
      if (!gl || !gr || !gs || !ar) return;

      gl.style.cssText = "position:absolute;left:34px;top:50%;transform:translateY(-50%) translateX(-440px);opacity:0;will-change:transform,opacity;";
      gr.style.cssText = "position:absolute;right:34px;top:50%;transform:translateY(-50%) translateX(440px);opacity:0;will-change:transform,opacity;";
      gs.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(0) rotate(-14deg);opacity:0;filter:none;will-change:transform,opacity,filter;";
      ar.style.transform = "";
    }, []);

    const play = useCallback(() => {
      if (loop) return; // Looping mode uses pure CSS animations
      if (running.current) return;
      running.current = true;
      reset();

      const gl = glRef.current;
      const gr = grRef.current;
      const gs = gsRef.current;
      const ar = arenaRef.current;
      if (!gl || !gr || !gs || !ar) return;

      const T0 = performance.now();

      const frame = (now: number) => {
        const el = now - T0;

        // brackets in
        {
          const t  = clamp(el / TL.bktDur, 0, 1);
          const ox = lerp(440, 0, ease.outBack(t));
          const oa = clamp(t * 4, 0, 1);
          gl.style.transform = `translateY(-50%) translateX(${-ox}px)`;
          gl.style.opacity   = String(oa);
          gr.style.transform = `translateY(-50%) translateX(${ox}px)`;
          gr.style.opacity   = String(oa);
        }

        // bolt in
        if (el >= TL.bltDelay) {
          const t  = clamp((el - TL.bltDelay) / TL.bltDur, 0, 1);
          const sc = ease.outElastic(t);
          const ro = lerp(-14, 0, ease.outExpo(t));
          gs.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(4)}) rotate(${ro.toFixed(2)}deg)`;
          gs.style.opacity   = String(clamp(t * 5, 0, 1));
        }

        // shake (much simplified & lightweight, using scale & filter)
        if (el >= TL.impactAt && el < TL.outroAt) {
          const st = clamp((el - TL.impactAt) / TL.shakeDur, 0, 1);
          if (st < 1) {
            const decay = 1 - ease.outExpo(st);
            const mag   = 4 * decay;
            ar.style.transform = `translate(${(Math.sin(now * 0.088) * mag).toFixed(2)}px,${(Math.cos(now * 0.065) * mag * 0.5).toFixed(2)}px)`;
          } else {
            ar.style.transform = "";
          }
        }

        // outro
        if (el >= TL.outroAt) {
          const ot = clamp((el - TL.outroAt) / TL.outroDur, 0, 1);
          gs.style.transform = `translate(-50%,-50%) scale(${lerp(1, 0, ease.inExpo(ot)).toFixed(4)}) rotate(${lerp(0, 18, ease.inBack(ot)).toFixed(2)}deg)`;
          gs.style.opacity   = String(clamp(1 - ot * 2, 0, 1));

          const bt = clamp((el - TL.outroAt - 100) / TL.outroDur, 0, 1);
          const bx = lerp(0, 440, ease.inExpo(bt));
          gl.style.transform = `translateY(-50%) translateX(${-bx}px)`;
          gl.style.opacity   = String(clamp(1 - bt * 1.8, 0, 1));
          gr.style.transform = `translateY(-50%) translateX(${bx}px)`;
          gr.style.opacity   = String(clamp(1 - bt * 1.8, 0, 1));
        }

        if (el >= TL.doneAt) {
          reset();
          running.current = false;
          onComplete?.();
          return;
        }

        rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);
    }, [reset, onComplete, loop]);

    useImperativeHandle(ref, () => ({ play }), [play]);

    useEffect(() => {
      if (autoPlay && !loop) play();
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        running.current = false;
      };
    }, [autoPlay, play, loop]);

    if (loop) {
      // Return highly lightweight, responsive CSS keyframe animated SVG loader
      return (
        <svg
          viewBox="0 0 320 220"
          width={width}
          height={height}
          xmlns="http://www.w3.org/2000/svg"
          style={{
            overflow: "visible",
            background: "transparent",
            display: "block",
            maxWidth: "100%",
          }}
        >
          <defs>
            <linearGradient id="bktL" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3a4d72" />
              <stop offset="30%" stopColor="#1e2d50" />
              <stop offset="70%" stopColor="#131d38" />
              <stop offset="100%" stopColor="#0d1428" />
            </linearGradient>
            <linearGradient id="bktR" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3a4d72" />
              <stop offset="30%" stopColor="#1e2d50" />
              <stop offset="70%" stopColor="#131d38" />
              <stop offset="100%" stopColor="#0d1428" />
            </linearGradient>
            <linearGradient id="bltFill" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#3d50e8" />
              <stop offset="40%" stopColor="#2438cc" />
              <stop offset="100%" stopColor="#131a88" />
            </linearGradient>
            <linearGradient id="bltStroke" x1="0%" y1="0%" x2="30%" y2="100%">
              <stop offset="0%" stopColor="#9966ff" />
              <stop offset="50%" stopColor="#4488ff" />
              <stop offset="100%" stopColor="#00ccff" />
            </linearGradient>
            <linearGradient id="bltSpec" x1="0%" y1="0%" x2="100%" y2="60%">
              <stop offset="0%" stopColor="#7788ff" stopOpacity=".8" />
              <stop offset="100%" stopColor="#1a2299" stopOpacity="0" />
            </linearGradient>
          </defs>
          <style>{`
            @keyframes bktLeftCollision {
              0% { transform: translateX(0px) scale(1); opacity: 0.85; }
              20% { transform: translateX(0px) scale(1); opacity: 0.85; }
              30% { transform: translateX(23px) scale(0.95); opacity: 1; }
              32% { transform: translateX(23px) scale(0.95); opacity: 1; }
              45% { transform: translateX(-15px) scale(1.05); opacity: 0.9; }
              60% { transform: translateX(4px) scale(0.98); opacity: 0.95; }
              75% { transform: translateX(-2px) scale(1.01); opacity: 1; }
              90% { transform: translateX(0px) scale(1); opacity: 1; }
              100% { transform: translateX(0px) scale(1); opacity: 0.85; }
            }
            @keyframes bktRightCollision {
              0% { transform: translateX(0px) scale(1); opacity: 0.85; }
              20% { transform: translateX(0px) scale(1); opacity: 0.85; }
              30% { transform: translateX(-23px) scale(0.95); opacity: 1; }
              32% { transform: translateX(-23px) scale(0.95); opacity: 1; }
              45% { transform: translateX(15px) scale(1.05); opacity: 0.9; }
              60% { transform: translateX(-4px) scale(0.98); opacity: 0.95; }
              75% { transform: translateX(2px) scale(1.01); opacity: 1; }
              90% { transform: translateX(0px) scale(1); opacity: 1; }
              100% { transform: translateX(0px) scale(1); opacity: 0.85; }
            }
            @keyframes boltImpact {
              0% { transform: scale(0.9) rotate(-1deg); opacity: 0.75; filter: drop-shadow(0 0 2px rgba(61,80,232,0.2)); }
              28% { transform: scale(0.9) rotate(-1deg); opacity: 0.75; }
              30% { transform: scale(1.2) rotate(4deg); opacity: 1; filter: drop-shadow(0 0 18px rgba(99,102,241,0.95)) brightness(1.8); }
              32% { transform: scale(1.2) rotate(4deg); opacity: 1; filter: drop-shadow(0 0 18px rgba(99,102,241,0.95)) brightness(1.8); }
              45% { transform: scale(0.95) rotate(-2deg); opacity: 0.85; filter: drop-shadow(0 0 6px rgba(61,80,232,0.4)) brightness(1.2); }
              60% { transform: scale(1.02) rotate(1deg); opacity: 0.9; filter: drop-shadow(0 0 8px rgba(61,80,232,0.5)) brightness(1.1); }
              75% { transform: scale(0.98) rotate(-0.5deg); opacity: 0.85; }
              90% { transform: scale(1) rotate(0deg); opacity: 0.85; }
              100% { transform: scale(0.9) rotate(-1deg); opacity: 0.75; }
            }
            @keyframes shockwavePulse {
              0% { transform: scale(0); opacity: 0; }
              29% { transform: scale(0); opacity: 0; }
              30% { transform: scale(0.05); opacity: 0.95; }
              55% { transform: scale(1.35); opacity: 0; }
              100% { transform: scale(1.35); opacity: 0; }
            }
            .bkt-left-anim {
              transform-origin: 87px 110px;
              animation: bktLeftCollision 2.0s cubic-bezier(0.25, 1, 0.5, 1) infinite;
            }
            .bkt-right-anim {
              transform-origin: 233px 110px;
              animation: bktRightCollision 2.0s cubic-bezier(0.25, 1, 0.5, 1) infinite;
            }
            .bolt-anim {
              transform-origin: 160px 110px;
              animation: boltImpact 2.0s cubic-bezier(0.25, 1, 0.5, 1) infinite;
            }
            .shockwave-anim {
              transform-origin: 160px 110px;
              animation: shockwavePulse 2.0s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
            }
          `}</style>
          
          {/* Shockwave circle ring */}
          <circle
            cx="160"
            cy="110"
            r="80"
            fill="none"
            stroke="url(#bltStroke)"
            strokeWidth="3.5"
            className="shockwave-anim"
          />

          {/* Left bracket */}
          <polygon
            points="120,40 130,40 130,60 56,108 56,112 130,160 130,180 120,180 44,128 44,112 44,96"
            fill="url(#bktL)"
            className="bkt-left-anim"
          />

          {/* Right bracket */}
          <polygon
            points="200,40 190,40 190,60 264,108 264,112 190,160 190,180 200,180 276,128 276,112 276,96"
            fill="url(#bktR)"
            className="bkt-right-anim"
          />

          {/* Energy Bolt */}
          <g className="bolt-anim">
            <polygon
              points="171,6 131,96 153,96 143,194 189,104 165,104"
              fill="url(#bltFill)"
              stroke="url(#bltStroke)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <polygon
              points="171,6 155,56 165,56"
              fill="url(#bltSpec)"
            />
          </g>
        </svg>
      );
    }

    return (
      <div
        ref={arenaRef}
        style={{
          position: "relative",
          width,
          height,
          overflow: "visible",
          background: "transparent",
        }}
      >
        <div
          ref={glRef}
          style={{
            position: "absolute",
            left: 34,
            top: "50%",
            transform: "translateY(-50%) translateX(-440px)",
            opacity: 0,
            willChange: "transform,opacity",
          }}
        >
          <svg width="108" height="148" viewBox="0 0 108 152" overflow="visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bktL-t" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3a4d72"/>
                <stop offset="30%" stopColor="#1e2d50"/>
                <stop offset="70%" stopColor="#131d38"/>
                <stop offset="100%" stopColor="#0d1428"/>
              </linearGradient>
            </defs>
            <polygon points="86,8 96,8 96,28 22,76 22,80 96,128 96,148 86,148 10,96 10,80 10,64" fill="url(#bktL-t)"/>
          </svg>
        </div>

        <div
          ref={grRef}
          style={{
            position: "absolute",
            right: 34,
            top: "50%",
            transform: "translateY(-50%) translateX(440px)",
            opacity: 0,
            willChange: "transform,opacity",
          }}
        >
          <svg width="108" height="148" viewBox="0 0 108 152" overflow="visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bktR-t" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3a4d72"/>
                <stop offset="30%" stopColor="#1e2d50"/>
                <stop offset="70%" stopColor="#131d38"/>
                <stop offset="100%" stopColor="#0d1428"/>
              </linearGradient>
            </defs>
            <polygon points="22,8 12,8 12,28 86,76 86,80 12,128 12,148 22,148 98,96 98,80 98,64" fill="url(#bktR-t)"/>
          </svg>
        </div>

        <div
          ref={gsRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%) scale(0) rotate(-14deg)",
            opacity: 0,
            willChange: "transform,opacity,filter",
          }}
        >
          <svg width="88" height="214" viewBox="0 0 80 200" overflow="visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bltFill-t" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#3d50e8"/>
                <stop offset="40%" stopColor="#2438cc"/>
                <stop offset="100%" stopColor="#131a88"/>
              </linearGradient>
              <linearGradient id="bltStroke-t" x1="0%" y1="0%" x2="30%" y2="100%">
                <stop offset="0%" stopColor="#9966ff"/>
                <stop offset="50%" stopColor="#4488ff"/>
                <stop offset="100%" stopColor="#00ccff"/>
              </linearGradient>
              <linearGradient id="bltSpec-t" x1="0%" y1="0%" x2="100%" y2="60%">
                <stop offset="0%" stopColor="#7788ff" stopOpacity=".8"/>
                <stop offset="100%" stopColor="#1a2299" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polygon points="52,6 12,96 34,96 24,194 70,104 46,104" fill="url(#bltFill-t)" stroke="url(#bltStroke-t)" strokeWidth="2.2" strokeLinejoin="round"/>
            <polygon points="52,6 36,56 46,56" fill="url(#bltSpec-t)"/>
          </svg>
        </div>
      </div>
    );
  }
);

export default LogoTransition;
