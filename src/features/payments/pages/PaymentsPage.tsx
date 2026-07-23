import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Receipt, X } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorCard,
  Input,
  Modal,
  PageHeader,
  PaymentStatusBadge,
  SkeletonRows,
  paymentStatusLabels,
  toast,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useApprovePayment, usePayments, useRejectPayment } from '../hooks';
import type { PaymentStatus } from '@/shared/api/types';

export default function PaymentsPage() {
  const [status, setStatus] = useState<PaymentStatus | 'all'>('pending');
  const payments = usePayments(status === 'all' ? undefined : status);
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div>
      <PageHeader heading="To'lovlar" subheading="Cheklar tekshiruvi" />

      <div className="mb-6 flex flex-wrap gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setStatus(opt)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              status === opt
                ? 'border-accent bg-accent-soft text-accent-ink'
                : 'border-border text-muted hover:text-text'
            }`}
          >
            {opt === 'all' ? 'Barchasi' : paymentStatusLabels[opt]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {payments.isPending && <SkeletonRows rows={5} />}
        {payments.isError && <ErrorCard error={payments.error} onRetry={() => payments.refetch()} />}
        {payments.isSuccess && payments.data.length === 0 && (
          <Card>
            <EmptyState heading="To'lovlar yo'q" hint="Yangi cheklar shu yerda ko'rinadi" />
          </Card>
        )}
        {payments.data?.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <PaymentStatusBadge status={p.status} />
                <Link
                  to={`/orders/${p.order_id}`}
                  className="text-sm font-semibold text-text hover:text-accent-ink"
                >
                  Buyurtma {p.order_id.slice(0, 8)}
                </Link>
              </div>
              <p className="mt-1 text-xs text-muted">
                {p.payer_name ?? 'Nomaʼlum to‘lovchi'} · {formatDateTime(p.created_at)}
              </p>
              {p.reject_reason && <p className="mt-1 text-xs text-danger">{p.reject_reason}</p>}
            </div>
            <div className="flex items-center gap-2">
              {p.receipt_url && (
                <a
                  href={p.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:text-accent-ink"
                >
                  <Receipt className="h-4 w-4" strokeWidth={1.5} /> Chek
                </a>
              )}
              {p.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => approve.mutate({ id: p.id }, { onSuccess: () => toast.success("To'lov tasdiqlandi"), onError: () => toast.error('Tasdiqlashda xatolik') })}>
                    <Check className="h-4 w-4" strokeWidth={2} /> Tasdiqlash
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setRejectId(p.id)}>
                    <X className="h-4 w-4" strokeWidth={2} /> Rad etish
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
