import type { OrderStatus } from '@/shared/api/types';
import './StageIcon.css';

/*
 * Workshop stage icons (Eskiz → Quyish → Tosh o'rnatish → Sayqal → Topshirildi)
 * drawn to the contract in StageIcon.css: svg.si-anim[data-stage] with the
 * si-* part classes; pathLength=1 wherever the CSS animates dashoffset.
 */

export const craftStages = [
  { key: 'sketch', label: 'Eskiz' },
  { key: 'casting', label: 'Quyish' },
  { key: 'setting', label: "Tosh o'rnatish" },
  { key: 'polish', label: 'Sayqal' },
  { key: 'delivered', label: 'Topshirildi' },
] as const;
export type StageKey = (typeof craftStages)[number]['key'];

const stageByStatus: Record<OrderStatus, number> = {
  draft: 0, pending: 0, waiting_payment: 0, payment_review: 0,
  confirmed: 1,
  preparing: 2,
  packed: 3, shipping: 3,
  delivered: 4, completed: 4,
  cancelled: -1, refunded: -1, returned: -1,
};
export const craftStageIndex = (s: OrderStatus): number => stageByStatus[s];

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Glyph({ stage, animate }: { stage: StageKey; animate: boolean }) {
  const cls = animate ? 'si-anim' : undefined;
  switch (stage) {
    case 'sketch':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" className={cls} data-stage="sketch" aria-hidden>
          <path className="si-stroke" pathLength={1} d="M6 24 Q6 12 15 10 Q24 8 24 16" {...P} />
          <g className="si-pencil">
            <path d="M22 8 l4 4 -8 8 -5 1 1 -5 z" {...P} />
          </g>
        </svg>
      );
    case 'casting':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" className={cls} data-stage="casting" aria-hidden>
          <g className="si-crucible">
            <path d="M6 6 h9 l-1.5 7 h-6 z" {...P} />
          </g>
          <circle className="si-droplet" cx="16.5" cy="15" r="1.4" fill="currentColor" stroke="none" />
          <path d="M10 25 h12 M11 25 v-3.5 h10 v3.5" {...P} />
          <path className="si-rim" d="M11 21.5 h10" {...P} />
        </svg>
      );
    case 'setting':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" className={cls} data-stage="setting" aria-hidden>
          <g className="si-descend">
            <path d="M12 4 l6 3 M15 5.5 l-1 6" {...P} />
            <path d="M15 12 l3 2.5 -3 3.5 -3 -3.5 z" {...P} />
          </g>
          <path d="M9 24 a6 4.5 0 0 0 12 0 M9 24 a6 4.5 0 0 1 12 0" {...P} />
          <path className="si-sparkle" d="M24 8 l0 4 M22 10 l4 0" {...P} />
        </svg>
      );
    case 'polish':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" className={cls} data-stage="polish" aria-hidden>
          <g className="si-wheel">
            <circle cx="10" cy="12" r="5.5" {...P} />
            <path d="M10 6.5 v11 M4.5 12 h11" {...P} />
          </g>
          <circle cx="20" cy="21" r="5" {...P} />
          <path className="si-shine" d="M23.5 16.5 l3 -3" {...P} />
        </svg>
      );
    case 'delivered':
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" className={cls} data-stage="delivered" aria-hidden>
          <g className="si-lid">
            <path d="M7 12 l8 -4 8 4" {...P} />
          </g>
          <path d="M7 14 h16 v9 h-16 z" {...P} />
          <path className="si-check" pathLength={1} d="M11.5 18.5 l2.5 2.5 5 -5" {...P} />
        </svg>
      );
  }
}

interface StageStepperProps {
  status: OrderStatus;
  /** lg = 62px animated boxes (order detail); sm = 26px static row. */
  size?: 'lg' | 'sm';
}

/** Jewelry-workshop stage stepper. Cancelled-family statuses show a quiet notice. */
export function StageStepper({ status, size = 'lg' }: StageStepperProps) {
  const active = craftStageIndex(status);
  if (active === -1) {
    return (
      <p className="rounded-[var(--r-sm)] border border-danger-soft bg-danger-soft px-4 py-2.5 text-sm text-danger">
        Buyurtma bekor qilingan — tayyorlash jarayoni to'xtatilgan.
      </p>
    );
  }
  return (
    <ol className="flex items-start" aria-label="Tayyorlanish bosqichlari">
      {craftStages.map((stage, i) => {
        const state = i < active ? 'done' : i === active ? 'active' : 'pending';
        return (
          <li key={stage.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className={`stage-icon stage-icon--${size} stage-icon--${state}`}>
                <Glyph stage={stage.key} animate={state === 'active' && size === 'lg'} />
              </span>
              {size === 'lg' && (
                <span
                  className={`text-2xs font-medium leading-tight ${
                    state === 'pending' ? 'text-muted opacity-60' : 'text-accent-ink'
                  }`}
                >
                  {stage.label}
                </span>
              )}
            </div>
            {i < craftStages.length - 1 && (
              <span
                aria-hidden
                className={`mx-2 mb-5 h-px flex-1 self-center ${
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
