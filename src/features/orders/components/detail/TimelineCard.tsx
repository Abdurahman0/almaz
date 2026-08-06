import { Card, Tooltip } from '@/shared/ui';
import { formatDateTime, formatRelative } from '@/shared/lib/format';
import { orderStatusLabels } from '@/shared/ui/Badge';
import type { OrderOut, OrderStatus, UserDetailOut } from '@/shared/api/types';

const label = (s: string) => orderStatusLabels[s as OrderStatus] ?? s;

interface TimelineCardProps {
  order: OrderOut;
  staff: UserDetailOut[] | undefined;
}

/** Vertical status timeline from history[], most recent first, with actor names
 *  resolved from the staff list and Uzbek relative timestamps. */
export function TimelineCard({ order, staff }: TimelineCardProps) {
  const entries = [...order.history].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const nameOf = (id: string | null) =>
    id ? staff?.find((u) => u.id === id)?.full_name ?? 'Xodim' : 'Tizim';

  return (
    <Card className="print-block">
      <h2 className="mb-4 text-md font-semibold text-text">Tarix</h2>
      {entries.length === 0 && <p className="text-sm text-muted">Tarix bo'sh</p>}
      <ol className="relative space-y-4 pl-5">
        {entries.length > 1 && (
          <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--border)]" />
        )}
        {entries.map((h, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden
              className={`absolute -left-5 top-1 h-[11px] w-[11px] rounded-full border-2 border-[var(--surface)] ${
                i === 0 ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
              }`}
            />
            <p className="text-sm text-text">
              {h.from_status ? (
                <>
                  <span className="text-muted">{label(h.from_status)}</span>
                  <span className="mx-1 text-muted">→</span>
                </>
              ) : null}
              <span className="font-medium">{label(h.to_status)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {nameOf(h.changed_by)} ·{' '}
              <Tooltip content={formatDateTime(h.created_at)}>
                <span className="tnum cursor-default">{formatRelative(h.created_at)}</span>
              </Tooltip>
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
