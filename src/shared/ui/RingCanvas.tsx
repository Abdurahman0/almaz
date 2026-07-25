import { useEffect, useRef } from 'react';
import { getRingSheet, frameIndexFor } from '@/shared/lib/ringFrames';

interface RingCanvasProps {
  /** Rendered square size in px (the render is centered; ring ~92% of frame). */
  size: number;
  /** One full rotation per this many ms. */
  rotationMs?: number;
  assetPath?: string;
  className?: string;
}

/*
 * The 3D ring spinning at constant angular velocity, drawn from the 320px
 * spritesheet — one small texture, plain per-frame stepping (180 frames are
 * natively smooth, no crossfade needed). Pauses on hidden tab; static gem
 * frame under reduced motion.
 */
export function RingCanvas({ size, rotationMs = 7000, assetPath = '/', className }: RingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';

    let raf = 0;
    let sheet: Awaited<ReturnType<typeof getRingSheet>> | null = null;
    let angle = 0; // rotations
    let last: number | null = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const draw = () => {
      if (!sheet) return;
      const idx = frameIndexFor(angle);
      const col = idx % sheet.cols;
      const row = Math.floor(idx / sheet.cols);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        sheet.image,
        col * sheet.frameW,
        row * sheet.frameH,
        sheet.frameW,
        sheet.frameH,
        0,
        0,
        canvas.width,
        canvas.height,
      );
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
        draw(); // static gem frame
        return;
      }
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    let disposed = false;
    void getRingSheet(assetPath).then((s) => {
      if (disposed) return;
      sheet = s;
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
