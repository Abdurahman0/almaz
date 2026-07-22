import type { ReactNode } from 'react';
import type { OrderStatus, PaymentStatus, ProductStatus } from '@/shared/api/types';

type Tone = 'gold' | 'success' | 'danger' | 'muted' | 'rose';

/* Tint backgrounds via *-soft rgba; text uses the strong/theme-adjusted shade. */
const tones: Record<Tone, string> = {
  gold: 'bg-accent-soft text-accent-ink',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  rose: 'bg-danger-soft text-danger',
  muted: 'bg-muted-soft text-muted',
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: 'Qoralama',
  pending: 'Kutilmoqda',
  waiting_payment: "To'lov kutilmoqda",
  payment_review: "To'lov tekshiruvda",
  confirmed: 'Tasdiqlangan',
  preparing: 'Tayyorlanmoqda',
  packed: 'Qadoqlangan',
  shipping: "Yo'lda",
  delivered: 'Yetkazildi',
  completed: 'Yakunlangan',
  cancelled: 'Bekor qilingan',
  refunded: 'Qaytarilgan',
  returned: 'Qaytib keldi',
};

export function orderStatusTone(status: OrderStatus): Tone {
  if (status === 'completed' || status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'refunded' || status === 'returned') return 'danger';
  if (status === 'draft') return 'muted';
  return 'gold';
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderStatusTone(status)}>{orderStatusLabels[status]}</Badge>;
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Kutilmoqda',
  approved: 'Tasdiqlangan',
  rejected: 'Rad etilgan',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone: Tone = status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'gold';
  return <Badge tone={tone}>{paymentStatusLabels[status]}</Badge>;
}

export const productStatusLabels: Record<ProductStatus, string> = {
  draft: 'Qoralama',
  active: 'Faol',
  archived: 'Arxiv',
};
