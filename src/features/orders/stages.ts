import type { OrderStatus } from '@/shared/api/types';

/**
 * The API's 13 order statuses mapped onto the 5 jewelry crafting stages
 * shown in the stepper. Cancelled/refunded/returned fall outside the pipeline.
 */
export const craftStages = [
  { key: 'eskiz', label: 'Eskiz' },
  { key: 'quyish', label: 'Quyish' },
  { key: 'tosh', label: "Tosh o'rnatish" },
  { key: 'sayqal', label: 'Sayqal' },
  { key: 'topshirildi', label: 'Topshirildi' },
] as const;

export type CraftStageKey = (typeof craftStages)[number]['key'];

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

/** Index of the active craft stage, or -1 for cancelled-family statuses. */
export function craftStageIndex(status: OrderStatus): number {
  return stageByStatus[status];
}
