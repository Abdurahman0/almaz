import { useEffect, useRef } from 'react';
import { getRingFrames } from '@/shared/lib/ringFrames';

interface RingCanvasProps {
  /** Rendered square size in px (the render has internal padding, visible ring ~57%). */
  size: number;
  /** One full rotation per this many ms. */
  rotationMs?: number;
  assetPath?: string;
  className?: string;
}

/*
 * The 3D ring spinning at constant angular velocity, rAF-driven with
 * adjacent-frame crossfade — no visible stepping even at very slow speeds.
 * Pauses when the tab is hidden; static first frame under reduced motion.
 */
export function RingCanvas({ size, rotationMs = 14000, assetPath = '/', className }: RingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let frames: ImageBitmap[] | null = null;
    let angle = 0; // rotations
    let last: number | null = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const draw = () => {
      if (!frames) return;
      const n = frames.length;
      const pos = ((angle % 1) + 1) % 1;
      const f = pos * n;
      const a = Math.floor(f) % n;
      const b = (a + 1) % n;
      const frac = f - Math.floor(f);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(frames[a], 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = frac;
      ctx.drawImage(frames[b], 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (last !== null) angle += (now - last) / rotationMs;
      last = now;
      draw();
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = null;
      if (reduced.matches) {
        draw(); // static first frame
        return;
      }
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    let disposed = false;
    void getRingFrames(assetPath).then((f) => {
      if (disposed) return;
      frames = f;
      draw();
      start();
    });

    const onVisibility = () => start();
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onVisibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onVisibility);
    };
  }, [size, rotationMs, assetPath]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
      data-ring-canvas
    />
  );
}
