/**
 * LogoAnimation.tsx
 * ─────────────────────────────────────────────────────────────
 * Drop-in React transition component — fully transparent bg.
 *
 * Props
 * ──────────────────────────────────────────────────────────────
 *  autoPlay   boolean   Start immediately on mount  (default true)
 *  onComplete function  Called when outro finishes
 *  width      number    Arena width in px           (default 400)
 *  height     number    Arena height in px          (default 240)
 */

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

// ─── SVG sources as strings (avoids re-render costs) ─────────
const SVG_LEFT_BRACKET = `
<svg width="108" height="148" viewBox="0 0 108 152" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bktL" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#3a4d72"/>
      <stop offset="30%"  stop-color="#1e2d50"/>
      <stop offset="70%"  stop-color="#131d38"/>
      <stop offset="100%" stop-color="#0d1428"/>
    </linearGradient>
    <filter id="sdL">
      <feDropShadow dx="3" dy="5" stdDeviation="5" flood-color="#06091a" flood-opacity=".7"/>
    </filter>
  </defs>
  <g transform="translate(4,6)" opacity=".4" filter="url(#sdL)">
    <polygon points="86,8 96,8 96,28 22,76 22,80 96,128 96,148 86,148 10,96 10,80 10,64" fill="#0a1020"/>
  </g>
  <polygon points="86,8 96,8 96,28 22,76 22,80 96,128 96,148 86,148 10,96 10,80 10,64" fill="url(#bktL)"/>
  <line x1="96" y1="10" x2="24" y2="76" stroke="rgba(140,180,230,.2)" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const SVG_RIGHT_BRACKET = `
<svg width="108" height="148" viewBox="0 0 108 152" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bktR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#3a4d72"/>
      <stop offset="30%"  stop-color="#1e2d50"/>
      <stop offset="70%"  stop-color="#131d38"/>
      <stop offset="100%" stop-color="#0d1428"/>
    </linearGradient>
    <filter id="sdR">
      <feDropShadow dx="-3" dy="5" stdDeviation="5" flood-color="#06091a" flood-opacity=".7"/>
    </filter>
  </defs>
  <g transform="translate(-4,6)" opacity=".4" filter="url(#sdR)">
    <polygon points="22,8 12,8 12,28 86,76 86,80 12,128 12,148 22,148 98,96 98,80 98,64" fill="#0a1020"/>
  </g>
  <polygon points="22,8 12,8 12,28 86,76 86,80 12,128 12,148 22,148 98,96 98,80 98,64" fill="url(#bktR)"/>
  <line x1="12" y1="10" x2="84" y2="76" stroke="rgba(140,180,230,.2)" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const SVG_BOLT = `
<svg width="88" height="214" viewBox="0 0 80 200" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bltFill" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%"   stop-color="#3d50e8"/>
      <stop offset="40%"  stop-color="#2438cc"/>
      <stop offset="100%" stop-color="#131a88"/>
    </linearGradient>
    <linearGradient id="bltStroke" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%"   stop-color="#9966ff"/>
      <stop offset="50%"  stop-color="#4488ff"/>
      <stop offset="100%" stop-color="#00ccff"/>
    </linearGradient>
    <linearGradient id="bltGlow" x1="0%" y1="0%" x2="30%" y2="100%">
      <stop offset="0%"   stop-color="#aa77ff" stop-opacity=".55"/>
      <stop offset="50%"  stop-color="#3377ff" stop-opacity=".4"/>
      <stop offset="100%" stop-color="#00ccff" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="bltSpec" x1="0%" y1="0%" x2="100%" y2="60%">
      <stop offset="0%"   stop-color="#7788ff" stop-opacity=".8"/>
      <stop offset="100%" stop-color="#1a2299" stop-opacity="0"/>
    </linearGradient>
    <filter id="bltSd">
      <feDropShadow dx="2" dy="6" stdDeviation="5" flood-color="#040818" flood-opacity=".8"/>
    </filter>
    <filter id="strokeGlow" x="-30%" y="-10%" width="160%" height="120%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <polygon points="52,6 12,96 34,96 24,194 70,104 46,104"
    fill="#08102a" opacity=".5" transform="translate(3,7)"/>
  <polygon points="52,6 12,96 34,96 24,194 70,104 46,104"
    fill="none" stroke="url(#bltGlow)" stroke-width="7"
    stroke-linejoin="round" filter="url(#strokeGlow)" paint-order="stroke fill"/>
  <polygon points="52,6 12,96 34,96 24,194 70,104 46,104"
    fill="url(#bltFill)" stroke="url(#bltStroke)" stroke-width="2.2"
    stroke-linejoin="round" paint-order="stroke fill" filter="url(#bltSd)"/>
  <polygon points="52,6 36,56 46,56" fill="url(#bltSpec)"/>
  <line x1="48" y1="14" x2="30" y2="92"
    stroke="rgba(160,185,255,.18)" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

// ─── particle burst helper ────────────────────────────────────
const SPARK_PALETTE = [
  "#9966ff","#6677ff","#4488ff","#00ccff",
  "#ffffff","#bb99ff","#aaddff",
];

function spawnSparks(container: HTMLDivElement, cx: number, cy: number, count: number = 34) {
  const eOut = ease.outExpo;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    const ang = Math.random() * Math.PI * 2;
    const spd = 55 + Math.random() * 105;
    const w   = 1 + Math.random() * 5;
    const col = SPARK_PALETTE[i % SPARK_PALETTE.length];
    const dur = 400 + Math.random() * 380;
    const dx  = Math.cos(ang) * spd;
    const dy  = Math.sin(ang) * spd;

    Object.assign(el.style, {
      position:     "absolute",
      width:        `${w}px`,
      height:       `${w}px`,
      borderRadius: w > 3 ? "2px" : "50%",
      background:   col,
      left:         `${cx}px`,
      top:          `${cy}px`,
      opacity:      "1",
      transform:    "translate(-50%,-50%)",
      pointerEvents:"none",
      zIndex:       "18",
    });
    container.appendChild(el);

    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p  = clamp((ts - start) / dur, 0, 1);
      const ep = eOut(p);
      el.style.left    = `${cx + dx * ep}px`;
      el.style.top     = `${cy + dy * ep + 28 * p * p}px`;
      el.style.opacity = String(1 - p);
      p < 1 ? requestAnimationFrame(tick) : el.remove();
    };
    requestAnimationFrame(tick);
  }
}

// ─── ring pulse helper ────────────────────────────────────────
function spawnRings(canvas: HTMLCanvasElement, cx: number, cy: number) {
  const ctx  = canvas.getContext("2d");
  if (!ctx) return () => {};

  const defs = [
    { col: "153,102,255", maxR: 110 },
    { col: "68,136,255",  maxR: 138 },
    { col: "0,204,255",   maxR: 162 },
  ];
  const rings = defs.map((d) => ({ ...d, born: performance.now() }));

  const eOut = ease.outExpo;
  let rafId: number | null = null;

  const draw = (now: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const r of rings) {
      const t = clamp((now - r.born) / 650, 0, 1);
      if (t >= 1) continue;
      alive = true;
      ctx.beginPath();
      ctx.arc(cx, cy, r.maxR * eOut(t), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r.col},${((1 - t) * 0.85).toFixed(3)})`;
      ctx.lineWidth   = Math.max(0.5, 2.5 * (1 - t));
      ctx.stroke();
    }
    if (alive) {
      rafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  rafId = requestAnimationFrame(draw);
  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

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

// ─── Main component ───────────────────────────────────────────
const LogoTransition = forwardRef<LogoTransitionRef, LogoTransitionProps>(
  function LogoTransition(
    { autoPlay = true, onComplete, width = 400, height = 240, loop = false },
    ref
  ) {
    const arenaRef  = useRef<HTMLDivElement>(null);
    const glRef     = useRef<HTMLDivElement>(null);
    const grRef     = useRef<HTMLDivElement>(null);
    const gsRef     = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number | null>(null);
    const running   = useRef<boolean>(false);

    // ── reset all elements to pre-animation state ──────────────
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

      // clear sparks
      ar.querySelectorAll("[data-spark]").forEach((s) => s.remove());

      // clear canvas
      const cv = canvasRef.current;
      if (cv) {
        const ctx = cv.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
      }
    }, []);

    // ── main rAF animation loop ────────────────────────────────
    const play = useCallback(() => {
      if (running.current) return;
      running.current = true;
      reset();

      const gl = glRef.current;
      const gr = grRef.current;
      const gs = gsRef.current;
      const ar = arenaRef.current;
      const cv = canvasRef.current;
      if (!gl || !gr || !gs || !ar || !cv) return;

      // mark sparks so reset() can clear them
      const origSpawn = (cx: number, cy: number) => {
        const PALETTE = SPARK_PALETTE;
        const eOut = ease.outExpo;
        for (let i = 0; i < 34; i++) {
          const el  = document.createElement("div");
          el.dataset.spark = "1";
          const ang = Math.random() * Math.PI * 2;
          const spd = 55 + Math.random() * 105;
          const w   = 1 + Math.random() * 5;
          const col = PALETTE[i % PALETTE.length];
          const dur = 400 + Math.random() * 380;
          const dx  = Math.cos(ang) * spd;
          const dy  = Math.sin(ang) * spd;
          Object.assign(el.style, {
            position: "absolute", width: `${w}px`, height: `${w}px`,
            borderRadius: w > 3 ? "2px" : "50%", background: col,
            left: `${cx}px`, top: `${cy}px`, opacity: "1",
            transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: "18",
          });
          ar.appendChild(el);
          let st: number | null = null;
          const tick = (ts: number) => {
            if (!st) st = ts;
            const p = clamp((ts - st) / dur, 0, 1);
            const ep = eOut(p);
            el.style.left    = `${cx + dx * ep}px`;
            el.style.top     = `${cy + dy * ep + 28 * p * p}px`;
            el.style.opacity = String(1 - p);
            p < 1 ? requestAnimationFrame(tick) : el.remove();
          };
          requestAnimationFrame(tick);
        }
      };

      // ring cleanup ref
      let stopRings: (() => void) | null = null;

      let impactFired = false;
      let shakeStart: number | null  = null;
      let holdStart: number | null   = null;
      const CX = width  / 2;  // ring / spark centre X
      const CY = height / 2;  // ring / spark centre Y

      const T0 = performance.now();

      const frame = (now: number) => {
        const el = now - T0;

        // ── brackets in ─────────────────────────────────────────
        {
          const t  = clamp(el / TL.bktDur, 0, 1);
          const ox = lerp(440, 0, ease.outBack(t));
          const oa = clamp(t * 4, 0, 1);
          gl.style.transform = `translateY(-50%) translateX(${-ox}px)`;
          gl.style.opacity   = String(oa);
          gr.style.transform = `translateY(-50%) translateX(${ox}px)`;
          gr.style.opacity   = String(oa);
        }

        // ── bolt in ─────────────────────────────────────────────
        if (el >= TL.bltDelay) {
          const t  = clamp((el - TL.bltDelay) / TL.bltDur, 0, 1);
          const sc = ease.outElastic(t);
          const ro = lerp(-14, 0, ease.outExpo(t));
          gs.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(4)}) rotate(${ro.toFixed(2)}deg)`;
          gs.style.opacity   = String(clamp(t * 5, 0, 1));
        }

        // ── impact ──────────────────────────────────────────────
        if (el >= TL.impactAt && !impactFired) {
          impactFired = true;
          shakeStart  = now;
          stopRings   = spawnRings(cv, CX, CY);
          origSpawn(CX, CY);
          // secondary small burst (whites)
          spawnSparks(ar, CX, CY, 12);
        }

        // ── shake ───────────────────────────────────────────────
        if (shakeStart !== null && el < TL.outroAt) {
          const st = clamp((now - shakeStart) / TL.shakeDur, 0, 1);
          if (st < 1) {
            const decay = 1 - ease.outExpo(st);
            const mag   = 9 * decay;
            ar.style.transform = `translate(${(Math.sin(now * 0.088) * mag).toFixed(2)}px,${(Math.cos(now * 0.065) * mag * 0.5).toFixed(2)}px)`;
            const ca = Math.round(decay * 5);
            gs.style.filter = ca > 1
              ? `drop-shadow(${ca}px 0 rgba(153,102,255,.5)) drop-shadow(-${ca}px 0 rgba(0,204,255,.45))`
              : "";
          } else {
            ar.style.transform = "";
            gs.style.filter    = "";
            holdStart = now;
          }
        }

        // ── hold pulse ──────────────────────────────────────────
        if (holdStart !== null && el < TL.outroAt) {
          const flick = (Math.sin((now - holdStart) * 0.016) * 0.1 + 1).toFixed(3);
          gs.style.filter = `brightness(${flick})`;
        }

        // ── outro ───────────────────────────────────────────────
        if (el >= TL.outroAt) {
          gs.style.filter = "";
          const ot = clamp((el - TL.outroAt) / TL.outroDur, 0, 1);
          gs.style.transform = `translate(-50%,-50%) scale(${lerp(1, 0, ease.inExpo(ot)).toFixed(4)}) rotate(${lerp(0, 18, ease.inBack(ot)).toFixed(2)}deg)`;
          gs.style.opacity   = String(clamp(1 - ot * 2, 0, 1));
          gs.style.filter    = `brightness(${lerp(1, 2.8, clamp(ot * 1.8, 0, 1)).toFixed(2)})`;

          const bt = clamp((el - TL.outroAt - 100) / TL.outroDur, 0, 1);
          const bx = lerp(0, 440, ease.inExpo(bt));
          gl.style.transform = `translateY(-50%) translateX(${-bx}px)`;
          gl.style.opacity   = String(clamp(1 - bt * 1.8, 0, 1));
          gr.style.transform = `translateY(-50%) translateX(${bx}px)`;
          gr.style.opacity   = String(clamp(1 - bt * 1.8, 0, 1));
        }

        // ── done ────────────────────────────────────────────────
        if (el >= TL.doneAt) {
          if (stopRings) stopRings();
          reset();
          running.current = false;
          onComplete?.();
          if (loop) {
            play();
          }
          return;
        }

        rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);
    }, [reset, onComplete, width, height, loop]);

    // expose play() via ref
    useImperativeHandle(ref, () => ({ play }), [play]);

    // auto-play on mount
    useEffect(() => {
      if (autoPlay) play();
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        running.current = false;
      };
    }, [autoPlay, play]);                             // intentionally run once

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
        {/* ring canvas */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 20,
          }}
        />

        {/* LEFT < bracket */}
        <div
          ref={glRef}
          dangerouslySetInnerHTML={{ __html: SVG_LEFT_BRACKET }}
          style={{
            position: "absolute",
            left: 34,
            top: "50%",
            transform: "translateY(-50%) translateX(-440px)",
            opacity: 0,
            willChange: "transform,opacity",
          }}
        />

        {/* RIGHT > bracket */}
        <div
          ref={grRef}
          dangerouslySetInnerHTML={{ __html: SVG_RIGHT_BRACKET }}
          style={{
            position: "absolute",
            right: 34,
            top: "50%",
            transform: "translateY(-50%) translateX(440px)",
            opacity: 0,
            willChange: "transform,opacity",
          }}
        />

        {/* ENERGY bolt — taller than brackets */}
        <div
          ref={gsRef}
          dangerouslySetInnerHTML={{ __html: SVG_BOLT }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%) scale(0) rotate(-14deg)",
            opacity: 0,
            filter: "none",
            willChange: "transform,opacity,filter",
          }}
        />
      </div>
    );
  }
);

export default LogoTransition;
