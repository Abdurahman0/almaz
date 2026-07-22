import { motion, useReducedMotion } from 'framer-motion';
import { formatNumber } from '@/shared/lib/format';

interface RingSizeConeProps {
  value: number;
  onChange: (size: number) => void;
}

export const RING_SIZES: number[] = Array.from({ length: 15 }, (_, i) => 15 + i * 0.5);

/** Jeweler's sizing cone: the ring slides up/down the cone as the size changes. */
export function RingSizeCone({ value, onChange }: RingSizeConeProps) {
  const reduced = useReducedMotion();
  const idx = RING_SIZES.indexOf(value);
  const t = (idx === -1 ? 0 : idx) / (RING_SIZES.length - 1); // 0 = size 15 (top/narrow)
  // cone: apex at top (x half-width 14) widening to base (half-width 52)
  const y = 30 + t * 150;
  const halfW = 14 + t * 38;
  const diameter = value; // ring size in UZ practice = inner diameter in mm
  const circumference = Math.PI * diameter;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-10">
      <svg width="140" height="220" viewBox="0 0 140 220" aria-hidden className="shrink-0">
        <defs>
          <linearGradient id="cone-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="50%" stopColor="var(--surface-2)" />
            <stop offset="100%" stopColor="var(--surface)" />
          </linearGradient>
        </defs>
        {/* cone */}
        <path d="M70 20 L18 195 A52 10 0 0 0 122 195 Z" fill="url(#cone-body)" stroke="var(--border-strong)" strokeWidth="1" />
        <ellipse cx="70" cy="195" rx="52" ry="10" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1" />
        {/* size gradations */}
        {[0.15, 0.35, 0.55, 0.75, 0.95].map((g) => (
          <line
            key={g}
            x1={70 - (14 + g * 38) * 0.7}
            x2={70 + (14 + g * 38) * 0.7}
            y1={30 + g * 150}
            y2={30 + g * 150}
            stroke="var(--border-strong)"
            strokeWidth="1"
          />
        ))}
        {/* the ring riding the cone */}
        <motion.g
          animate={{ y: y - 100 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
        >
          <ellipse cx="70" cy="100" rx={halfW} ry={halfW * 0.28} fill="none" stroke="var(--accent)" strokeWidth="5" />
          <ellipse
            cx="70"
            cy="100"
            rx={halfW}
            ry={halfW * 0.28}
            fill="none"
            stroke="var(--text)"
            strokeOpacity="0.25"
            strokeWidth="1.5"
          />
          <path d={`M${70 - 4} ${100 - halfW * 0.28 - 8} l4 -5 4 5 -4 6 z`} fill="var(--accent)" />
        </motion.g>
      </svg>

      <div className="w-full max-w-xs space-y-4">
        <div className="text-center sm:text-left">
          <span className="text-stat tnum text-accent-ink">{value.toFixed(1)}</span>
          <span className="ml-2 text-sm text-muted">o'lcham</span>
        </div>
        <input
          type="range"
          min={0}
          max={RING_SIZES.length - 1}
          step={1}
          value={idx === -1 ? 0 : idx}
          onChange={(e) => onChange(RING_SIZES[Number(e.target.value)])}
          aria-label="Uzuk o'lchami"
          className="w-full accent-accent"
        />
        <dl className="grid grid-cols-2 gap-3 text-center sm:text-left">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-2xs uppercase tracking-caps text-muted">Diametr</dt>
            <dd className="mt-1 text-md font-semibold text-text">
              {formatNumber(diameter)} mm
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-2xs uppercase tracking-caps text-muted">Aylana</dt>
            <dd className="mt-1 text-md font-semibold text-text">
              {circumference.toFixed(1)} mm
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
