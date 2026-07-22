import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Counts 0 -> target on mount / target change. Ease-out cubic, ~0.7s. */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, reduced]);

  return value;
}
