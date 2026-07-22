import { flushSync } from 'react-dom';
import type React from 'react';

/**
 * Switch theme/accent as a circular wave expanding from the click position
 * (View Transitions API). Fallback: instant switch + 200ms body crossfade.
 */
export function switchThemeFromEvent(e: React.MouseEvent, apply: () => void): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    apply();
    return;
  }
  if (typeof document.startViewTransition !== 'function') {
    apply();
    document.body.animate({ opacity: [0.6, 1] }, { duration: 200, easing: 'ease-out' });
    return;
  }

  const x = e.clientX;
  const y = e.clientY;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const t = document.startViewTransition(() => {
    flushSync(apply);
  });
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      {
        duration: 650,
        easing: 'cubic-bezier(.4,0,.2,1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}
