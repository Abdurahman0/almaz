import { useEffect, useRef } from 'react';
import { useAnimate } from 'framer-motion';
import { useIntroStore } from '@/shared/stores/intro';

/*
 * One-time post-login intro: the 3D ring enters from the top-right corner,
 * grows to center stage over a dimmed dashboard, the "Almaz Silver" wordmark
 * composes beneath it, then the ring flies into the sidebar's logo slot
 * (FLIP-measured at flight start) where the permanent slow-spinning logo
 * takes over. Runs once per login; skippable; reduced-motion skips entirely.
 */

const ENTER_MS = 1400;
const WORD_MS = 600;
const UNDERLINE_MS = 300;
const HOLD_MS = 700;
const WORD_OUT_MS = 200;
const FLIGHT_MS = 450;
const SETTLE_MS = 150;

function IntroSequence({ assetPath = '/', onDone }: { assetPath?: string; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
    const skip = () => {
      if (skippedRef.current) return;
      skippedRef.current = true;
      onDone(); // final state: overlay gone, sidebar ring already permanent
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', onKey, true);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw <= 640;
    const S = mobile ? 0.4 * vw : Math.min(0.46 * vh, 420);
    const x0 = vw / 2 + S;
    const y0 = -(vh / 2) - S;

    const video = videoRef.current;
    if (video) {
      video.playbackRate = 0.5; // slow spin on entrance
      video.play().catch(() => {});
    }

    const run = async () => {
      const step = (el: string | Element, kf: object, opts: object) =>
        skippedRef.current || disposed ? Promise.resolve() : animate(el as never, kf as never, opts as never);

      // Phase 1 — entrance along a subtle arc, scaling 120px -> S
      const backdropIn = step('.intro-backdrop', { opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
      await step(
        '.intro-ring',
        { x: [x0, x0 * 0.3, 0], y: [y0, y0 * 0.72, 0], scale: [120 / S, 0.55, 1] },
        { duration: ENTER_MS / 1000, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.5, 1] },
      );
      await backdropIn;

      // Phase 2 — wordmark composes; rotation turns majestic
      if (video && !skippedRef.current) video.playbackRate = 0.3;
      const word = step(
        '.intro-word',
        { opacity: [0, 1], letterSpacing: ['0.3em', '0.06em'] },
        { duration: WORD_MS / 1000, ease: 'easeOut' },
      );
      await new Promise((r) => setTimeout(r, WORD_MS * 0.5));
      const underline = step(
        '.intro-underline',
        { scaleX: [0, 1] },
        { duration: UNDERLINE_MS / 1000, ease: 'easeOut' },
      );
      await Promise.all([word, underline]);
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, HOLD_MS));

      // Phase 3 — wordmark out, ring flies to the sidebar slot (FLIP)
      await step('.intro-word-wrap', { opacity: 0 }, { duration: WORD_OUT_MS / 1000 });
      if (video && !skippedRef.current) video.playbackRate = 0.5;

      const slot = document.querySelector('[data-intro-logo-slot]');
      const slotRect = slot ? slot.getBoundingClientRect() : null;
      const backdropOut = step('.intro-backdrop', { opacity: 0 }, { duration: 0.4, ease: 'easeOut' });
      if (slotRect && slotRect.width > 0) {
        const dx = slotRect.x + slotRect.width / 2 - vw / 2;
        const dy = slotRect.y + slotRect.height / 2 - vh / 2;
        const target = slotRect.width / S;
        await step(
          '.intro-ring',
          { x: dx, y: dy, scale: target * 1.03 },
          { duration: FLIGHT_MS / 1000, ease: [0.6, 0.05, 0.2, 1] },
        );
        await step('.intro-ring', { scale: target }, { duration: SETTLE_MS / 1000, ease: 'easeOut' });
      } else {
        // mobile / no visible slot: recede and fade
        await step(
          '.intro-ring',
          { scale: 0.2, opacity: 0, y: -vh * 0.2 },
          { duration: 0.35, ease: [0.6, 0.05, 0.2, 1] },
        );
      }
      await backdropOut;
      if (!disposed) onDone();
    };

    void run();

    return () => {
      disposed = true;
      // StrictMode replays mount effects: let the replay start a fresh run
      // (this closure's run() is dead — every step checks `disposed`).
      ranRef.current = false;
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [animate, onDone]);

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const S = vw <= 640 ? 0.4 * vw : Math.min(0.46 * vh, 420);

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      <div
        className="intro-backdrop absolute inset-0 opacity-0 backdrop-blur-[3px]"
        style={{ background: 'color-mix(in srgb, var(--bg) 65%, transparent)' }}
      />
      <div
        className="intro-ring absolute"
        style={{ left: vw / 2 - S / 2, top: vh / 2 - S / 2, width: S, height: S }}
      >
        <video ref={videoRef} muted loop playsInline preload="auto" className="h-full w-full object-contain">
          <source src={`${assetPath}ring_spin_512.webm`} type="video/webm" />
          <img src={`${assetPath}ring_spin_384.webp`} alt="" />
        </video>
      </div>
      <div
        className="intro-word-wrap absolute inset-x-0 text-center"
        style={{ top: vh / 2 + S * 0.34 }}
      >
        <span
          className="intro-word inline-block font-semibold text-text opacity-0"
          style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', letterSpacing: '0.3em' }}
        >
          Almaz Silver
        </span>
        <span
          className="intro-underline mx-auto mt-2 block h-px w-40 origin-left bg-accent"
          style={{ transform: 'scaleX(0)' }}
        />
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
