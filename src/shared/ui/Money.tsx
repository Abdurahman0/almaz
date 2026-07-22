import { moneyParts } from '@/shared/lib/format';

interface MoneyProps {
  value: number | string;
  /** Abbreviated amount (24.8 mln) — dashboard stats and compact cards only. */
  short?: boolean;
  className?: string;
}

/**
 * Money value with tabular figures; the currency word is muted and one
 * type-scale step smaller than the amount.
 */
export function Money({ value, short, className = '' }: MoneyProps) {
  const { amount, unit } = moneyParts(value, short);
  return (
    <span className={`tnum whitespace-nowrap ${className}`}>
      {amount} <span className="text-xs font-medium text-muted">{unit}</span>
    </span>
  );
}
