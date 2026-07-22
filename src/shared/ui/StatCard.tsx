import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';
import { useCountUp } from '@/shared/hooks/useCountUp';

interface StatCardProps {
  label: string;
  value: number;
  formatter?: (n: number) => string;
  /** Currency/unit word — rendered muted and one step smaller than the amount. */
  suffix?: string;
  icon?: LucideIcon;
  trend?: number | null;
}

export function StatCard({ label, value, formatter, suffix, icon: Icon, trend }: StatCardProps) {
  const animated = useCountUp(value);
  const display = formatter ? formatter(animated) : Math.round(animated).toString();
  return (
    <Card className="relative">
      {Icon && (
        <Icon className="absolute right-4 top-4 h-4 w-4 text-muted" strokeWidth={1.5} aria-hidden />
      )}
      <p className="text-2xs font-semibold uppercase tracking-caps text-muted">{label}</p>
      <p className="mt-2 truncate text-stat tnum text-text">
        {display}
        {suffix && <span className="ml-1 text-sm font-medium text-muted">{suffix}</span>}
      </p>
      {typeof trend === 'number' && (
        <span
          className={`mt-1.5 inline-flex items-center gap-1 text-2xs font-medium ${
            trend >= 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {trend >= 0 ? (
            <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
          ) : (
            <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
          )}
          {Math.abs(trend)}%
        </span>
      )}
    </Card>
  );
}
