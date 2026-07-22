import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { RingMark } from '@/shared/ui/RingMark';
import { dismissAllFloating } from '@/shared/lib/dismissFloating';

const WIPE_DURATION = 1.2;

interface Snapshot {
  key: string;
  node: ReactNode;
}

/**
 * Grand Ring page transition. A large ring glides left -> right while the old
 * page wipes away behind its leading edge; the new page's sections stagger in
 * behind it (see .reveal-stagger in index.css). Disabled under reduced motion.
 */
export function RingTransition() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState<Snapshot>({ key: location.pathname, node: outlet });
  const [prev, setPrev] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (location.pathname === displayed.key) return;
    // Portaled dropdowns/popovers live on <body>, outside the wipe layers —
    // close them all so nothing is left floating over the new page.
    dismissAllFloating();
    if (!reduced) setPrev(displayed);
    setDisplayed({ key: location.pathname, node: outlet });
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const transitioning = prev !== null;

  return (
    <div className="relative min-h-full">
      {/* New page — revealed behind the ring, sections trail in a stagger */}
      <motion.div
        key={displayed.key}
        className={transitioning ? 'reveal-stagger' : ''}
        initial={reduced ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {displayed.node}
      </motion.div>

      {transitioning && (
        <>
          {/* Old page wiping away, left -> right */}
          <motion.div
            className="absolute inset-0 z-[41] overflow-hidden bg-bg"
            initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 100%)' }}
            transition={{ duration: WIPE_DURATION, ease: [0.55, 0.06, 0.35, 0.94] }}
            onAnimationComplete={() => setPrev(null)}
          >
            {prev.node}
          </motion.div>

          {/* Accent light veil trailing the ring */}
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-y-0 z-[42] w-[40vw]"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--accent-soft) 60%, var(--accent-soft))',
            }}
            initial={{ left: '-55vw' }}
            animate={{ left: '105vw' }}
            transition={{ duration: WIPE_DURATION, ease: [0.55, 0.06, 0.35, 0.94] }}
          />

          {/* The ring itself: glides across, rotating ~540° around its axis */}
          <motion.div
            aria-hidden
            className="pointer-events-none fixed top-1/2 z-[43] -translate-y-1/2"
            initial={{ left: '-60vh' }}
            animate={{ left: '108vw' }}
            transition={{ duration: WIPE_DURATION, ease: [0.55, 0.06, 0.35, 0.94] }}
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 540 }}
              transition={{ duration: WIPE_DURATION, ease: 'linear' }}
              style={{ filter: 'drop-shadow(0 0 32px var(--accent-soft))' }}
            >
              <RingMark size={Math.round(window.innerHeight * 0.55)} />
            </motion.div>
          </motion.div>

          {/* Block interaction while the ring is in flight */}
          <div className="fixed inset-0 z-[44]" aria-hidden />
        </>
      )}
    </div>
  );
}
