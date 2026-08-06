import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import {
  Button,
  Card,
  ErrorCard,
  Input,
  Modal,
  PaymentStatusBadge,
  Skeleton,
  toast,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { Money } from '@/shared/ui';
import { listPayments } from '@/features/payments/api';
import { useApprovePayment, useRejectPayment } from '@/features/payments/hooks';

interface PaymentsCardProps {
  orderId: string;
  /** Server grand_total — the denominator once payment amounts ship. */
  grandTotal: string;
}

/**
 * Receipts for this order (server-side order_id filter — one request).
 * NOTE: the API's PaymentOut carries no amount, so progress is shown as
 * approved-of-total receipts, never an invented sum (docs/API-GAPS.md).
 */
export function PaymentsCard({ orderId, grandTotal }: PaymentsCardProps) {
  const payments = useQuery({
    queryKey: ['payments', 'order', orderId],
    queryFn: () => listPayments({ order_id: orderId, limit: 100 }),
    enabled: Boolean(orderId),
  });
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const approved = payments.data?.filter((p) => p.status === 'approved').length ?? 0;
  const total = payments.data?.length ?? 0;
  // Money-based progress lights up automatically once the API returns amounts
  // (docs/API-GAPS.md order-detail #1). Until then: honest receipt counts.
  const hasAmounts = (payments.data ?? []).some((p) => p.amount != null && Number(p.amount) > 0);
  const paidSum = hasAmounts
    ? (payments.data ?? [])
        .filter((p) => p.status === 'approved')
        .reduce((s, p) => s + Number(p.amount ?? 0), 0)
    : 0;
  const grand = Number(grandTotal);
  const remaining = Math.max(0, grand - paidSum);
  const paidPct = hasAmounts && grand > 0 ? Math.min(100, (paidSum / grand) * 100) : null;

  return (
    <Card className="print-block">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-md font-semibold text-text">To'lovlar</h2>
        {total > 0 &&
          (hasAmounts ? (
            <span className="tnum text-xs text-muted">
              To'langan <Money short value={paidSum} className="font-medium text-text" /> · Qoldiq{' '}
              <Money short value={remaining} className="font-medium text-text" />
            </span>
          ) : (
            <span className="tnum text-xs text-muted">
              {approved}/{total} tasdiqlangan
            </span>
          ))}
      </div>

      {payments.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {payments.isError && <ErrorCard error={payments.error} onRetry={() => payments.refetch()} />}

      {payments.isSuccess && total === 0 && (
        <p className="py-4 text-center text-sm text-muted">To'lovlar hali yo'q</p>
      )}

      {total > 0 && (
        <>
          {/* simple progress bar: share of receipts approved (amounts not in the API) */}
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
              style={{ width: `${paidPct ?? (total ? (approved / total) * 100 : 0)}%` }}
            />
          </div>
          <div className="space-y-3">
            {payments.data?.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-[var(--r-sm)] border border-border p-3">
                {p.receipt_url ? (
                  <a href={p.receipt_url} target="_blank" rel="noreferrer" aria-label="Chekni ochish" className="shrink-0">
                    <img
                      src={p.receipt_url}
                      alt="Chek"
                      className="h-12 w-12 rounded-[var(--r-xs)] border border-border bg-surface-2 object-cover"
                    />
                  </a>
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-xs)] border border-border bg-surface-2 text-muted">
                    <Receipt className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">
                    {p.payer_name ?? "Noma'lum to'lovchi"}
                    {p.amount != null && (
                      <span className="tnum ml-2 font-semibold text-accent-ink">
                        <Money value={p.amount} />
                      </span>
                    )}
                  </p>
                  <p className="tnum text-xs text-muted">{formatDateTime(p.created_at)}</p>
                  {p.reject_reason && <p className="mt-0.5 text-xs text-danger">{p.reject_reason}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PaymentStatusBadge status={p.status} />
                  {p.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          approve.mutate(
                            { id: p.id },
                            {
                              onSuccess: () => toast.success("To'lov tasdiqlandi"),
                              onError: () => toast.error('Tasdiqlashda xatolik'),
                            },
                          )
                        }
                      >
                        Tasdiqlash
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRejectId(p.id)}>
                        Rad etish
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={Boolean(rejectId)} onClose={() => setRejectId(null)} heading="To'lovni rad etish">
        <Input
          label="Rad etish sababi"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Chek noaniq..."
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRejectId(null)}>
            Bekor qilish
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (rejectId) reject.mutate({ id: rejectId, reason: reason || null });
              setRejectId(null);
              setReason('');
            }}
          >
            Rad etish
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
