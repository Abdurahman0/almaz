import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Check, Receipt, RotateCcw, X } from 'lucide-react';
import {
  Button,
  Card,
  DateRangePicker,
  EmptyState,
  ErrorCard,
  Input,
  Modal,
  PageHeader,
  PaymentStatusBadge,
  Select,
  SkeletonRows,
  paymentStatusLabels,
  toast,
  type Range,
  type SelectOption,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useApprovePayment, usePayments, useRejectPayment } from '../hooks';
import type { PaymentStatus } from '@/shared/api/types';

const statusOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'pending', label: paymentStatusLabels.pending },
  { value: 'approved', label: paymentStatusLabels.approved },
  { value: 'rejected', label: paymentStatusLabels.rejected },
];

export default function PaymentsPage() {
  // Filters live in the URL → shareable + survive refresh + browser back/forward.
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const from = params.get('from');
  const to = params.get('to');
  const range: Range | null = from && to ? { from: parseISO(from), to: parseISO(to) } : null;
  const hasFilters = Boolean(status || (from && to));

  const patch = (mut: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mut(next);
    setParams(next, { replace: true });
  };
  const setStatus = (v: string) =>
    patch((p) => { if (v) p.set('status', v); else p.delete('status'); });
  const setRange = (r: Range) =>
    patch((p) => { p.set('from', format(r.from, 'yyyy-MM-dd')); p.set('to', format(r.to, 'yyyy-MM-dd')); });
  const reset = () => setParams({}, { replace: true });

  const payments = usePayments({
    status: (status as PaymentStatus) || undefined,
    date_from: from ?? undefined,
    date_to: to ?? undefined,
  });
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  return (
    <div>
      <PageHeader heading="To'lovlar" subheading="Cheklar tekshiruvi" />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select placeholder="Barcha holatlar" options={statusOptions} value={status} onChange={setStatus} />
        </div>
        <DateRangePicker value={range} onChange={setRange} placeholder="Muddat" />
        {hasFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} /> Tozalash
          </button>
        )}
      </div>

      <div className="space-y-4">
        {payments.isPending && <SkeletonRows rows={5} />}
        {payments.isError && <ErrorCard error={payments.error} onRetry={() => payments.refetch()} />}
        {payments.isSuccess && payments.data.length === 0 && (
          <Card>
            <EmptyState
              heading={hasFilters ? "Filtrga mos to'lov topilmadi" : "To'lovlar yo'q"}
              hint={hasFilters ? "Filtrni o'zgartiring yoki tozalang" : 'Yangi cheklar shu yerda ko\'rinadi'}
              action={
                hasFilters ? (
                  <Button variant="secondary" size="sm" onClick={reset}>
                    Filtrlarni tozalash
                  </Button>
                ) : undefined
              }
            />
          </Card>
        )}
        {payments.isSuccess && payments.data.map((p) => (
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
