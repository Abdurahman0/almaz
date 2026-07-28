import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
  useNavigationType,
} from 'react-router-dom';
import { animate, type AnimationPlaybackControls } from 'framer-motion';
import './ring-transition.css';
import { useIntroStore } from '@/shared/stores/intro';
import { useUiStore } from '@/shared/stores/ui';
import { getRingFrames, frameIndexFor } from '@/shared/lib/ringFrames';
import { SimpleTransitionLayout } from './SimpleTransition';

/*
 * Almaz 3D ring page-transition for react-router-dom v6 data routers
 * (createBrowserRouter + lazy route modules).
 *
 * Drop <RingTransitionLayout> in as a layout route: on every navigation under
 * it the rendered ring enters from beyond the left edge, glides across the
 * viewport while spinning ~1.5 rotations, erases the old page at its leading
 * edge and reveals the new one behind its trailing edge; the new page's
 * sections stagger in after the wipe passes. Plain <Link>, navigate(),
 * ProtectedRoute redirects, lazy-module fetches and loader waits are all
 * covered automatically — no per-call wrapping needed.
 *
 * The whole choreography derives from one --T CSS variable (set from the
 * minMs prop): glide, both wipes, veil and section stagger retime together.
 */

/** Play the full ring crossing only every Nth eligible navigation; the rest use
 *  the quick fade/rise. Eligible = not REPLACE, not same-route, not the first
 *  nav after the intro, not reduced-motion. Configurable. */
export const RING_TRANSITION_EVERY = 5;

// One slow turn per crossing, rendered from the v2 turntable frames on a canvas.
const ROTATIONS_PER_CROSSING = 1;
const RING_EASE: [number, number, number, number] = [0.5, 0.05, 0.5, 0.95];

// ~62vh ring (an elegant object crossing the screen, not a wall). The silhouette
// fills ~0.845*S, so S = 0.62*vh / 0.845.
const RING_VH = 0.62;

// v2 frames are perfectly centered (silhouette center = frame center). Measured
// band geometry: outer rim at 0.41*S, band centerline at 0.39*S. The reveal arc
// radius rides the band centerline so the curved seam tucks under the ring's rim.
const RING_R_FRAC = 0.39;
const RING_CX_FRAC = 0;
const RING_CY_FRAC = 0;
// Larger feather (~90px) than the full-screen ring: with a ring shorter than the
// viewport, the arc only covers its own vertical span, so the boundary must blend
// smoothly (no hard corner) into a soft vertical edge above/below the ring.
const ARC_FEATHER = 30; // Gaussian stdDeviation; ~90px soft edge

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

interface RingLocationState {
  ringSilent?: boolean;
}

function isSilentNavigation(state: unknown, showOnRedirect: boolean): boolean {
  return !showOnRedirect && Boolean((state as RingLocationState | null | undefined)?.ringSilent);
}

export interface RingOverlayProps {
  visible: boolean;
  /** URL prefix where the spin assets are served. */
  assetPath?: string;
}

/* Standalone centered overlay for manual waits (saves, refetches). */
export function RingOverlay({ visible, assetPath = '/' }: RingOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // 'leaving' keeps the overlay mounted for the 200ms opacity fade-out.
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'leaving'>('hidden');

  useEffect(() => {
    if (visible) {
      setPhase('visible');
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
      return;
    }
    setPhase((prev) => (prev === 'visible' ? 'leaving' : prev));
    const timer = window.setTimeout(() => {
      setPhase('hidden');
      videoRef.current?.pause();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <div
      className={`ring-overlay${phase === 'leaving' ? ' fade-out' : ''}`}
      hidden={phase === 'hidden'}
      aria-hidden="true"
    >
      {/* ring page-transition is retired (ENABLE_RING_TRANSITION=false); static
          v2 frame placeholder keeps the disabled path compiling + asset-clean */}
      <img src={`${assetPath}ring/v2/frames/ring_0000.webp`} alt="" className="h-full w-full object-contain" />
    </div>
  );
}

export interface RingNavigationOptions {
  /** Duration of the crossing choreography per navigation (ms). */
  minMs?: number;
  /** Show the ring on REPLACE navigations (e.g. the auth guard bouncing to /login). */
  showOnRedirect?: boolean;
}

/*
 * True while the router is mid-navigation (lazy module / loader in flight),
 * and for minMs after each completed location change (the crossing window).
 * Always false under reduced motion.
 */
export function useRingNavigation({
  minMs = 1300,
  showOnRedirect = false,
}: RingNavigationOptions = {}): boolean {
  const location = useLocation();
  const navigation = useNavigation();
  const navigationType = useNavigationType(); // PUSH | REPLACE | POP
  const reducedMotion = usePrefersReducedMotion();
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  // Tracking the last seen location.key (instead of a firstRender flag) keeps
  // StrictMode's double-invoked effects from treating the replay as a navigation.
  const lastKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    const isFirst = lastKeyRef.current === undefined;
    lastKeyRef.current = location.key;
    if (isFirst) return; // no ring on initial page load
    // ProtectedRoute's <Navigate replace> arrives as REPLACE
    if (!showOnRedirect && navigationType === 'REPLACE') return;
    setHolding(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setHolding(false), minMs);
    return () => window.clearTimeout(timerRef.current);
  }, [location.key, minMs, navigationType, showOnRedirect]);

  if (reducedMotion) return false;
  const pendingSilent = isSilentNavigation(navigation.location?.state, showOnRedirect);
  return (navigation.state !== 'idle' && !pendingSilent) || holding;
}

export interface RingTransitionLayoutProps {
  /** Duration --T of the crossing choreography (ms); also the minimum ring time. */
  minMs?: number;
  /** URL prefix where the spin assets are served. */
  assetPath?: string;
  /** Show the ring on REPLACE redirects; off so guard bounces stay silent. */
  showOnRedirect?: boolean;
}

/*
 * The ring page transition is retired (kept intact for a later revisit) in
 * favor of the fast fade/rise transition in SimpleTransition.tsx. Flip this
 * to true to bring the ring crossing back.
 */
export const ENABLE_RING_TRANSITION = true;

export function RingTransitionLayout(props: RingTransitionLayoutProps) {
  if (ENABLE_RING_TRANSITION) return <RingTransitionLayoutRing {...props} />;
  return <SimpleTransitionLayout />;
}

interface CrossGeometry {
  cx0: number;
  cx1: number;
  OW: number;
  S: number;
  cxOff: number;
}

function RingTransitionLayoutRing({
  minMs: minMsProp = 1500,
  assetPath = '/',
  showOnRedirect = false,
}: RingTransitionLayoutProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const navigationType = useNavigationType();
  const reducedMotion = usePrefersReducedMotion();
  // Test/debug hook: window.__RING_MS overrides the crossing duration so a
  // slowed-down run can be paused for a mid-crossing frame check. Undefined in
  // production, so this is a no-op there.
  const debugMs = (window as unknown as { __RING_MS?: number }).__RING_MS;
  const minMs = typeof debugMs === 'number' && debugMs > 0 ? debugMs : minMsProp;

  const rootRef = useRef<HTMLDivElement | null>(null);
  // Live NEW page — masked to the revealed (behind-the-ring) region so the sharp
  // new page shows only where the ring has already passed.
  const stageRef = useRef<HTMLDivElement | null>(null);
  // OLD page snapshots underneath: a sharp copy and a blurred copy that fades in
  // over ~120ms. Both are STATIC (rasterized once) — the blur is never re-masked,
  // so there is no per-frame blur re-raster.
  const oldSharpRef = useRef<HTMLDivElement | null>(null);
  const oldBlurRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Snapshot of the outgoing page, captured when a navigation starts (the DOM
  // still shows the old page then) and consumed when it commits.
  const captureRef = useRef<{ el: HTMLElement; scrollY: number } | null>(null);
  const lastKeyRef = useRef<string | undefined>(undefined);
  const cleanupTimerRef = useRef<number | undefined>(undefined);
  const activeRef = useRef(false);
  // v2 turntable frames (shared cache, warmed on the login screen) + the single
  // motion-value playback controls that drive ring AND clip together.
  const framesRef = useRef<ImageBitmap[]>([]);
  const geomRef = useRef<CrossGeometry | null>(null);
  const driveRef = useRef<AnimationPlaybackControls | null>(null);
  // null = idle; 'ring' = full ring crossing; 'simple' = quick fade/rise.
  const [crossKind, setCrossKind] = useState<null | 'ring' | 'simple'>(null);
  const crossing = crossKind === 'ring';
  // Per-nav bookkeeping for the every-Nth decision.
  const prevPathRef = useRef(location.pathname);
  const freePassRef = useRef(false); // the first nav after the intro never rings

  const bumpRingNav = useUiStore((s) => s.bumpRingNav);

  // The one-time post-login intro owns the screen: no page-transition ring
  // while it is pending or playing.
  const introActive = useIntroStore((s) => s.stage === 'pending' || s.stage === 'playing');
  // When the intro finishes, mark the NEXT eligible nav as a free pass (fade,
  // uncounted) — the first navigation right after the intro shouldn't ring.
  const introWasActiveRef = useRef(introActive);
  useEffect(() => {
    if (introWasActiveRef.current && !introActive) freePassRef.current = true;
    introWasActiveRef.current = introActive;
  }, [introActive]);

  const pendingSilent = isSilentNavigation(navigation.location?.state, showOnRedirect);
  const pending = !reducedMotion && !introActive && navigation.state !== 'idle' && !pendingSilent;

  useEffect(() => {
    let alive = true;
    getRingFrames(assetPath).then((f) => { if (alive) framesRef.current = f; }).catch(() => {});
    return () => { alive = false; };
  }, [assetPath]);

  /*
   * One shared frame renderer: from a single eased progress p (0..1) it places
   * BOTH the ring (translateX + rotated frame) and the curved reveal seam
   * (mask-position). Because they read the same p in the same call, the seam is
   * locked under the ring's band on every frame — no two-animation drift.
   */
  const renderAt = useCallback((p: number) => {
    const g = geomRef.current;
    if (!g) return;
    const cx = g.cx0 + (g.cx1 - g.cx0) * p; // visible ring-center x
    const stage = stageRef.current;
    if (stage) {
      const mp = `${Math.round(cx - g.OW)}px 0`;
      stage.style.maskPosition = mp;
      stage.style.setProperty('-webkit-mask-position', mp);
    }
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transform = `translate(${Math.round(cx - g.S / 2 - g.cxOff)}px, -50%)`;
      const ctx = canvas.getContext('2d');
      const frames = framesRef.current;
      if (ctx && frames.length) {
        const idx = frameIndexFor(p * ROTATIONS_PER_CROSSING);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames[idx], 0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  /*
   * Compute the crossing geometry, size the ring canvas, and build ONE static
   * feathered arc mask (white = OLD page ahead of the ring). Only mask-position
   * animates thereafter, swept by renderAt in lockstep with the ring.
   */
  const applyGeometry = useCallback((withMask = true) => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !canvas) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // ~62vh ring (S = 0.62*vh / 0.845); a touch smaller on narrow phones.
    const targetH = vw <= 640 ? Math.min(RING_VH * vh, vw) : RING_VH * vh;
    const S = Math.round(targetH / 0.845);
    const r = Math.round(RING_R_FRAC * S);
    const cxOff = RING_CX_FRAC * S;
    const cy = Math.round(vh / 2 + RING_CY_FRAC * S);
    const left0 = -1.05 * S; // fully off the left edge
    const left1 = vw + 0.05 * S; // fully off the right edge
    const cx0 = left0 + S / 2 + cxOff;
    const cx1 = left1 + S / 2 + cxOff;
    const OW = Math.round(vw + 2 * S); // arc apex x in the mask canvas
    geomRef.current = { cx0, cx1, OW, S, cxOff };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(S * dpr);
    canvas.height = Math.round(S * dpr);
    canvas.style.width = `${S}px`;
    canvas.style.height = `${S}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.imageSmoothingQuality = 'high';

    // The curved reveal mask lives on the live stage ONLY while a committed new
    // page is being revealed (crossing). During `pending` the stage still holds
    // the OLD page, so it must stay unmasked (withMask=false) — the ring just
    // spins over it until the router commits.
    if (withMask) {
      // White = NEW visible: everything to the LEFT of the trailing arc (behind
      // the ring — where it has already passed). The unfiltered live stage carries
      // this mask, so only mask-position sweeps (cheap GPU re-blend, no re-raster).
      // Feathered ~40px so the seam stays soft under the band.
      const MW = Math.round(OW + vw + 2 * S);
      const path = `M0 -80L${OW} -80V${cy - r}A${r} ${r} 0 0 0 ${OW - r} ${cy}A${r} ${r} 0 0 0 ${OW} ${cy + r}V${vh + 80}L0 ${vh + 80}Z`;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${MW}' height='${vh}'><filter id='f' x='-5%' y='-5%' width='110%' height='110%'><feGaussianBlur stdDeviation='${ARC_FEATHER}'/></filter><path d='${path}' fill='#fff' filter='url(#f)'/></svg>`;
      const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      for (const prefix of ['mask', '-webkit-mask']) {
        stage.style.setProperty(`${prefix}-image`, url);
        stage.style.setProperty(`${prefix}-repeat`, 'no-repeat');
        stage.style.setProperty(`${prefix}-size`, `${MW}px ${vh}px`);
      }
    }
    renderAt(0);
  }, [renderAt]);

  const clearMask = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    for (const prefix of ['mask', '-webkit-mask']) {
      stage.style.removeProperty(`${prefix}-image`);
      stage.style.removeProperty(`${prefix}-repeat`);
      stage.style.removeProperty(`${prefix}-size`);
      stage.style.removeProperty(`${prefix}-position`);
    }
  }, []);

  // Start the single eased timeline; loop while a chunk is still loading.
  const startDrive = useCallback((loop: boolean) => {
    driveRef.current?.stop();
    driveRef.current = animate(0, 1, {
      duration: minMs / 1000,
      ease: RING_EASE,
      repeat: loop ? Infinity : 0,
      onUpdate: renderAt,
    });
  }, [minMs, renderAt]);

  // Capture the old page's pixels during the first render of a new location.
  const renderKeyRef = useRef(location.key);
  if (renderKeyRef.current !== location.key) {
    renderKeyRef.current = location.key;
    const stage = stageRef.current;
    if (stage && !reducedMotion) {
      const el = stage.cloneNode(true) as HTMLElement;
      el.removeAttribute('data-ring-stage');
      el.querySelectorAll('a[href]').forEach((a) => a.removeAttribute('href'));
      captureRef.current = { el, scrollY: window.scrollY };
    }
  }

  // Run a transition on every completed navigation — the ring every Nth time,
  // a quick fade/rise otherwise.
  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    const isFirst = lastKeyRef.current === undefined;
    const prevPath = prevPathRef.current;
    lastKeyRef.current = location.key;
    prevPathRef.current = location.pathname;
    if (isFirst) return;
    if (!showOnRedirect && navigationType === 'REPLACE') { captureRef.current = null; return; }
    if (reducedMotion || introActive) { captureRef.current = null; return; }

    // Decide ring vs fade. Same-route navs and the first nav after the intro
    // always fade and are NOT counted, so the counter only tracks genuine
    // page-to-page moves and the ring lands on a true every-Nth cadence.
    let useRing = false;
    let counted = -1;
    if (freePassRef.current) {
      freePassRef.current = false;
    } else if (prevPath === location.pathname) {
      /* same-route: fade, uncounted */
    } else {
      counted = bumpRingNav();
      useRing = counted % RING_TRANSITION_EVERY === 0;
    }
    // Test hooks (no-op in production): force a ring crossing, and log decisions.
    const w = window as unknown as { __RING_FORCE?: boolean; __RING_DEBUG?: boolean; __ringLog?: unknown[] };
    if (w.__RING_FORCE) useRing = true;
    if (w.__RING_DEBUG) (w.__ringLog ??= []).push({ path: location.pathname, count: counted, ring: useRing });

    const snap = captureRef.current;
    captureRef.current = null;
    const blur = oldBlurRef.current;
    const sharp = oldSharpRef.current;
    const stage = stageRef.current;
    if (blur) blur.innerHTML = '';
    if (sharp) sharp.innerHTML = '';

    if (useRing) {
      if (snap) {
        // Two static copies of the old page: a sharp one, and a pre-blurred one
        // that fades in over ~120ms (opacity, not an animated radius). Neither is
        // masked, so the blur rasterizes exactly once.
        snap.el.style.transform = `translateY(-${snap.scrollY}px)`;
        const sharpEl = snap.el.cloneNode(true) as HTMLElement;
        sharpEl.style.transform = `translateY(-${snap.scrollY}px)`;
        if (sharp) sharp.appendChild(sharpEl);
        if (blur) blur.appendChild(snap.el);
      }
      applyGeometry();
      if (blur) { blur.style.animation = 'none'; void blur.offsetWidth; blur.style.animation = ''; }
      activeRef.current = true;
      setCrossKind('ring');
      startDrive(false);
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => { activeRef.current = false; setCrossKind(null); }, minMs + 60);
    } else {
      // Quick fade/rise: old snapshot fades out on top of the rising new page.
      if (snap && sharp) { snap.el.style.transform = `translateY(-${snap.scrollY}px)`; sharp.appendChild(snap.el); }
      if (sharp) { sharp.style.animation = 'none'; void sharp.offsetWidth; sharp.style.animation = 'rt-page-out 140ms ease-out both'; }
      if (stage) { stage.style.animation = 'none'; void stage.offsetWidth; stage.style.animation = 'rt-page-in 240ms cubic-bezier(.2,.8,.2,1) both'; }
      activeRef.current = true;
      setCrossKind('simple');
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => { activeRef.current = false; setCrossKind(null); }, 480);
    }
  }, [applyGeometry, bumpRingNav, introActive, location.key, location.pathname, minMs, navigationType, reducedMotion, showOnRedirect, startDrive]);

  // Idle: stop the drive, drop the snapshots, clear the mask + canvas + anims.
  useEffect(() => {
    if (crossKind !== null || pending || activeRef.current) return;
    driveRef.current?.stop();
    driveRef.current = null;
    if (oldBlurRef.current) oldBlurRef.current.innerHTML = '';
    if (oldSharpRef.current) { oldSharpRef.current.innerHTML = ''; oldSharpRef.current.style.animation = ''; }
    if (stageRef.current) stageRef.current.style.animation = '';
    clearMask();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearMask, crossKind, pending]);

  // Keep geometry fresh if the window resizes mid-ring-crossing.
  useEffect(() => {
    if (crossKind !== 'ring') return;
    const onResize = () => applyGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyGeometry, crossKind]);

  useEffect(() => () => {
    window.clearTimeout(cleanupTimerRef.current);
    driveRef.current?.stop();
  }, []);

  const mode = crossing ? 'crossing' : 'idle';

  return (
    <div
      ref={rootRef}
      className="ring-root"
      data-mode={mode}
      data-crossing={crossing ? 'true' : undefined}
      data-sim={crossKind === 'simple' ? 'true' : undefined}
      style={{ '--T': `${minMs}ms` } as CSSProperties}
    >
      <ScrollRestoration />
      {/* OLD page snapshot: sharp copy (used by both ring + fade) and a
          blurred copy the ring sweeps away (ring only). */}
      <div ref={oldSharpRef} className="ring-old-layer is-sharp" hidden={crossKind === null} aria-hidden="true" />
      <div ref={oldBlurRef} className="ring-old-layer is-blur" hidden={crossKind !== 'ring'} aria-hidden="true" />
      {/* NEW page — live, sharp, interactive; masked to the revealed region so it
          shows only where the ring has already passed (razor-sharp behind it). */}
      <div ref={stageRef} data-ring-stage="live" className="ring-stage">
        <Outlet />
      </div>
      {/* The travelling ring (topmost, ring crossings only), v2 frames on a canvas */}
      <canvas ref={canvasRef} className="ring-traveler" hidden={crossKind !== 'ring'} aria-hidden="true" />
      {/* 2px accent bar while a lazy chunk loads (any nav) */}
      {pending && <div className="nav-progress" aria-hidden="true"><span /></div>}
    </div>
  );
}
