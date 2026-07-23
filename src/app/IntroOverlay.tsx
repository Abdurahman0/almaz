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
const RPS_IDLE = 1 / 7; // centered hold: visibly alive, still elegant
const RPS_ROCKET = 0.5 / (FLIGHT_MS / 1000); // fast half-turn during the flight

/*
 * The hole's clear aperture varies with rotation (band sweeps through it when
 * edge-on). Measured per frame (half-widths in 512-frame coords): the widest
 * open arc runs frames 11-17 [56,64,68,70,68,62,56]. The hold snaps to frame
 * 11; at 1/7 rps the visible word window (~1.47s: reveal 550ms + hold 800ms
 * with the shimmer running inside it + fade 120ms) sweeps ~6.3 frames,
 * staying inside the arc — crossfade pairs bottom out at ~46px half-width, so
 * the text box is sized to that worst pair and no letter is ever covered.
 */
const HOLD_ANGLE = 11 / 30;

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
    const S = mobile ? 0.4 * vw : Math.min(0.72 * vh, 660);
    // ring center starts at the EXACT top-right corner point (100vw, 0):
    // initially clipped by the corner, growing out of it
    const x0 = vw / 2;
    const y0 = -(vh / 2);

    // canvas spin loop with mutable angular velocity; frames are guaranteed
    // decoded before this is called
    const startSpin = (frames: ImageBitmap[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = S * dpr;
      canvas.height = S * dpr;
      ctx.imageSmoothingQuality = 'high';
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
    const run = async () => {
      // Decode-before-frame-one: every spin frame is an ImageBitmap in memory
      // before any animation starts — no mid-flight decode stutter.
      try {
        const frames = await getRingFrames(assetPath);
        if (disposed) return;
        startSpin(frames);
      } catch {
        onDone(); // frames unavailable: skip straight to final state
        return;
      }
      // Every awaited step is raced against a deadline: a driver that fails
      // to start (seen with framer's backgroundPosition path in prod) must
      // never stall the whole timeline.
      const guard = (p: PromiseLike<unknown> | unknown, ms: number) =>
        Promise.race([Promise.resolve(p as PromiseLike<unknown>), new Promise<void>((r) => setTimeout(r, ms + 400))]);
      const step = (el: string, kf: object, opts: object) =>
        skippedRef.current || disposed ? Promise.resolve() : animate(el as never, kf as never, opts as never);

      // Phase 1 — calm entrance from beyond the top-right corner, gentle arc,
      // growing 120px -> S, decelerating into a soft stop.
      rpsRef.current = RPS_ENTER;
      const backdropIn = step('.intro-backdrop', { opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
      const glowIn = step('.intro-glow', { opacity: [0, 1] }, { duration: 0.6, ease: 'easeOut', delay: 0.7 });
      await guard(
        step(
          '.intro-ring',
          { x: [x0, x0 * 0.32, 0], y: [y0, y0 * 0.7, 0], scale: [120 / S, 0.52, 1] },
          { duration: ENTER_MS / 1000, ease: [0.16, 0.8, 0.26, 1], times: [0, 0.48, 1] },
        ),
        ENTER_MS,
      );
      await guard(Promise.all([backdropIn, glowIn]), 1300);

      // Phase 2 — hold; wordmark composes inside the ring's hole. Snap to the
      // start of the open-aperture arc so the whole word window (reveal +
      // hold with the shimmer inside it + fade) drifts within it at 1/7 rps.
      angleRef.current = HOLD_ANGLE;
      rpsRef.current = RPS_IDLE;
      await guard(
        step(
          '.intro-word',
          { opacity: [0, 1], letterSpacing: ['0.3em', '0.05em'] },
          { duration: WORD_MS / 1000, ease: 'easeOut' },
        ),
        WORD_MS,
      );
      // one shimmer sweep, running concurrently inside the hold — native WAAPI
      // (framer's backgroundPosition driver silently never started in prod)
      if (!skippedRef.current && !disposed) {
        document
          .querySelector('.intro-word')
          ?.animate(
            [{ backgroundPosition: '150% 0%' }, { backgroundPosition: '-50% 0%' }],
            { duration: SHIMMER_MS, easing: 'ease-in-out', fill: 'forwards' },
          );
      }
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, HOLD_MS));

      // Phase 3 — rocket exit
      await guard(step('.intro-word', { opacity: 0 }, { duration: WORD_OUT_MS / 1000 }), WORD_OUT_MS);
      const slot = document.querySelector('[data-intro-logo-slot]');
      const slotRect = slot ? slot.getBoundingClientRect() : null;

      // micro-anticipation: tiny shift right + 1.02 before the launch
      await guard(
        step('.intro-ring', { x: S * 0.02, scale: 1.02 }, { duration: ANTICIPATION_MS / 1000, ease: 'easeOut' }),
        ANTICIPATION_MS,
      );

      rpsRef.current = RPS_ROCKET;
      const backdropOut = step('.intro-backdrop', { opacity: 0 }, { duration: 0.3, ease: 'easeOut' });
      const glowOut = step('.intro-glow', { opacity: 0 }, { duration: 0.2, ease: 'easeOut' });
      if (slotRect && slotRect.width > 0) {
        const dx = slotRect.x + slotRect.width / 2 - vw / 2;
        const dy = slotRect.y + slotRect.height / 2 - vh / 2;
        const target = slotRect.width / S;
        await guard(
          step(
            '.intro-ring',
            { x: dx, y: dy, scale: target * 1.04 },
            { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] },
          ),
          FLIGHT_MS,
        );
        rpsRef.current = 1 / 7; // relax to the sidebar idle speed on landing
        await guard(step('.intro-ring', { scale: target }, { duration: SETTLE_MS / 1000, ease: 'easeOut' }), SETTLE_MS);
      } else {
        // mobile / no visible slot: rocket off-left, shrinking and fading
        await guard(
          step(
            '.intro-ring',
            { x: -vw * 0.7, scale: 0.15, opacity: 0 },
            { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] },
          ),
          FLIGHT_MS,
        );
      }
      await guard(Promise.all([backdropOut, glowOut]), 320);
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
  const S = vw <= 640 ? 0.4 * vw : Math.min(0.72 * vh, 660);
  // the render's visible ring center is offset inside its square frame
  const holeCx = -0.15 * S;
  const holeCy = -0.02 * S;

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      {/* plain color dim — backdrop-filter blur repaints the whole page under
          it on every animation frame and was the primary jank source */}
      <div
        className="intro-backdrop absolute inset-0 opacity-0"
        style={{ background: 'color-mix(in srgb, var(--bg) 78%, transparent)' }}
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
        style={{
          left: vw / 2 - S / 2,
          top: vh / 2 - S / 2,
          width: S,
          height: S,
          willChange: 'transform',
          // parked at the exact corner point until the timeline's first frame
          // (frames decode-await happens before animation start)
          transform: `translate(${vw / 2}px, ${-vh / 2}px) scale(${120 / S})`,
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" style={{ width: S, height: S }} />
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
