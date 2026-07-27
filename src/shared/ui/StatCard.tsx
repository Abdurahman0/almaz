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
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 truncate text-stat tnum text-text">
        {display}
        {suffix && <span className="ml-1 text-sm font-medium text-muted">{suffix}</span>}
      </p>
      {typeof trend === 'number' && (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${
            trend >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
          }`}
        >
          {trend >= 0 ? (
            <TrendingUp className="h-3 w-3" strokeWidth={2} />
          ) : (
            <TrendingDown className="h-3 w-3" strokeWidth={2} />
          )}
          {Math.abs(trend)}%
        </span>
      )}
    </Card>
  );
}
