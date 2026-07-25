import { useEffect, useRef } from 'react';
import { useAnimate, animate as animateValue } from 'framer-motion';
import { useIntroStore } from '@/shared/stores/intro';
import { getRingFrames, frameIndexFor, GEM_FRAME, FRAME_COUNT } from '@/shared/lib/ringFrames';

/*
 * One-time post-login intro (v2 assets — 180-frame turntable).
 *
 * Corner → center → dive → rocket:
 *  - enters from beyond the top-right corner, rotating slowly INTO the
 *    gem-facing pose so the first clear look is the gem toward the viewer;
 *  - settles at 72vh exactly on GEM_FRAME (gem to camera, band inner side
 *    open), then DIVES to a 230vh close-up on that frozen pose;
 *  - the "Almaz / Silver" lockup composes over a scrim (screen-fixed, so it
 *    is not scaled by the ring);
 *  - rockets to the sidebar logo slot (FLIP recomputed from the zoomed state).
 *
 * The ring is a canvas drawn from decoded 1200px frames with plain per-frame
 * stepping — 180 frames are natively smooth, no crossfade.
 */

const ENTER_MS = 1400;
const SETTLE_BEAT_MS = 160;
const DIVE_MS = 560;
const WORD_MS = 550;
const SHIMMER_MS = 500;
const HOLD_MS = 800;
const WORD_OUT_MS = 120;
const ANTICIPATION_MS = 60;
const FLIGHT_MS = 340;
const SETTLE_MS = 80;

// GEM_FRAME as a rotation fraction; the entrance lands here exactly.
const GEM_ANGLE = GEM_FRAME / FRAME_COUNT;
// Enter rotating ~0.4 turn INTO the gem pose (starts near a side view).
const ENTER_START_ANGLE = GEM_ANGLE - 0.4;
// rotations/sec for the rocket spin burst (~half a turn across the flight).
const RPS_ROCKET = 0.5 / (FLIGHT_MS / 1000);

function IntroSequence({ assetPath = '/', onDone }: { assetPath?: string; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(ENTER_START_ANGLE);
  const spinRef = useRef(false); // when true the rAF loop integrates rps
  const rpsRef = useRef(0);
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
    const diveScale = (2.3 * vh) / S; // 230vh close-up
    const START = 120;
    const x0 = vw / 2 + START / 2; // fully outside past the top-right corner
    const y0 = -(vh / 2) - START / 2;

    const startSpin = (frames: ImageBitmap[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(S * dpr);
      canvas.height = Math.round(S * dpr);
      ctx.imageSmoothingQuality = 'high';
      let lastT: number | null = null;
      const tick = (now: number) => {
        if (disposed) return;
        if (spinRef.current && lastT !== null) angleRef.current += ((now - lastT) / 1000) * rpsRef.current;
        lastT = now;
        const idx = frameIndexFor(angleRef.current);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames[idx], 0, 0, canvas.width, canvas.height);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const run = async () => {
      let frames: ImageBitmap[];
      try {
        frames = await getRingFrames(assetPath);
        if (disposed) return;
        startSpin(frames);
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        if (disposed) return;
      } catch {
        onDone();
        return;
      }
      const guard = (p: PromiseLike<unknown> | unknown, ms: number) =>
        Promise.race([Promise.resolve(p as PromiseLike<unknown>), new Promise<void>((r) => setTimeout(r, ms + 400))]);
      const step = (el: string, kf: object, opts: object) =>
        skippedRef.current || disposed ? Promise.resolve() : animate(el as never, kf as never, opts as never);

      // Phase 1 — entrance: one single position+scale tween corner→center, and
      // a synced rotation tween that lands EXACTLY on GEM_FRAME (arrival is
      // gem-facing, no snap/jump).
      spinRef.current = false;
      const angleTween = animateValue(ENTER_START_ANGLE, GEM_ANGLE, {
        duration: ENTER_MS / 1000,
        ease: [0.2, 0.7, 0.3, 1],
        onUpdate: (v) => {
          if (!skippedRef.current) angleRef.current = v;
        },
      });
      const backdropIn = step('.intro-backdrop', { opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
      await guard(
        step(
          '.intro-ring',
          { x: [x0, 0], y: [y0, 0], scale: [START / S, 1] },
          { duration: ENTER_MS / 1000, ease: [0.2, 0.7, 0.3, 1] },
        ),
        ENTER_MS,
      );
      angleRef.current = GEM_ANGLE; // guarantee frozen exactly on the gem frame
      angleTween.stop();
      await guard(backdropIn, 400);

      // small settle beat on the gem pose
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, SETTLE_BEAT_MS));

      // Phase 2 — dive to the 230vh close-up on the frozen gem frame; scrim +
      // lockup fade in (screen-fixed, not scaled by the ring)
      const scrimIn = step('.intro-scrim', { opacity: [0, 1] }, { duration: DIVE_MS / 1000, ease: 'easeOut' });
      await guard(
        step('.intro-ring', { scale: diveScale }, { duration: DIVE_MS / 1000, ease: [0.16, 0.8, 0.26, 1] }),
        DIVE_MS,
      );
      await guard(
        step('.intro-word', { opacity: [0, 1], letterSpacing: ['0.3em', '0.05em'] }, { duration: WORD_MS / 1000, ease: 'easeOut' }),
        WORD_MS,
      );
      if (!skippedRef.current && !disposed) {
        document
          .querySelector('.intro-word')
          ?.animate([{ backgroundPosition: '150% 0%' }, { backgroundPosition: '-50% 0%' }], {
            duration: SHIMMER_MS,
            easing: 'ease-in-out',
            fill: 'forwards',
          });
      }
      await guard(scrimIn, DIVE_MS);
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, HOLD_MS));

      // Phase 3 — rocket exit (FLIP from the zoomed state)
      const lockoutOut = step('.intro-lockup', { opacity: 0 }, { duration: WORD_OUT_MS / 1000 });
      const slot = document.querySelector('[data-intro-logo-slot]');
      const slotRect = slot ? slot.getBoundingClientRect() : null; // measured now, at flight start
      await guard(lockoutOut, WORD_OUT_MS);

      // micro-anticipation before the launch
      await guard(step('.intro-ring', { scale: diveScale * 1.02 }, { duration: ANTICIPATION_MS / 1000, ease: 'easeOut' }), ANTICIPATION_MS);

      spinRef.current = true;
      rpsRef.current = RPS_ROCKET;
      const backdropOut = step('.intro-backdrop', { opacity: 0 }, { duration: 0.3, ease: 'easeOut' });
      if (slotRect && slotRect.width > 0) {
        const dx = slotRect.x + slotRect.width / 2 - vw / 2;
        const dy = slotRect.y + slotRect.height / 2 - vh / 2;
        const target = slotRect.width / S;
        await guard(
          step('.intro-ring', { x: dx, y: dy, scale: target * 1.04 }, { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] }),
          FLIGHT_MS,
        );
        spinRef.current = false;
        await guard(step('.intro-ring', { scale: target }, { duration: SETTLE_MS / 1000, ease: 'easeOut' }), SETTLE_MS);
      } else {
        await guard(
          step('.intro-ring', { x: -vw * 0.7, scale: 0.12, opacity: 0 }, { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] }),
          FLIGHT_MS,
        );
      }
      await guard(backdropOut, 320);
      if (!disposed) onDone();
    };

    void run();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ranRef.current = false;
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [animate, assetPath, onDone]);

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const S = vw <= 640 ? 0.4 * vw : Math.min(0.72 * vh, 660);
  const START = 120;
  const wordSize = Math.min(vw, vh) * 0.05;

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      {/* dim the dashboard beneath */}
      <div
        className="intro-backdrop absolute inset-0 opacity-0"
        style={{ background: 'color-mix(in srgb, var(--bg) 78%, transparent)' }}
      />
      {/* ring canvas — parked fully outside beyond the top-right corner */}
      <div
        className="intro-ring fixed"
        style={{
          left: vw / 2 - S / 2,
          top: vh / 2 - S / 2,
          width: S,
          height: S,
          willChange: 'transform',
          transform: `translate(${vw / 2 + START / 2}px, ${-vh / 2 - START / 2}px) scale(${START / S})`,
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" style={{ width: S, height: S }} />
      </div>
      {/* screen-fixed lockup: scrim + wordmark, dead-centered, never scaled */}
      <div className="intro-lockup fixed inset-0 grid place-items-center">
        <div className="relative grid place-items-center">
          <div
            className="intro-scrim absolute opacity-0"
            style={{
              width: vw * 0.6,
              height: vh * 0.34,
              background: 'radial-gradient(closest-side, color-mix(in srgb, var(--bg) 82%, transparent), transparent 72%)',
            }}
          />
          <span
            className="intro-word relative inline-block whitespace-nowrap text-center font-semibold opacity-0"
            style={{
              fontSize: wordSize,
              lineHeight: 1.1,
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
  const gatingRef = useRef(false);

  // Readiness gate: never start the intro without decoded frames, never block
  // the dashboard. Wait up to 1200ms; else skip silently this session.
  useEffect(() => {
    if (stage !== 'pending' || gatingRef.current) return;
    gatingRef.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    let settled = false;
    const done = (ready: boolean) => {
      if (settled) return;
      settled = true;
      if (ready) begin();
      else finish();
    };
    const timer = window.setTimeout(() => done(false), 1200);
    getRingFrames()
      .then(() => done(true))
      .catch(() => done(false))
      .finally(() => window.clearTimeout(timer));
    return () => window.clearTimeout(timer);
  }, [stage, begin, finish]);

  if (stage !== 'playing') return null;
  return <IntroSequence onDone={finish} />;
}
