import { useEffect, useRef, type ReactNode } from 'react';

export type Snap = 'peek' | 'half' | 'full';
export const SNAP_FRAC: Record<Snap, number> = { peek: 0.22, half: 0.55, full: 0.9 };
const ORDER: Snap[] = ['peek', 'half', 'full'];
const SPRING = 'height 0.32s cubic-bezier(0.22, 0.9, 0.2, 1)';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Mobile-first bottom sheet with three snap points (peek / half / full). Height-
 * animated so the sticky footer sits at the screen bottom at every snap. Dragging
 * the grab handle/header moves the sheet; dragging inside the list scrolls it and
 * only collapses the sheet when the list is already at the top. Map gestures are
 * never captured (the sheet only listens on its own elements).
 */
export function BottomSheet({
  snap,
  onSnap,
  vh,
  kbInset,
  onHeight,
  peek,
  footer,
  children,
}: {
  snap: Snap;
  onSnap: (s: Snap) => void;
  vh: number;
  /** Keyboard height (visualViewport) so the sheet rides above the keyboard. */
  kbInset: number;
  /** Reports live visible height + whether dependents should animate. */
  onHeight: (px: number, animate: boolean) => void;
  peek: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ startY: 0, startH: 0, active: false, vy: 0, lastY: 0 });

  const avail = vh - kbInset;
  const snapH = (s: Snap) => Math.round(SNAP_FRAC[s] * vh);
  // Floor so the grab handle + peek line + sticky button all fit on short phones.
  const MIN = () => Math.min(Math.max(snapH('peek'), 176), avail - 8);
  const MAX = () => Math.min(snapH('full'), avail - 8);

  // Apply a height (px). animate=false during drag for 1:1 finger tracking.
  const applyH = (h: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    const clamped = clamp(h, MIN(), MAX());
    el.style.transition = animate ? SPRING : 'none';
    el.style.height = `${clamped}px`;
    onHeight(clamped, animate);
  };
  const currentH = () => (sheetRef.current ? parseFloat(sheetRef.current.style.height) || snapH(snap) : snapH(snap));

  const settle = (vy: number) => {
    const h = currentH();
    // nearest snap, with a velocity nudge one step in the fling direction
    let best: Snap = ORDER.reduce((a, b) => (Math.abs(snapH(b) - h) < Math.abs(snapH(a) - h) ? b : a), 'peek');
    const i = ORDER.indexOf(best);
    if (vy < -0.6 && i < 2) best = ORDER[i + 1];
    else if (vy > 0.6 && i > 0) best = ORDER[i - 1];
    applyH(snapH(best), true);
    onSnap(best);
  };

  // Keep the sheet synced to the controlled snap / viewport / keyboard.
  useEffect(() => {
    if (!drag.current.active) applyH(snapH(snap), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, vh, kbInset]);

  // ---- grab-handle / header drag (pointer) ----
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { startY: e.clientY, startH: currentH(), active: true, vy: 0, lastY: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    d.vy = e.clientY - d.lastY;
    d.lastY = e.clientY;
    applyH(d.startH - (e.clientY - d.startY), false);
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    settle(drag.current.vy);
  };

  // ---- list touch arbitration (native, non-passive so we can hijack) ----
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let sy = 0;
    let mode: 'list' | 'sheet' | null = null;
    const ts = (e: TouchEvent) => {
      sy = e.touches[0].clientY;
      mode = null;
      drag.current.lastY = sy;
    };
    const tm = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const dy = y - sy;
      if (mode === null) {
        // Collapse from the list only when it's already scrolled to the top and
        // the finger moves down; otherwise let the list scroll natively.
        if (el.scrollTop <= 0 && dy > 0) {
          mode = 'sheet';
          drag.current = { startY: sy, startH: currentH(), active: true, vy: 0, lastY: sy };
        } else {
          mode = 'list';
          return;
        }
      }
      if (mode !== 'sheet') return;
      e.preventDefault();
      drag.current.vy = y - drag.current.lastY;
      drag.current.lastY = y;
      applyH(drag.current.startH - dy, false);
    };
    const te = () => {
      if (mode === 'sheet') {
        drag.current.active = false;
        settle(drag.current.vy);
      }
      mode = null;
    };
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: false });
    el.addEventListener('touchend', te);
    return () => {
      el.removeEventListener('touchstart', ts);
      el.removeEventListener('touchmove', tm);
      el.removeEventListener('touchend', te);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vh, kbInset, snap]);

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-0 z-30 flex touch-none flex-col overflow-hidden rounded-t-[var(--r-lg)] border-t border-border bg-surface shadow-[0_-8px_40px_rgba(0,0,0,0.35)]"
      style={{ bottom: kbInset, height: snapH(snap) }}
    >
      {/* drag zone: grab handle + peek content */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
      >
        <div className="flex justify-center pb-1 pt-2.5">
          <span className="h-1.5 w-10 rounded-full bg-strong" />
        </div>
        {peek}
      </div>

      {/* scrollable content */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </div>

      {/* sticky footer */}
      <div
        className="shrink-0 border-t border-border bg-surface px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {footer}
      </div>
    </div>
  );
}
