import { craftStageIndex } from '../stages';
import { StageIcon, STAGE_META, STAGE_ORDER, type StageStatus } from './StageIcon';
import { formatDate } from '@/shared/lib/format';
import type { OrderStatus, OrderStatusHistoryOut } from '@/shared/api/types';

const chipText: Record<StageStatus, string> = {
  done: 'Tayyor',
  active: 'Jarayonda',
  pending: 'Navbatda',
};

function StatusChip({ state }: { state: StageStatus }) {
  const cls =
    state === 'done'
      ? 'bg-accent-soft text-accent-ink'
      : state === 'active'
        ? 'border border-accent/45 text-accent-ink'
        : 'bg-surface-2 text-muted';
  return (
    <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${cls}`}>{chipText[state]}</span>
  );
}

export function CraftStepper({
  status,
  history,
}: {
  status: OrderStatus;
  history?: OrderStatusHistoryOut[];
}) {
  const active = craftStageIndex(status);

  if (active === -1) {
    return (
      <p className="rounded-lg border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
        Buyurtma bekor qilingan — tayyorlash jarayoni to'xtatilgan.
      </p>
    );
  }

  // Date each stage was reached, from the status history (earliest entry that
  // lands on that craft stage).
  const stageDate: Array<string | undefined> = [];
  for (const h of history ?? []) {
    const idx = craftStageIndex(h.to_status as OrderStatus);
    if (idx >= 0 && stageDate[idx] === undefined) stageDate[idx] = h.created_at;
  }

  const stateOf = (i: number): StageStatus => (i < active ? 'done' : i === active ? 'active' : 'pending');

  return (
    <>
      {/* Desktop / tablet: horizontal stepper */}
      <ol className="hidden gap-1 overflow-x-auto pb-1 sm:flex" aria-label="Tayyorlanish bosqichlari">
        {STAGE_ORDER.map((key, i) => {
          const state = stateOf(i);
          return (
            <li
              key={key}
              aria-current={state === 'active' ? 'step' : undefined}
              className="relative flex min-w-[96px] flex-1 flex-col items-center gap-1.5"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute h-px"
                  style={{
                    top: 31,
                    left: 0,
                    width: 'calc(100% - 66px)',
                    transform: 'translateX(-50%)',
                    background: i <= active ? 'var(--accent)' : 'var(--border)',
                  }}
                />
              )}
              <StageIcon stage={key} status={state} size="lg" />
              <span className={`text-center text-2xs font-semibold leading-tight ${state === 'pending' ? 'text-muted' : 'text-accent-ink'}`}>
                {STAGE_META[key].label}
              </span>
              <span className="tnum text-2xs text-muted">{stageDate[i] ? formatDate(stageDate[i]!) : '—'}</span>
              <StatusChip state={state} />
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical stepper */}
      <ol className="flex flex-col sm:hidden" aria-label="Tayyorlanish bosqichlari">
        {STAGE_ORDER.map((key, i) => {
          const state = stateOf(i);
          const isLast = i === STAGE_ORDER.length - 1;
          return (
            <li
              key={key}
              aria-current={state === 'active' ? 'step' : undefined}
              className={`relative flex gap-3 ${isLast ? '' : 'pb-4'}`}
            >
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute w-px"
                  style={{ left: 31, top: 62, bottom: 0, background: i < active ? 'var(--accent)' : 'var(--border)' }}
                />
              )}
              <StageIcon stage={key} status={state} size="lg" />
              <div className="flex flex-col gap-1 pt-2">
                <span className={`text-sm font-semibold leading-tight ${state === 'pending' ? 'text-muted' : 'text-text'}`}>
                  {STAGE_META[key].label}
                </span>
                <span className="tnum text-2xs text-muted">{stageDate[i] ? formatDate(stageDate[i]!) : '—'}</span>
                <div><StatusChip state={state} /></div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
