import { useEffect, useRef } from 'react';
import { useAnimate, animate as animateValue } from 'framer-motion';
import { useIntroStore } from '@/shared/stores/intro';
import {
  getRingFrames,
  getTiltFrames,
  getEngraveReady,
  ringFramesReady,
  ringFramesRatio,
  frameIndexFor,
  GEM_FRAME,
  FRAME_COUNT,
  TILT_COUNT,
  ENGRAVE_CLEAN,
  ENGRAVE_ENGRAVED,
} from '@/shared/lib/ringFrames';
import './intro.css';

/*
 * One-time post-login intro (v2 turntable + real 3D tilt + engraving peak).
 *
 * One continuous timeline, no cuts:
 *   corner -> center on turntable frame 0 (gem facing viewer)
 *   -> play the 48-frame tilt (tilt_0000..0047) while scaling in, so the ring
 *      physically tips up and presents its inner band (NO crossfade, NO swap:
 *      turntable f0 == tilt f0, and tilt f47 == the clean hero, pixel-for-pixel)
 *   -> hand to the hero still and cut "Almaz Silver" into the band letter by
 *      letter with a stepped mask along the measured baseline, then one glint
 *   -> hold -> heal the letters, reverse the tilt fast while shrinking
 *   -> rocket to the sidebar logo slot (FLIP landing).
 *
 * INTRO_PEAK swaps the peak: 'engrave' (default) or the older 'gem' dive.
 */
const INTRO_PEAK: 'engrave' | 'gem' = 'engrave';

// Engrave-phase mask sweep angle (CSS gradient deg). Re-measured from the NEW
// heroes: the baseline runs down-right (~27deg image), text reads Almaz
// (upper-left, ~51.7% along the gradient) -> Silver (lower-right, ~74.4%), so
// the reveal sweeps UL->LR at a CSS gradient angle of ~124deg.
const ENGRAVE_ANGLE = '124deg';
// Sweep the mask across just the letters (with feather + margin) so all 11
// discrete steps land on characters. Percentages are along the 124deg gradient.
const REVEAL_START = 48;
const REVEAL_END = 80;

const ENTER_MS = 1400;
const SETTLE_BEAT_MS = 160;
// engrave peak — real tilt + stepped reveal
const TILT_MS = 950; // scale in while the ring tips up (tilt 0 -> 47)
const REVEAL_STEPS = 11; // one discrete cut per letter of "Almaz Silver"
const REVEAL_STEP_MS = 60; // ~60ms per cut (engraver biting each glyph)
const REVEAL_MS = REVEAL_STEPS * REVEAL_STEP_MS; // 660
const GLINT_MS = 150;
const HERO_HOLD_MS = 700;
const HEAL_MS = 150; // letters withdraw before handing back to the tilt frames
const RETURN_MS = 280; // reverse tilt (47 -> 0) + shrink, flows into the rocket
const HERO_VH = 1.6; // ~160vh hero at the peak
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
// Native frame resolution (1200px turntable, 1600px tilt) — the canvas backs at
// 1600 so tilt f47 upscales exactly like the 1600px hero <img>, keeping the
// tilt->hero handoff pixel-identical at the peak.
const CANVAS_PX = 1600;

function IntroSequence({ assetPath = '/', onDone }: { assetPath?: string; onDone: () => void }) {
  const [scope, animate] = useAnimate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(ENTER_START_ANGLE);
  const spinRef = useRef(false);
  const rpsRef = useRef(0);
  const modeRef = useRef<'turntable' | 'tilt'>('turntable');
  const tiltRef = useRef(0); // 0..1 progress through the tilt sequence
  const tiltFramesRef = useRef<ImageBitmap[]>([]);
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
    const S = mobile ? 0.4 * vw : Math.min(0.72 * vh, 660); // settle size (~72vh)
    const HH = HERO_VH * vh; // peak / hero box (~160vh)
    const sSettle = S / HH; // ring scale that renders the box at the settle size
    const diveScale = (2.3 * vh) / HH; // gem legacy
    const START = 120;
    const x0 = vw / 2 + START / 2;
    const y0 = -(vh / 2) - START / 2;

    // Single canvas plays the turntable (entrance) then the tilt (peak). The two
    // sequences are framed identically at their shared poses so switching frame
    // source mid-flight is invisible. Tilt frames arrive via tiltFramesRef (they
    // load concurrently with the entrance, so the entrance never waits on them).
    const startCanvas = (turntable: ImageBitmap[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || disposed) return;
      canvas.width = CANVAS_PX;
      canvas.height = CANVAS_PX;
      ctx.imageSmoothingQuality = 'high';
      let lastT: number | null = null;
      const tick = (now: number) => {
        if (disposed) return;
        let frame: ImageBitmap;
        const tilt = tiltFramesRef.current;
        if (modeRef.current === 'tilt' && tilt.length) {
          const idx = Math.max(0, Math.min(TILT_COUNT - 1, Math.round(tiltRef.current * (TILT_COUNT - 1))));
          frame = tilt[idx];
        } else {
          if (spinRef.current && lastT !== null) angleRef.current += ((now - lastT) / 1000) * rpsRef.current;
          frame = turntable[frameIndexFor(angleRef.current)];
        }
        lastT = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
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
      // The tilt frames and the two engraving heroes drive the peak, but they
      // must never stall the entrance nor abort the intro (the gate already
      // cleared the heavy turntable; these ride in behind it). Kick their loads
      // now and let them resolve DURING the entrance; only just before the peak
      // do we require them — if they are missing or still not ready, degrade to
      // entrance -> rocket, no peak. The readiness gate never waits on them.
      let peakOk = INTRO_PEAK === 'engrave';
      const peakAssets = peakOk
        ? Promise.all([
            getTiltFrames(assetPath).then((f) => { tiltFramesRef.current = f; }),
            getEngraveReady(assetPath),
          ])
        : Promise.resolve();
      if (disposed) return;
      startCanvas(frames);
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (disposed) return;

      // Warm the two hero <img>s off-screen during the pre-roll (ring parked in
      // the corner, backdrop transparent) so the tilt->hero handoff and the
      // reveal never pay a first-paint decode. Decode the real elements, then
      // briefly composite the hero at ~0 opacity (engraved layer fully revealed)
      // to force raster + GPU upload of both layers. The hero stays at scale 1
      // the whole time (the ring grows to meet it), so there is no scale-up
      // re-decode later.
      if (peakOk) {
        await Promise.all(
          [heroCleanRef.current, heroEngravedRef.current].map((img) =>
            img?.decode ? img.decode().catch(() => {}) : Promise.resolve(),
          ),
        );
        if (disposed) return;
        const clean = heroCleanRef.current;
        const hero = document.querySelector('.intro-hero') as HTMLElement | null;
        if (hero && clean) {
          clean.style.setProperty('--eng-reveal', '150%'); // engraved fully shown -> raster it
          hero.style.opacity = '0.012';
          await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          clean.style.setProperty('--eng-reveal', '0%'); // back to clean-covered
        }
        if (disposed) return;
      }
      const guard = (p: PromiseLike<unknown> | unknown, ms: number) =>
        Promise.race([Promise.resolve(p as PromiseLike<unknown>), new Promise<void>((r) => setTimeout(r, ms + 400))]);
      const step = (el: string, kf: object, opts: object) =>
        skippedRef.current || disposed ? Promise.resolve() : animate(el as never, kf as never, opts as never);

      // Phase 1 — entrance (unchanged): corner -> center, settling on the
      // gem-facing turntable frame 0 at the settle size (~72vh). One tween.
      modeRef.current = 'turntable';
      spinRef.current = false;
      const angleTween = animateValue(ENTER_START_ANGLE, GEM_ANGLE, {
        duration: ENTER_MS / 1000,
        ease: [0.2, 0.7, 0.3, 1],
        onUpdate: (v) => { if (!skippedRef.current) angleRef.current = v; },
      });
      const backdropIn = step('.intro-backdrop', { opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
      await guard(
        step('.intro-ring', { x: [x0, 0], y: [y0, 0], scale: [START / HH, sSettle] }, { duration: ENTER_MS / 1000, ease: [0.2, 0.7, 0.3, 1] }),
        ENTER_MS,
      );
      angleRef.current = GEM_ANGLE;
      angleTween.stop();
      await guard(backdropIn, 400);
      if (!skippedRef.current) await new Promise((r) => setTimeout(r, SETTLE_BEAT_MS));

      // Require the peak assets now (they loaded during the entrance). If they
      // failed or a slow network never delivered them in time, degrade to
      // entrance -> rocket rather than stalling on the settled pose.
      if (peakOk) {
        const ready = await Promise.race([
          peakAssets.then(() => true).catch(() => false),
          new Promise<boolean>((r) => setTimeout(() => r(false), 900)),
        ]);
        if (!ready || !tiltFramesRef.current.length) peakOk = false;
      }

      if (INTRO_PEAK === 'engrave' && peakOk) {
        // Phase 2 — tilt & approach: play tilt 0 -> 47 (ring tips up, presents
        // the inner wall) while scaling the SAME canvas from the settle size to
        // the full hero box (~72vh -> ~160vh) in ONE continuous tween. The frame
        // source switches turntable->tilt at their shared pose, so it is invisible.
        modeRef.current = 'tilt';
        tiltRef.current = 0;
        const tiltTween = animateValue(0, 1, {
          duration: TILT_MS / 1000,
          ease: [0.3, 0.7, 0.3, 1],
          onUpdate: (v) => { if (!skippedRef.current) tiltRef.current = v; },
        });
        await guard(step('.intro-ring', { scale: 1 }, { duration: TILT_MS / 1000, ease: [0.3, 0.7, 0.3, 1] }), TILT_MS);
        tiltRef.current = 1;
        tiltTween.stop();

        // Handoff — tilt f47 (on the canvas at scale 1) == the clean hero,
        // pixel-for-pixel. Show the hero and hide the canvas in the same frame:
        // no fade, no swap, identical pixels.
        const hero = document.querySelector('.intro-hero') as HTMLElement | null;
        if (hero) hero.style.opacity = '1';
        const ring = document.querySelector('.intro-ring') as HTMLElement | null;
        if (ring) ring.style.opacity = '0';

        // Phase 3 — engraving reveal: step the mask along the baseline in 11
        // discrete cuts (~60ms each) so "Almaz Silver" is engraved letter by
        // letter in reading order, then one glint. Rect/scale unchanged.
        const clean = heroCleanRef.current;
        const reveal = clean?.animate(
          [{ '--eng-reveal': `${REVEAL_START}%` } as Keyframe, { '--eng-reveal': `${REVEAL_END}%` } as Keyframe],
          { duration: REVEAL_MS, easing: `steps(${REVEAL_STEPS}, end)`, fill: 'forwards' },
        );
        await guard(reveal?.finished, REVEAL_MS);
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

        // Phase 4 — return: heal the letters (clean re-covers the engraving in
        // reverse), which brings the hero back to == tilt f47; hand back to the
        // canvas (pixel-identical) and reverse the tilt fast while shrinking,
        // flowing straight into the rocket.
        const heal = clean?.animate(
          [{ '--eng-reveal': `${REVEAL_END}%` } as Keyframe, { '--eng-reveal': '0%' } as Keyframe],
          { duration: HEAL_MS, easing: 'ease-in', fill: 'forwards' },
        );
        await guard(heal?.finished, HEAL_MS);
        if (ring) ring.style.opacity = '1';
        if (hero) hero.style.opacity = '0';
        modeRef.current = 'tilt';
        tiltRef.current = 1;
        const backTween = animateValue(1, 0, {
          duration: RETURN_MS / 1000,
          ease: [0.4, 0, 0.2, 1],
          onUpdate: (v) => { if (!skippedRef.current) tiltRef.current = v; },
        });
        await guard(step('.intro-ring', { scale: sSettle }, { duration: RETURN_MS / 1000, ease: [0.4, 0, 0.2, 1] }), RETURN_MS);
        tiltRef.current = 0;
        backTween.stop();
        // tilt f0 == turntable frame 0 — hand back to the turntable for the rocket.
        modeRef.current = 'turntable';
        angleRef.current = GEM_ANGLE;
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
      // rocket flies from wherever the peak left the ring: the settle scale
      // (engrave return / degraded), or the dive scale (gem legacy).
      const curScale = INTRO_PEAK === 'gem' ? diveScale : sSettle;
      await guard(step('.intro-ring', { scale: curScale * 1.02 }, { duration: ANTICIPATION_MS / 1000, ease: 'easeOut' }), ANTICIPATION_MS);

      spinRef.current = true;
      rpsRef.current = RPS_ROCKET;
      const backdropOut = step('.intro-backdrop', { opacity: 0 }, { duration: 0.3, ease: 'easeOut' });
      if (slotRect && slotRect.width > 0) {
        const dx = slotRect.x + slotRect.width / 2 - vw / 2;
        const dy = slotRect.y + slotRect.height / 2 - vh / 2;
        const target = slotRect.width / HH;
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
  const START = 120;
  const wordSize = Math.min(vw, vh) * 0.05;
  // The ring canvas and the hero share the same big box (~160vh); the ring is
  // transform-scaled down to the settle size for the entrance and grows to fill
  // the box during the tilt, meeting the hero at scale 1 with identical framing.
  const HH = HERO_VH * vh;

  return (
    <div ref={scope} className="pointer-events-none fixed inset-0 z-[55]" aria-hidden="true">
      <div className="intro-backdrop absolute inset-0 opacity-0" style={{ background: 'color-mix(in srgb, var(--bg) 78%, transparent)' }} />

      {/* ring canvas (turntable + tilt) — parked outside the top-right corner */}
      <div
        className="intro-ring fixed"
        style={{
          left: vw / 2 - HH / 2,
          top: vh / 2 - HH / 2,
          width: HH,
          height: HH,
          willChange: 'transform',
          transformOrigin: '50% 50%',
          transform: `translate(${vw / 2 + START / 2}px, ${-vh / 2 - START / 2}px) scale(${START / HH})`,
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" style={{ width: '100%', height: '100%' }} />
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
    // Readiness gate on the heavy turntable sequence (the tilt frames + heroes
    // ride in behind it and are never the skip reason):
    //   - fully decoded              -> play instantly
    //   - >=80% downloaded           -> wait up to 3s (dashboard loads under it)
    //   - <80%                       -> silently skip the intro this session
    if (ringFramesReady()) {
      done(true);
      return;
    }
    if (ringFramesRatio() >= 0.8) {
      const timer = window.setTimeout(() => done(false), 3000);
      getRingFrames()
        .then(() => done(true))
        .catch(() => done(false))
        .finally(() => window.clearTimeout(timer));
      return () => window.clearTimeout(timer);
    }
    done(false);
  }, [stage, begin, finish]);

  if (stage !== 'playing') return null;
  return <IntroSequence onDone={finish} />;
}
