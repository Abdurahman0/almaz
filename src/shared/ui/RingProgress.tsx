import { motion, useReducedMotion } from 'framer-motion';

interface RingProgressProps {
  /** 0..100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

/** Installment ring: the band fills with gold as payments arrive. */
export function RingProgress({ percent, size = 96, strokeWidth = 7, label }: RingProgressProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const reduced = useReducedMotion();
  const gradId = `ring-gold-${size}`;

  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={`${Math.round(clamped)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-strong)" />
          </linearGradient>
        </defs>
        {/* dim outline = the unfilled band */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * clamped) / 100 }}
          transition={reduced ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg tnum text-text">{Math.round(clamped)}%</span>
        {label && <span className="text-2xs text-muted">{label}</span>}
      </div>
    </div>
  );
}
