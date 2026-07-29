import { useEffect, useRef, useState } from 'react';
import { useUiStore } from '@/shared/stores/ui';
import { useIntroStore } from '@/shared/stores/intro';

const POSTER = '/video/bg-poster.webp';

// Public customer flows (map / checkout links opened on mobile data) get NO
// CRM ambiance — no video, no scrim, no heavy fetch. These are full-page routes
// with no in-app navigation, so a mount-time path check is sufficient.
function isPublicCustomerPage(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p.startsWith('/map/') || p.startsWith('/checkout/');
}

/**
 * Ambient background behind the whole app: a looping muted video (z -2) veiled
 * by a theme-aware scrim (z -1). Mounted once in the app shell.
 *
 * Falls back to the poster image on prefers-reduced-motion, save-data, small /
 * touch screens, or decode failure. The video is paused when the tab is hidden,
 * while the login intro plays, and during the ring page transition, so it never
 * steals frames from those.
 */
function environmentAllowsVideo(): boolean {
  if (typeof matchMedia !== 'function') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const saveData = matchMedia('(prefers-reduced-data: reduce)').matches || nav.connection?.saveData === true;
  const smallOrTouch = matchMedia('(max-width: 768px)').matches || matchMedia('(pointer: coarse)').matches;
  return !reducedMotion && !reducedTransparency && !saveData && !smallOrTouch;
}

export function BackgroundVideo() {
  const mode = useUiStore((s) => s.bgMode);
  const introActive = useIntroStore((s) => s.stage === 'pending' || s.stage === 'playing');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [allowed] = useState(environmentAllowsVideo);
  const [publicPage] = useState(isPublicCustomerPage);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(typeof document !== 'undefined' && document.hidden);
  const [crossing, setCrossing] = useState(false);

  // pause when the tab is hidden
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // pause during the ring page transition (data-crossing on .ring-root)
  useEffect(() => {
    const check = () => setCrossing(Boolean(document.querySelector('.ring-root[data-crossing="true"]')));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-crossing'] });
    return () => obs.disconnect();
  }, []);

  // Safety: a crossing never lasts more than a couple seconds — force it clear
  // so the video can never get stuck paused if the clear mutation is missed.
  useEffect(() => {
    if (!crossing) return;
    const t = window.setTimeout(() => setCrossing(false), 2500);
    return () => window.clearTimeout(t);
  }, [crossing]);

  const useVideo = mode === 'video' && allowed && !failed;

  // drive play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (useVideo && !hidden && !introActive && !crossing) void v.play().catch(() => {});
    else v.pause();
  }, [useVideo, hidden, introActive, crossing]);

  if (mode === 'off' || publicPage) return null;

  return (
    <>
      {useVideo ? (
        <video
          ref={videoRef}
          className="bg-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER}
          onError={() => setFailed(true)}
          aria-hidden="true"
        >
          <source src="/video/bg.webm" type="video/webm" />
          <source src="/video/bg.mp4" type="video/mp4" />
        </video>
      ) : (
        // static mode, or any video-disallowed environment → poster only
        <div
          className="bg-video"
          aria-hidden="true"
          style={{ backgroundImage: `url(${POSTER})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}
      <div className="bg-scrim" aria-hidden="true" />
    </>
  );
}
