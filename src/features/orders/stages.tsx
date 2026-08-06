import {
  BadgeCheck,
  CheckCircle2,
  FilePlus2,
  Package,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { OrderStatus } from '@/shared/api/types';

/*
 * THE order lifecycle definition — the real OrderStatus enum grouped into the
 * six steps a salesperson thinks in. Drives the order-detail stepper, the
 * Kanban columns, the orders-list filter and any stage icon anywhere.
 * There are no fictional workshop stages: every step maps 1:1 onto backend
 * statuses, and terminal states (cancelled/refunded/returned) are not a step.
 */
export interface OrderStage {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Kanban accent color (data color, same set the board always used). */
  color: string;
  /** Status a Kanban drop into this column assigns. */
  primary: OrderStatus;
  /** Real statuses covered by this step. */
  statuses: OrderStatus[];
}

export const ORDER_STAGES: OrderStage[] = [
  { key: 'new', label: 'Yangi', icon: FilePlus2, color: '#8b929e', primary: 'pending', statuses: ['draft', 'pending'] },
  { key: 'payment', label: "To'lov kutilmoqda", icon: Wallet, color: '#c69a4a', primary: 'waiting_payment', statuses: ['waiting_payment', 'payment_review'] },
  { key: 'confirmed', label: 'Tasdiqlangan', icon: BadgeCheck, color: '#5b86c4', primary: 'confirmed', statuses: ['confirmed'] },
  { key: 'preparing', label: 'Tayyorlanmoqda', icon: Package, color: '#9a7bc4', primary: 'preparing', statuses: ['preparing', 'packed'] },
  { key: 'shipping', label: "Yo'lda", icon: Truck, color: '#4aa3c8', primary: 'shipping', statuses: ['shipping'] },
  { key: 'done', label: 'Yakunlangan', icon: CheckCircle2, color: '#4caf7d', primary: 'delivered', statuses: ['delivered', 'completed'] },
];

export const TERMINAL_STATUSES: OrderStatus[] = ['cancelled', 'refunded', 'returned'];

/** Index of the step covering `status`, or -1 for terminal states. */
export function stageIndexOf(status: OrderStatus): number {
  return ORDER_STAGES.findIndex((s) => s.statuses.includes(status));
}

/** The stage covering `status` (undefined for terminal states). */
export function stageOf(status: OrderStatus): OrderStage | undefined {
  return ORDER_STAGES[stageIndexOf(status)];
}

/** Sub-status precision under the step label ("chek tekshirilmoqda" etc.) —
 *  only for statuses that refine their group, null when the step label says it all. */
const SUB_LABELS: Partial<Record<OrderStatus, string>> = {
  draft: 'qoralama',
  payment_review: 'chek tekshirilmoqda',
  packed: 'qadoqlangan',
  delivered: 'yetkazildi',
};
export function stageSubLabel(status: OrderStatus): string | null {
  return SUB_LABELS[status] ?? null;
}
