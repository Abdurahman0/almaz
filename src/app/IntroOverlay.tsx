import { useEffect, useRef } from 'react';
import { useAnimate, animate as animateValue } from 'framer-motion';
import { useIntroStore } from '@/shared/stores/intro';
import {
  getRingFrames,
  getEngraveReady,
  frameIndexFor,
  GEM_FRAME,
  FRAME_COUNT,
  ENGRAVE_CLEAN,
  ENGRAVE_ENGRAVED,
  ENGRAVE_CENTROID,
} from '@/shared/lib/ringFrames';
import './intro.css';

/*
 * One-time post-login intro (v2 turntable + inner-band engraving peak).
 *
 * corner -> center (gem-facing frame 0) -> turn & present into the inner-band
 * hero (crossfade from the turntable to the clean hero, one continuous move)
 * -> reveal "Almaz Silver" engraved along the band with a directional mask
 * -> hold -> reverse-crossfade back to the turntable -> rocket to the sidebar.
 *
 * INTRO_PEAK swaps the peak: 'engrave' (default) or the older 'gem' dive.
 */
const INTRO_PEAK: 'engrave' | 'gem' = 'engrave';

// engrave-phase mask sweep angle (CSS gradient deg): reveal grows from the
// Almaz end (upper-left) toward Silver (lower-right) along the measured ~41deg
// baseline. Re-derived from the upright render (was 313deg for the flipped one).
const ENGRAVE_ANGLE = '131deg';

const ENTER_MS = 1400;
const SETTLE_BEAT_MS = 160;
// engrave peak
const TURN_MS = 700;
const CROSS_MS = 260; // crossfade overlap
const TURN_END_FRAME = 24; // ~3/4 pose, close to the hero's inner-band view
const PUSH_MS = 520; // reveal-time push-in that brings engraving to center
const REVEAL_MS = 1100;
const GLINT_MS = 150;
const HERO_HOLD_MS = 700;
const RETURN_MS = 250;
const HERO_VH = 1.6; // ~160vh hero
// gem peak (legacy)
const DIVE_MS = 560;
const WORD_MS = 550;
const SHIMMER_MS = 500;
const HOLD_MS = 800;
const WORD_OUT_MS = 120;
// shared exit
const ANTICIPATION_MS = 60;
const FLIGHT_MS = 340;
const SETTLE_MS = 80;

const GEM_ANGLE = GEM_FRAME / FRAME_COUNT;
const ENTER_START_ANGLE = GEM_ANGLE - 0.4;
const RPS_ROCKET = 0.5 / (FLIGHT_MS / 1000);
const RPS_TURN = TURN_END_FRAME / FRAME_COUNT / (TURN_MS / 1000); // reaches the 3/4 pose

function IntroSequence({ assetPath = '/', onDone }: { assetPath?: string; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(ENTER_START_ANGLE);
  const spinRef = useRef(false);
  const rpsRef = useRef(0);
  const ranRef = useRef(false);
  const skippedRef = useRef(false);
  const heroCleanRef = useRef<HTMLImageElement | null>(null);
  const heroEngravedRef = useRef<HTMLImageElement | null>(null);

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
    const diveScale = (2.3 * vh) / S;
    const START = 120;
    const x0 = vw / 2 + START / 2;
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
      } catch {
        onDone();
        return;
      }
      // The engraving heroes are decoded before the peak, but their failure must
      // never abort the intro (they are tiny vs the frames the gate already
      // cleared): if they don't load, degrade to entrance -> rocket, no peak.
      let engraveOk = INTRO_PEAK === 'engrave';
      if (engraveOk) {
        try {
          await getEngraveReady(assetPath);
        } catch {
          engraveOk = false;
        }
      }
      if (disposed) return;
      startSpin(frames);
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (disposed) return;

      // The two 2400px hero <img>s otherwise pay their first-paint cost on the
      // main thread mid-animation: inner_clean janks the crossfade, inner_engraved
      // janks the reveal (~80ms source decode + ~66ms raster/GPU-upload each,
      // because Chrome decodes per target raster size). Warm both off-screen
      // during the pre-roll (ring still parked in the corner, backdrop still
      // transparent) so the animated phases are paint-free:
      //   1. decode() the real elements (not the throwaway Images),
      //   2. briefly composite the hero at ~0 opacity with the engraved layer
      //      fully unmasked, to force raster + GPU upload of both layers.
      if (engraveOk) {
        await Promise.all(
          [heroCleanRef.current, heroEngravedRef.current].map((img) =>
            img?.decode ? img.decode().catch(() => {}) : Promise.resolve(),
          ),
        );
        if (disposed) return;
        const hero = document.querySelector('.intro-hero') as HTMLElement | null;
        if (hero) {
          // The hero renders at scale 1 the whole time (the turntable grows to
          // meet it; the reveal only pans), so there is never a scale-up to force
          // a higher-res re-decode. Warm both layers' raster + GPU upload here,
          // off-screen, and keep the hero composited at ~0 opacity through the
          // entrance so those tiles are not evicted before the crossfade/reveal.
          hero.style.transformOrigin = '50% 50%';
          hero.style.transform = 'translate(0px, 0px) scale(1)';
          hero.style.opacity = '0.012';
          await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        }
        if (disposed) return;
      }
      const guard = (p: PromiseLike<unknown> | unknown, ms: number) =>
        Promise.race([Promise.resolve(p as PromiseLike<unknown>), new Promise<void>((r) => setTimeout(r, ms + 400))]);
      const step = (el: string, kf: object, opts: object) =>
        skippedRef.current || disposed ? Promise.resolve() : animate(el as never, kf as never, opts as never);

      // Phase 1 — entrance (unchanged): corner -> center, gem-facing frame 0.
      spinRef.current = false;
      const angleTween = animateValue(ENTER_START_ANGLE, GEM_ANGLE, {
        duration: ENTER_MS / 1000,
        ease: [0.2, 0.7, 0.3, 1],
        onUpdate: (v) => { if (!skippedRef.current) angleRef.current = v; },
      });
      const backdropIn = step('.intro-backdrop', { opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
      await guard(
        step('.intro-ring', { x: [x0, 0], y: [y0, 0], scale: [START / S, 1] }, { duration: ENTER_MS / 1000, ease: [0.2, 0.7, 0.3, 1] }),
        ENTER_MS,
      );
      angleRef.current = GEM_ANGLE;
      angleTween.stop();
      await guard(backdropIn, 400);
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, SETTLE_BEAT_MS));

      if (INTRO_PEAK === 'engrave' && engraveOk) {
        // Hero geometry (transform-origin = element center). During the
        // crossfade the hero sits ring-centered at the turntable's size so the
        // dissolve registers; during the reveal it pushes in to `1` scale and
        // pans so the measured engraving centroid lands at the optical center.
        const HH = HERO_VH * vh;
        // Turntable grows to the hero's box size so the crossfade is size-matched
        // while the hero stays at scale 1 (no scale-up later -> no re-decode).
        const turnScale = HH / S;
        const pushX = -(ENGRAVE_CENTROID.x - 0.5) * HH;
        const pushY = 0.46 * vh - vh / 2 - (ENGRAVE_CENTROID.y - 0.5) * HH;

        // Phase 2 — turn & present: short turntable run + crossfade into the
        // full-size clean hero, both centered and size-matched (ONE move).
        spinRef.current = true;
        rpsRef.current = RPS_TURN;
        const ringScale = step('.intro-ring', { scale: turnScale }, { duration: TURN_MS / 1000, ease: [0.2, 0.7, 0.3, 1] });
        const ringFade = step('.intro-ring', { opacity: 0 }, { duration: CROSS_MS / 1000, ease: 'linear', delay: (TURN_MS - CROSS_MS) / 1000 });
        const heroIn = step('.intro-hero', { opacity: [0.012, 1] }, { duration: CROSS_MS / 1000, ease: 'easeOut', delay: (TURN_MS - CROSS_MS) / 1000 });
        await guard(Promise.all([ringScale, ringFade, heroIn]), TURN_MS + 40);
        spinRef.current = false;

        // Phase 3 — engraving reveal: pan the engraving to the optical center
        // (translate only, no scale -> no re-decode) while the mask sweeps along
        // the baseline so letters emerge in reading order; then one glint.
        const pushIn = step('.intro-hero', { x: [0, pushX], y: [0, pushY] }, { duration: PUSH_MS / 1000, ease: [0.3, 0.1, 0.3, 1] });
        // mask lives on the clean (top) layer now: hiding it uncovers the engraving
        const engEl = document.querySelector('.intro-hero-clean') as HTMLElement | null;
        const reveal = engEl?.animate([{ '--eng-reveal': '-5%' } as Keyframe, { '--eng-reveal': '150%' } as Keyframe], {
          duration: REVEAL_MS,
          easing: 'cubic-bezier(.3,.1,.3,1)',
          fill: 'forwards',
        });
        await guard(Promise.all([pushIn, reveal?.finished]), REVEAL_MS);
        if (!skippedRef.current && !disposed) {
          (document.querySelector('.intro-glint') as HTMLElement | null)?.animate(
            [
              { transform: 'translateX(-70%)', opacity: 0 },
              { transform: 'translateX(-10%)', opacity: 0.9, offset: 0.5 },
              { transform: 'translateX(60%)', opacity: 0 },
            ],
            { duration: GLINT_MS, easing: 'ease-out' },
          );
        }
        if (!skippedRef.current) await new Promise((r) => setTimeout(r, HERO_HOLD_MS));

        // Phase 4 — return: reverse the push + crossfade back to the turntable,
        // aligned the same way so the hand-back reads as one move too.
        spinRef.current = true;
        rpsRef.current = RPS_TURN * 0.6;
        const heroOut = step('.intro-hero', { opacity: 0, x: 0, y: 0 }, { duration: RETURN_MS / 1000, ease: 'easeIn' });
        const ringBack = step('.intro-ring', { opacity: 1 }, { duration: RETURN_MS / 1000, ease: 'linear' });
        await guard(Promise.all([heroOut, ringBack]), RETURN_MS);
        spinRef.current = false;
      } else if (INTRO_PEAK === 'gem') {
        // Legacy gem dive.
        const scrimIn = step('.intro-scrim', { opacity: [0, 1] }, { duration: DIVE_MS / 1000, ease: 'easeOut' });
        await guard(step('.intro-ring', { scale: diveScale }, { duration: DIVE_MS / 1000, ease: [0.16, 0.8, 0.26, 1] }), DIVE_MS);
        await guard(step('.intro-word', { opacity: [0, 1], letterSpacing: ['0.3em', '0.05em'] }, { duration: WORD_MS / 1000, ease: 'easeOut' }), WORD_MS);
        if (!skippedRef.current && !disposed) {
          document.querySelector('.intro-word')?.animate([{ backgroundPosition: '150% 0%' }, { backgroundPosition: '-50% 0%' }], { duration: SHIMMER_MS, easing: 'ease-in-out', fill: 'forwards' });
        }
        await guard(scrimIn, DIVE_MS);
        if (!skippedRef.current) await new Promise((r) => setTimeout(r, HOLD_MS));
        await guard(step('.intro-lockup', { opacity: 0 }, { duration: WORD_OUT_MS / 1000 }), WORD_OUT_MS);
      }

      // Phase 5 — rocket exit (FLIP from the current turntable scale).
      const slot = document.querySelector('[data-intro-logo-slot]');
      const slotRect = slot ? slot.getBoundingClientRect() : null;
      // rocket flies from wherever the peak left the turntable: grown to the
      // hero's box size (engrave), the dive scale (gem), or plain center (degraded).
      const curScale = INTRO_PEAK === 'gem' ? diveScale : engraveOk ? (HERO_VH * vh) / S : 1;
      await guard(step('.intro-ring', { scale: curScale * 1.02 }, { duration: ANTICIPATION_MS / 1000, ease: 'easeOut' }), ANTICIPATION_MS);

      spinRef.current = true;
      rpsRef.current = RPS_ROCKET;
      const backdropOut = step('.intro-backdrop', { opacity: 0 }, { duration: 0.3, ease: 'easeOut' });
      if (slotRect && slotRect.width > 0) {
        const dx = slotRect.x + slotRect.width / 2 - vw / 2;
        const dy = slotRect.y + slotRect.height / 2 - vh / 2;
        const target = slotRect.width / S;
        await guard(step('.intro-ring', { x: dx, y: dy, scale: target * 1.04 }, { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] }), FLIGHT_MS);
        spinRef.current = false;
        await guard(step('.intro-ring', { scale: target }, { duration: SETTLE_MS / 1000, ease: 'easeOut' }), SETTLE_MS);
      } else {
        await guard(step('.intro-ring', { x: -vw * 0.7, scale: 0.12, opacity: 0 }, { duration: FLIGHT_MS / 1000, ease: [0.7, 0, 0.9, 0.4] }), FLIGHT_MS);
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
  // hero renders at full size (scale 1), centered; the turntable grows to meet
  // it for the crossfade, and the reveal only pans it to engraving-center.
  const HH = HERO_VH * vh;

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      <div className="intro-backdrop absolute inset-0 opacity-0" style={{ background: 'color-mix(in srgb, var(--bg) 78%, transparent)' }} />

      {/* turntable ring — parked outside the top-right corner */}
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

      {INTRO_PEAK === 'engrave' && (
        <div
          className="intro-hero"
          style={{
            left: vw / 2 - HH / 2,
            top: vh / 2 - HH / 2,
            width: HH,
            height: HH,
            transformOrigin: '50% 50%',
            transform: 'translate(0px, 0px) scale(1)',
            ['--eng-angle' as string]: ENGRAVE_ANGLE,
          }}
        >
          {/* engraved on the bottom (always painted), clean masked away on top */}
          <img ref={heroEngravedRef} className="intro-hero-engraved" src={`${assetPath}${ENGRAVE_ENGRAVED}`} alt="" />
          <img ref={heroCleanRef} className="intro-hero-clean" src={`${assetPath}${ENGRAVE_CLEAN}`} alt="" />
          <span className="intro-glint" />
        </div>
      )}

      {INTRO_PEAK === 'gem' && (
        <div className="intro-lockup fixed inset-0 grid place-items-center">
          <div className="relative grid place-items-center">
            <div className="intro-scrim absolute opacity-0" style={{ width: vw * 0.6, height: vh * 0.34, background: 'radial-gradient(closest-side, color-mix(in srgb, var(--bg) 82%, transparent), transparent 72%)' }} />
            <span
              className="intro-word relative inline-block whitespace-nowrap text-center font-semibold opacity-0"
              style={{
                fontSize: wordSize,
                lineHeight: 1.1,
                letterSpacing: '0.3em',
                color: 'transparent',
                backgroundImage: 'linear-gradient(100deg, var(--text) 42%, color-mix(in srgb, var(--accent) 80%, white) 50%, var(--text) 58%)',
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
      )}

      <p className="absolute bottom-6 right-8 text-xs text-muted opacity-60">O'tkazib yuborish</p>
    </div>
  );
}

export function IntroOverlay() {
  const stage = useIntroStore((s) => s.stage);
  const begin = useIntroStore((s) => s.begin);
  const finish = useIntroStore((s) => s.finish);
  const gatingRef = useRef(false);

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
    // engrave heroes are tiny — the gate only waits on the frame sequence
    getRingFrames()
      .then(() => done(true))
      .catch(() => done(false))
      .finally(() => window.clearTimeout(timer));
    return () => window.clearTimeout(timer);
  }, [stage, begin, finish]);

  if (stage !== 'playing') return null;
  return <IntroSequence onDone={finish} />;
}
