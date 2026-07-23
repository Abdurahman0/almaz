import { useEffect, useRef } from 'react';

interface RingSpinProps {
  /** Rendered square size in px. The render has internal padding, so the
   *  visible ring is ~60% of this. */
  size?: number;
  /** Spin speed multiplier; 1 = one rotation per 2s (native frame rate). */
  speed?: number;
  /** URL prefix where the spin assets are served. */
  assetPath?: string;
  className?: string;
}

/* The 3D Blender-rendered ring, spinning continuously on its axis.
 * Honors prefers-reduced-motion by holding the first frame. */
export function RingSpin({ size = 96, speed = 1, assetPath = '/', className }: RingSpinProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (query.matches) {
        video.pause();
        video.currentTime = 0;
      } else if (document.hidden) {
        video.pause();
      } else {
        video.playbackRate = speed;
        video.play().catch(() => {});
      }
    };
    apply();
    query.addEventListener('change', apply);
    document.addEventListener('visibilitychange', apply);
    return () => {
      query.removeEventListener('change', apply);
      document.removeEventListener('visibilitychange', apply);
    };
  }, [speed]);

  return (
    <video
      ref={videoRef}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src={`${assetPath}ring_spin_512.webm`} type="video/webm" />
      <img src={`${assetPath}ring_spin_384.webp`} alt="" width={size} height={size} />
    </video>
  );
}
