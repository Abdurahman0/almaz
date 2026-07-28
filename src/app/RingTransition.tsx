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

// One slow turn per crossing, rendered from the v2 turntable frames on a canvas.
const ROTATIONS_PER_CROSSING = 1;
const RING_EASE: [number, number, number, number] = [0.5, 0.05, 0.5, 0.95];

// v2 frames are perfectly centered (silhouette center = frame center). Measured
// band geometry: outer rim at 0.41*S, band centerline at 0.39*S. The reveal arc
// radius rides the band centerline so the curved seam always tucks under the
// ring's rim (the ~40px feather covers the band's ~0.035*S width as insurance).
const RING_R_FRAC = 0.39;
const RING_CX_FRAC = 0;
const RING_CY_FRAC = 0;
const ARC_FEATHER = 14; // Gaussian stdDeviation; ~40px soft edge

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
  const [crossing, setCrossing] = useState(false);

  // The one-time post-login intro owns the screen: no page-transition ring
  // while it is pending or playing.
  const introActive = useIntroStore((s) => s.stage === 'pending' || s.stage === 'playing');

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
    // ~100vh tall ring: the silhouette fills ~0.845*S, so S = vh/0.845 makes the
    // ring roughly viewport height. A touch smaller on phones.
    const S = Math.round((vw <= 640 ? Math.min(vh, vw * 1.2) : vh) / 0.845);
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

  // Run the crossing on every completed navigation.
  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    const isFirst = lastKeyRef.current === undefined;
    lastKeyRef.current = location.key;
    if (isFirst) return;
    if (!showOnRedirect && navigationType === 'REPLACE') { captureRef.current = null; return; }
    if (reducedMotion || introActive) { captureRef.current = null; return; }

    const snap = captureRef.current;
    captureRef.current = null;
    const blur = oldBlurRef.current;
    const sharp = oldSharpRef.current;
    if (blur) blur.innerHTML = '';
    if (sharp) sharp.innerHTML = '';
    if (snap) {
      // Two static copies of the old page: a sharp one, and a pre-blurred one
      // that fades in over ~120ms (opacity, not an animated radius) so the blur
      // never pops. Neither is masked, so the blur rasterizes exactly once.
      snap.el.style.transform = `translateY(-${snap.scrollY}px)`;
      const sharpEl = snap.el.cloneNode(true) as HTMLElement;
      sharpEl.style.transform = `translateY(-${snap.scrollY}px)`;
      if (sharp) sharp.appendChild(sharpEl);
      if (blur) blur.appendChild(snap.el);
    }

    applyGeometry();
    // Restart the blur fade-in animation for back-to-back navigations.
    if (blur) { blur.style.animation = 'none'; void blur.offsetWidth; blur.style.animation = ''; }

    activeRef.current = true;
    setCrossing(true);
    startDrive(false);
    window.clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = window.setTimeout(() => {
      activeRef.current = false;
      setCrossing(false);
    }, minMs + 60);
  }, [applyGeometry, introActive, location.key, minMs, navigationType, reducedMotion, showOnRedirect, startDrive]);

  // Pending loop (chunk in flight): keep the ring crossing over the still-visible
  // old page (no mask — the new page has not committed yet) until commit. Guarded
  // by activeRef so a `pending` that lingers true INTO the commit render can't
  // wipe the mask the crossing effect just set (both run in the same commit; the
  // crossing effect runs first and sets activeRef).
  useEffect(() => {
    if (!pending || activeRef.current) return;
    applyGeometry(false);
    startDrive(true);
  }, [applyGeometry, pending, startDrive]);

  // Idle: stop the drive, drop the snapshots, clear the mask + canvas.
  useEffect(() => {
    if (crossing || pending || activeRef.current) return;
    driveRef.current?.stop();
    driveRef.current = null;
    if (oldBlurRef.current) oldBlurRef.current.innerHTML = '';
    if (oldSharpRef.current) oldSharpRef.current.innerHTML = '';
    clearMask();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearMask, crossing, pending]);

  // Keep geometry fresh if the window resizes mid-crossing.
  useEffect(() => {
    if (!crossing && !pending) return;
    const onResize = () => applyGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyGeometry, crossing, pending]);

  useEffect(() => () => {
    window.clearTimeout(cleanupTimerRef.current);
    driveRef.current?.stop();
  }, []);

  const mode = pending ? 'pending' : crossing ? 'crossing' : 'idle';

  return (
    <div
      ref={rootRef}
      className="ring-root"
      data-mode={mode}
      data-crossing={crossing ? 'true' : undefined}
      style={{ '--T': `${minMs}ms` } as CSSProperties}
    >
      <ScrollRestoration />
      {/* OLD page (bottom) — a static snapshot, blurred, so everything still
          ahead of the ring reads soft; the ring sweeps the blur away. */}
      <div ref={oldSharpRef} className="ring-old-layer is-sharp" hidden={!crossing && !pending} aria-hidden="true" />
      <div ref={oldBlurRef} className="ring-old-layer is-blur" hidden={!crossing && !pending} aria-hidden="true" />
      {/* NEW page — live, sharp, interactive; masked to the revealed region so it
          shows only where the ring has already passed (razor-sharp behind it). */}
      <div ref={stageRef} data-ring-stage="live" className="ring-stage">
        <Outlet />
      </div>
      {/* The travelling ring (topmost), v2 frames on a canvas */}
      <canvas ref={canvasRef} className="ring-traveler" hidden={mode === 'idle'} aria-hidden="true" />
    </div>
  );
}
