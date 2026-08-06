import type { OrderOut, OrderStatus } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/format';
import { orderStatusLabels } from '@/shared/ui/Badge';
import { ORDER_STAGES, TERMINAL_STATUSES, stageIndexOf, stageSubLabel } from '../stages';
import './StageIcon.css';

interface StageStepperProps {
  status: OrderStatus;
  /** history[] — completed steps show the date the order entered that group. */
  history?: OrderOut['history'];
  /** lg = 62px boxes with labels (order detail); sm = 26px icon row. */
  size?: 'lg' | 'sm';
}

/** When did the order last enter this stage's status group? */
function enteredAt(history: OrderOut['history'] | undefined, statuses: OrderStatus[]): string | null {
  if (!history) return null;
  let latest: string | null = null;
  for (const h of history) {
    if (statuses.includes(h.to_status as OrderStatus)) {
      if (!latest || h.created_at > latest) latest = h.created_at;
    }
  }
  return latest;
}

/**
 * Order lifecycle stepper over the REAL status enum (shared ORDER_STAGES —
 * the same grouping as the Kanban). Terminal states replace the stepper with
 * a danger banner: the flow ended, they are not a step.
 */
export function StageStepper({ status, history, size = 'lg' }: StageStepperProps) {
  if (TERMINAL_STATUSES.includes(status)) {
    const at = enteredAt(history, [status]);
    return (
      <p className="rounded-[var(--r-sm)] border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">
        {orderStatusLabels[status]}
        {at && <span className="tnum"> · {formatDate(at)}</span>}
      </p>
    );
  }

  const active = stageIndexOf(status);
  const sub = stageSubLabel(status);

  return (
    <ol className="flex items-start" aria-label="Buyurtma bosqichlari">
      {ORDER_STAGES.map((stage, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'pending';
        const Icon = stage.icon;
        const at = state === 'done' ? enteredAt(history, stage.statuses) : null;
        return (
          <li key={stage.key} className="flex flex-1 items-start last:flex-none">
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <span className={`stage-icon stage-icon--${size} stage-icon--${state}`}>
                <Icon
                  className={
                    size === 'lg'
                      ? `h-6 w-6 ${state === 'active' ? 'animate-pulse-soft motion-reduce:animate-none' : ''}`
                      : 'h-4 w-4'
                  }
                  strokeWidth={1.5}
                  aria-hidden
                />
              </span>
              {size === 'lg' && (
                <span className="flex flex-col items-center text-center">
                  <span
                    className={`text-2xs font-medium leading-tight ${
                      state === 'pending' ? 'text-muted opacity-60' : 'text-accent-ink'
                    }`}
                  >
                    {stage.label}
                  </span>
                  {state === 'active' && sub && (
                    <span className="mt-0.5 text-2xs leading-tight text-muted">{sub}</span>
                  )}
                  {at && (
                    <span className="tnum mt-0.5 text-2xs leading-tight text-muted">{formatDate(at)}</span>
                  )}
                </span>
              )}
            </div>
            {i < ORDER_STAGES.length - 1 && (
              <span
                aria-hidden
                className={`mx-2 mt-[31px] h-px flex-1 ${
                  i < active ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
