import { useEffect, useRef, useState } from 'react';
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigation,
  useNavigationType,
} from 'react-router-dom';
import { useIntroStore } from '@/shared/stores/intro';
import './simple-transition.css';

/*
 * Refined, fast page transition (the ring transition is parked behind
 * ENABLE_RING_TRANSITION in RingTransition.tsx):
 *
 * - outgoing page: snapshot clone fading to 0 over 140ms
 * - incoming page: fade + rise (10px) + scale 0.995 -> 1 over 240ms,
 *   cubic-bezier(.2,.8,.2,1), sections staggering +30ms (max 4 steps)
 * - lazy-module loads: 2px indeterminate accent progress bar at the top;
 *   the old view stays put until the new one is ready (data router default)
 * - reduced motion: 100ms fade only; suppressed during the login intro;
 *   guard redirects (ringSilent state) stay silent
 */

interface SilentState {
  ringSilent?: boolean;
}

export function SimpleTransitionLayout() {
  const location = useLocation();
  const navigation = useNavigation();
  const navigationType = useNavigationType();
  const introActive = useIntroStore((s) => s.stage === 'pending' || s.stage === 'playing');

  const stageRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const captureRef = useRef<HTMLElement | null>(null);
  const renderKeyRef = useRef(location.key);
  const lastKeyRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const [crossing, setCrossing] = useState(false);

  const pendingSilent = Boolean((navigation.location?.state as SilentState | null)?.ringSilent);
  const showProgress = navigation.state !== 'idle' && !pendingSilent && !introActive;

  // Snapshot the outgoing page during the first render of a new location —
  // the DOM still shows the old page until React commits.
  if (renderKeyRef.current !== location.key) {
    renderKeyRef.current = location.key;
    const stage = stageRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (stage && !reduced && !introActive) {
      const el = stage.cloneNode(true) as HTMLElement;
      el.removeAttribute('data-simple-stage');
      el.querySelectorAll('a[href]').forEach((a) => a.removeAttribute('href'));
      el.style.transform = `translateY(-${window.scrollY}px)`;
      captureRef.current = el;
    }
  }

  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    const isFirst = lastKeyRef.current === undefined;
    lastKeyRef.current = location.key;
    if (isFirst) return;
    if (navigationType === 'REPLACE' || introActive) {
      captureRef.current = null;
      return;
    }

    const snap = captureRef.current;
    captureRef.current = null;
    const host = hostRef.current;
    if (host) {
      host.innerHTML = '';
      if (snap) host.appendChild(snap);
    }
    // restart animations for back-to-back navigations
    for (const el of [stageRef.current, hostRef.current]) {
      if (!el) continue;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    }
    setCrossing(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCrossing(false), 500);
  }, [location.key, navigationType, introActive]);

  useEffect(() => {
    if (crossing) return;
    const host = hostRef.current;
    if (host) host.innerHTML = '';
  }, [crossing]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <div className="simple-root" data-crossing={crossing ? 'true' : undefined}>
      <ScrollRestoration />
      <div ref={stageRef} data-simple-stage="live">
        <Outlet />
      </div>
      <div ref={hostRef} className="simple-old" hidden={!crossing} aria-hidden="true" />
      {showProgress && (
        <div className="nav-progress" aria-hidden="true">
          <span />
        </div>
      )}
    </div>
  );
}
