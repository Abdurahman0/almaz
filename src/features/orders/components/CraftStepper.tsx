import { craftStages, craftStageIndex } from '../stages';
import type { OrderStatus } from '@/shared/api/types';

type StageState = 'done' | 'active' | 'upcoming';

/** One small ring per stage: filled gold when reached, hairline outline when not. */
function StageRing({ state }: { state: StageState }) {
  const reached = state !== 'upcoming';
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      aria-hidden
      className={state === 'active' ? 'animate-pulse-soft motion-reduce:animate-none' : undefined}
    >
      <circle
        cx="20"
        cy="23"
        r="11"
        fill="none"
        stroke={reached ? 'var(--accent)' : 'var(--border-strong)'}
        strokeWidth="3"
      />
      <path
        d="M20 4 L24 9 L20 15 L16 9 Z"
        fill={reached ? 'var(--accent)' : 'none'}
        stroke={reached ? 'none' : 'var(--border-strong)'}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CraftStepper({ status }: { status: OrderStatus }) {
  const active = craftStageIndex(status);
  const cancelled = active === -1;

  if (cancelled) {
    return (
      <p className="rounded-lg border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
        Buyurtma bekor qilingan — tayyorlash jarayoni to'xtatilgan.
      </p>
    );
  }

  return (
    <ol className="flex items-start justify-between gap-1" aria-label="Tayyorlanish bosqichlari">
      {craftStages.map((stage, i) => {
        const state: StageState = i < active ? 'done' : i === active ? 'active' : 'upcoming';
        return (
          <li key={stage.key} className="flex flex-1 flex-col items-center gap-1 text-center">
            <StageRing state={state} />
            <span
              className={`text-2xs font-medium leading-tight ${
                state === 'upcoming' ? 'text-muted' : state === 'active' ? 'text-accent-ink' : 'text-accent-ink'
              }`}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
