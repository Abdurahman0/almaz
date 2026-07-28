import type { OrderStatus } from '@/shared/api/types';

/**
 * The API's order statuses mapped onto the 5 jewelry crafting stages shown in
 * the pipeline (see STAGE_META in StageIcon.tsx for the stage labels/icons).
 * Cancelled/refunded/returned fall outside the pipeline (-1).
 */
const stageByStatus: Record<OrderStatus, number> = {
  draft: 0,
  pending: 0,
  waiting_payment: 0,
  payment_review: 0,
  confirmed: 1,
  preparing: 2,
  packed: 3,
  shipping: 3,
  delivered: 4,
  completed: 4,
  cancelled: -1,
  refunded: -1,
  returned: -1,
};

/** Index (0..4) of the active craft stage, or -1 for cancelled-family statuses. */
export function craftStageIndex(status: OrderStatus): number {
  return stageByStatus[status];
}
