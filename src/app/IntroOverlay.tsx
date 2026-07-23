import { useEffect, useRef } from 'react';
import { useAnimate } from 'framer-motion';
import { useIntroStore } from '@/shared/stores/intro';
import { getRingFrames } from '@/shared/lib/ringFrames';

/*
 * One-time post-login intro.
 *
 * Calm in, rocket out: the ring drifts in from beyond the top-right corner
 * spinning slowly (~0.4 rotation across the whole entrance), settles huge at
 * center over an accent glow, the "Almaz / Silver" wordmark composes INSIDE
 * the ring's hole, holds — then launches leftward violently fast with a spin
 * burst and accent speed streaks, FLIP-landing on the sidebar logo slot where
 * the permanent 14s/rotation canvas ring takes over.
 *
 * The ring itself is a canvas fed by pre-extracted spin frames with
 * adjacent-frame crossfade, driven by a mutable angular velocity — smooth at
 * every phase speed, no video seek jank.
 */

const ENTER_MS = 1400;
const WORD_MS = 550;
const SHIMMER_MS = 500;
const HOLD_MS = 800;
const WORD_OUT_MS = 120;
const ANTICIPATION_MS = 60;
const FLIGHT_MS = 320;
const SETTLE_MS = 80;

// rotations per second per phase
const RPS_ENTER = 0.4 / (ENTER_MS / 1000); // ~0.29 — 0.4 rotation over the entrance
const RPS_IDLE = 1 / 12; // majestic centered hold
const RPS_ROCKET = 0.5 / (FLIGHT_MS / 1000); // fast half-turn during the flight

/*
 * The hole's clear aperture varies with rotation (band sweeps through it when
 * edge-on). Measured per frame: widest open arc is frames 12-17 of 30
 * (half-width 56-70px in 512-frame coords). The entrance's 0.4 rotation from
 * angle 0 arrives exactly there; the hold is snapped to frame 12 and its
 * 12s/rot drift stays inside the arc for the whole ~2s word window, so no
 * letter is ever covered by the band. Text box = the arc's minimum clear
 * aperture (112x69 frame-px) scaled to the ring size.
 */
const HOLD_ANGLE = 12 / 30;

function IntroSequence({ assetPath = '/', onDone }: { assetPath?: string; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rpsRef = useRef(RPS_ENTER);
  const angleRef = useRef(0); // rotations; 0 -> entrance lands at frame 12
  const ranRef = useRef(false);
  const skippedRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone();
      return;
    }

    let disposed = false;
    let raf = 0;
    const skip = () => {
      if (skippedRef.current) return;
      skippedRef.current = true;
      onDone();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', onKey, true);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw <= 640;
    const S = mobile ? 0.4 * vw : Math.min(0.62 * vh, 560);
    // ring center starts beyond the top-right corner: (+8vw, -8vh) past it
    const x0 = vw * 0.58; // (1.08vw) - vw/2
    const y0 = -(vh * 0.58); // (-0.08vh) - vh/2

    // canvas spin loop with mutable angular velocity
    const startSpin = async () => {
      const frames = await getRingFrames(assetPath);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = S * dpr;
      canvas.height = S * dpr;
      let lastT: number | null = null;
      const tick = (now: number) => {
        if (disposed) return;
        if (lastT !== null) angleRef.current += ((now - lastT) / 1000) * rpsRef.current;
        lastT = now;
        const n = frames.length;
        const f = (((angleRef.current % 1) + 1) % 1) * n;
        const a = Math.floor(f) % n;
        const b = (a + 1) % n;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.drawImage(frames[a], 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = f - Math.floor(f);
        ctx.drawImage(frames[b], 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    void startSpin();

    const run = async () => {
      const step = (el: string, kf: object, opts: object) =>
        skippedRef.current || disposed ? Promise.resolve() : animate(el as never, kf as never, opts as never);

      // Phase 1 — calm entrance from beyond the top-right corner, gentle arc,
      // growing 120px -> S, decelerating into a soft stop.
      rpsRef.current = RPS_ENTER;
      const backdropIn = step('.intro-backdrop', { opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
      const glowIn = step('.intro-glow', { opacity: [0, 1] }, { duration: 0.6, ease: 'easeOut', delay: 0.7 });
      await step(
        '.intro-ring',
        { x: [x0, x0 * 0.32, 0], y: [y0, y0 * 0.7, 0], scale: [120 / S, 0.52, 1] },
        { duration: ENTER_MS / 1000, ease: [0.16, 0.8, 0.26, 1], times: [0, 0.48, 1] },
      );
      await Promise.all([backdropIn, glowIn]);

      // Phase 2 — majestic hold; wordmark composes inside the ring's hole.
      // Snap to the face-on frame so the ~2s word window drifts only within
      // the measured open-aperture arc (frames 12-17).
      angleRef.current = HOLD_ANGLE;
      rpsRef.current = RPS_IDLE;
      await step(
        '.intro-word',
        { opacity: [0, 1], letterSpacing: ['0.3em', '0.05em'] },
        { duration: WORD_MS / 1000, ease: 'easeOut' },
      );
      // one shimmer sweep across the letters
      await step(
        '.intro-word',
        { backgroundPosition: ['150% 0%', '-50% 0%'] },
        { duration: SHIMMER_MS / 1000, ease: 'easeInOut' },
      );
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, HOLD_MS));

      // Phase 3 — rocket exit
      await step('.intro-word', { opacity: 0 }, { duration: WORD_OUT_MS / 1000 });
      const slot = document.querySelector('[data-intro-logo-slot]');
      const slotRect = slot ? slot.getBoundingClientRect() : null;

      // micro-anticipation: tiny shift right + 1.02 before the launch
      await step(
        '.intro-ring',
        { x: S * 0.02, scale: 1.02 },
        { duration: ANTICIPATION_MS / 1000, ease: 'easeOut' },
      );

      rpsRef.current = RPS_ROCKET;
      const streaks = step('.intro-streaks', { opacity: [0, 0.85] }, { duration: 0.08 });
      const backdropOut = step('.intro-backdrop', { opacity: 0 }, { duration: 0.3, ease: 'easeOut' });
      const glowOut = step('.intro-glow', { opacity: 0 }, { duration: 0.2, ease: 'easeOut' });
      if (slotRect && slotRect.width > 0) {
        const dx = slotRect.x + slotRect.width / 2 - vw / 2;
        const dy = slotRect.y + slotRect.height / 2 - vh / 2;
        const target = slotRect.width / S;
        await step(
          '.intro-ring',
          { x: dx, y: dy, scale: target * 1.04 },
          { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] },
        );
        rpsRef.current = RPS_IDLE;
        const settle = step('.intro-ring', { scale: target }, { duration: SETTLE_MS / 1000, ease: 'easeOut' });
        const streaksOut = step('.intro-streaks', { opacity: 0 }, { duration: 0.15 });
        await Promise.all([settle, streaksOut]);
      } else {
        // mobile / no visible slot: rocket off-left, shrinking and fading
        await step(
          '.intro-ring',
          { x: -vw * 0.7, scale: 0.15, opacity: 0 },
          { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] },
        );
        await step('.intro-streaks', { opacity: 0 }, { duration: 0.15 });
      }
      await Promise.all([backdropOut, glowOut, streaks]);
      if (!disposed) onDone();
    };

    void run();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      // StrictMode replays mount effects: let the replay start a fresh run
      // (this closure's run() is dead — every step checks `disposed`).
      ranRef.current = false;
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [animate, assetPath, onDone]);

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const S = vw <= 640 ? 0.4 * vw : Math.min(0.62 * vh, 560);
  // the render's visible ring center is offset inside its square frame
  const holeCx = -0.15 * S;
  const holeCy = -0.02 * S;

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      <div
        className="intro-backdrop absolute inset-0 opacity-0 backdrop-blur-[3px]"
        style={{ background: 'color-mix(in srgb, var(--bg) 65%, transparent)' }}
      />
      {/* ambient accent glow anchored under the ring's visible center */}
      <div
        className="intro-glow absolute opacity-0"
        style={{
          left: vw / 2 + holeCx - S * 0.75,
          top: vh / 2 + holeCy - S * 0.75,
          width: S * 1.5,
          height: S * 1.5,
          background:
            'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%)',
        }}
      />
      <div
        className="intro-ring absolute"
        style={{ left: vw / 2 - S / 2, top: vh / 2 - S / 2, width: S, height: S }}
      >
        <canvas ref={canvasRef} className="h-full w-full" style={{ width: S, height: S }} />
        {/* speed streaks trail to the right while rocketing left */}
        <div
          className="intro-streaks absolute opacity-0"
          style={{ left: '55%', top: `${50 + (holeCy / S) * 100}%`, width: S * 1.6, height: 2 }}
        >
          {[-0.09, 0, 0.09].map((dy) => (
            <span
              key={dy}
              className="absolute block h-px w-full"
              style={{
                top: dy * S,
                background:
                  'linear-gradient(90deg, color-mix(in srgb, var(--accent) 70%, var(--text)) 0%, transparent 90%)',
              }}
            />
          ))}
        </div>
        {/* wordmark inside the ring's hole, above the frames */}
        <div
          className="absolute text-center"
          style={{ left: `calc(50% + ${holeCx}px)`, top: `calc(50% + ${holeCy}px)`, transform: 'translate(-50%, -50%)' }}
        >
          <span
            className="intro-word inline-block whitespace-nowrap font-semibold opacity-0"
            style={{
              // sized to the minimum clear hole aperture across the held
              // rotation arc: 112x69 of 512 -> ~0.2S wide box, two lines
              fontSize: S * 0.054,
              lineHeight: 1.15,
              letterSpacing: '0.3em',
              color: 'transparent',
              backgroundImage:
                'linear-gradient(100deg, var(--text) 42%, color-mix(in srgb, var(--accent) 80%, white) 50%, var(--text) 58%)',
              backgroundSize: '250% 100%',
              backgroundPosition: '150% 0%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            Almaz
            <br />
            Silver
          </span>
        </div>
      </div>
      <p className="absolute bottom-6 right-8 text-xs text-muted opacity-60">O'tkazib yuborish</p>
    </div>
  );
}

export function IntroOverlay() {
  const stage = useIntroStore((s) => s.stage);
  const begin = useIntroStore((s) => s.begin);
  const finish = useIntroStore((s) => s.finish);

  useEffect(() => {
    if (stage === 'pending') begin();
  }, [stage, begin]);

  if (stage !== 'playing') return null;
  return <IntroSequence onDone={finish} />;
}
