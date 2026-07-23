import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
  useNavigationType,
} from 'react-router-dom';
import './ring-transition.css';

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

// The spin video holds 30 frames at ~66.7ms — one full revolution per 2s at
// native rate. playbackRate is tuned so a crossing spans ~1.5 rotations.
const NATIVE_ROTATION_MS = 2000;
const ROTATIONS_PER_CROSSING = 1.5;

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
      <video ref={videoRef} muted loop playsInline preload="auto">
        <source src={`${assetPath}ring_spin_512.webm`} type="video/webm" />
        <img src={`${assetPath}ring_spin_384.webp`} alt="" />
      </video>
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

export function RingTransitionLayout({
  minMs = 1300,
  assetPath = '/',
  showOnRedirect = false,
}: RingTransitionLayoutProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const navigationType = useNavigationType();
  const reducedMotion = usePrefersReducedMotion();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageInnerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hostSlideRef = useRef<HTMLDivElement | null>(null);
  const travelerRef = useRef<HTMLDivElement | null>(null);
  const veilRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Snapshot of the outgoing page, captured when a navigation starts (the DOM
  // still shows the old page then) and consumed when it commits.
  const captureRef = useRef<{ el: HTMLElement; scrollY: number } | null>(null);
  const lastKeyRef = useRef<string | undefined>(undefined);
  const cleanupTimerRef = useRef<number | undefined>(undefined);
  // Mirrors `crossing` synchronously: the trigger effect sets it in the same
  // commit it appends the snapshot, before the state update lands, so the
  // idle-cleanup effect (running later in that commit with stale state)
  // doesn't wipe the snapshot it just installed.
  const activeRef = useRef(false);
  const [crossing, setCrossing] = useState(false);

  const pendingSilent = isSilentNavigation(navigation.location?.state, showOnRedirect);
  const pending = !reducedMotion && navigation.state !== 'idle' && !pendingSilent;

  // Capture the old page's pixels during the first render of a new location —
  // the DOM still shows the outgoing page until React commits, so this is the
  // one moment the snapshot is guaranteed regardless of how fast the lazy
  // module resolved. Reading the DOM into a ref is render-safe and idempotent
  // (StrictMode's replay is guarded by the key comparison).
  const renderKeyRef = useRef(location.key);
  if (renderKeyRef.current !== location.key) {
    renderKeyRef.current = location.key;
    const stage = stageRef.current;
    if (stage && !reducedMotion) {
      const el = stage.cloneNode(true) as HTMLElement;
      el.removeAttribute('data-ring-stage'); // the clone must not match live-stage selectors
      captureRef.current = { el, scrollY: window.scrollY };
    }
  }

  // Run the crossing choreography on every completed navigation.
  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    const isFirst = lastKeyRef.current === undefined;
    lastKeyRef.current = location.key;
    if (isFirst) return; // no ring on initial page load
    if (!showOnRedirect && navigationType === 'REPLACE') {
      captureRef.current = null;
      return;
    }
    if (reducedMotion) {
      captureRef.current = null;
      return;
    }

    const snap = captureRef.current;
    captureRef.current = null;
    const slide = hostSlideRef.current;
    if (slide) {
      slide.innerHTML = '';
      if (snap) {
        // Compensate the window scroll the clone was captured under.
        snap.el.style.transform = `translateY(-${snap.scrollY}px)`;
        slide.appendChild(snap.el);
      }
    }

    const video = videoRef.current;
    if (video) {
      video.playbackRate = (ROTATIONS_PER_CROSSING * NATIVE_ROTATION_MS) / minMs;
      video.currentTime = 0;
      video.play().catch(() => {});
    }

    // Restart the CSS animations so back-to-back navigations replay cleanly.
    for (const el of [
      stageRef.current,
      stageInnerRef.current,
      hostRef.current,
      hostSlideRef.current,
      travelerRef.current,
      veilRef.current,
    ]) {
      if (!el) continue;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    }

    activeRef.current = true;
    setCrossing(true);
    window.clearTimeout(cleanupTimerRef.current);
    // Keep the choreography window open past --T so trailing section staggers
    // (base 35% of --T + steps + 500ms) finish before classes are removed.
    cleanupTimerRef.current = window.setTimeout(() => {
      activeRef.current = false;
      setCrossing(false);
    }, Math.round(minMs * 1.85));
  }, [location.key, minMs, navigationType, reducedMotion, showOnRedirect]);

  // Idle: stop the spin and drop the snapshot.
  useEffect(() => {
    if (crossing || pending || activeRef.current) return;
    videoRef.current?.pause();
    const slide = hostSlideRef.current;
    if (slide) slide.innerHTML = '';
  }, [crossing, pending]);

  // Pending loop (chunk in flight): keep the ring spinning at crossing rate.
  useEffect(() => {
    if (!pending) return;
    const video = videoRef.current;
    if (video) {
      video.playbackRate = (ROTATIONS_PER_CROSSING * NATIVE_ROTATION_MS) / minMs;
      video.play().catch(() => {});
    }
  }, [pending, minMs]);

  useEffect(() => () => window.clearTimeout(cleanupTimerRef.current), []);

  const mode = pending ? 'pending' : crossing ? 'crossing' : 'idle';

  return (
    <div
      className="ring-root"
      data-mode={mode}
      data-crossing={crossing ? 'true' : undefined}
      style={{ '--T': `${minMs}ms` } as CSSProperties}
    >
      <ScrollRestoration />
      <div ref={stageRef} data-ring-stage="live">
        <div ref={stageInnerRef} className="ring-stage-inner">
          <Outlet />
        </div>
      </div>
      <div ref={hostRef} className="ring-wipe-old" hidden={!crossing} aria-hidden="true">
        <div ref={hostSlideRef} className="ring-wipe-slide" />
      </div>
      <div ref={veilRef} className="ring-veil" hidden={mode === 'idle'} aria-hidden="true" />
      <div ref={travelerRef} className="ring-traveler" hidden={mode === 'idle'} aria-hidden="true">
        <div className="ring-fade">
          {/* Always mounted with preload="auto" so the spin is fetched at app
              start and the very first crossing never plays half-loaded. */}
          <video ref={videoRef} muted loop playsInline preload="auto">
            <source src={`${assetPath}ring_spin_512.webm`} type="video/webm" />
            <img src={`${assetPath}ring_spin_384.webp`} alt="" />
          </video>
        </div>
      </div>
    </div>
  );
}
