import { motion, useReducedMotion } from 'framer-motion';

export type ClientTier = '375' | '585' | '750' | '999';

export const tierOrder: ClientTier[] = ['375', '585', '750', '999'];

const tierStyles: Record<ClientTier, string> = {
  '375': 'border-border text-muted',
  '585': 'border-strong text-accent-ink',
  '750': 'border-strong text-accent-ink',
  '999': 'border-accent text-accent-ink',
};

interface HallmarkBadgeProps {
  tier: ClientTier;
  /** Trigger the stamp animation (e.g. on tier-up). */
  stamp?: boolean;
  size?: 'sm' | 'md';
}

/** Engraved hallmark stamp (proba) — the client tier mark. */
export function HallmarkBadge({ tier, stamp, size = 'md' }: HallmarkBadgeProps) {
  const reduced = useReducedMotion();
  const dims = size === 'sm' ? 'h-6 min-w-9 px-1.5 text-2xs' : 'h-7 min-w-11 px-2 text-xs';
  return (
    <motion.span
      key={stamp ? tier : undefined}
      initial={stamp && !reduced ? { scale: 1.15, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`inline-flex items-center justify-center rounded border font-semibold tracking-wide ${dims} ${tierStyles[tier]}`}
      aria-label={`Proba ${tier}`}
    >
      {tier}
    </motion.span>
  );
}

/** Total purchases (so'm) -> tier. */
export function tierForTotal(total: number): ClientTier {
  if (total >= 100_000_000) return '999';
  if (total >= 50_000_000) return '750';
  if (total >= 20_000_000) return '585';
  return '375';
}
