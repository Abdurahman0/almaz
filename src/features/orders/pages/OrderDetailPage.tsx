import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  ErrorCard,
  Modal,
  OrderStatusBadge,
  PaymentStatusBadge,
  RingProgress,
  Skeleton,
  Textarea,
  Money,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { api } from '@/shared/api/client';
import type { PaymentOut } from '@/shared/api/types';
import { CraftStepper } from '../components/CraftStepper';
import { useCancelOrder, useCreateCheckoutLink, useDelivery, useOrder } from '../hooks';
import { orderStatusLabels } from '@/shared/ui/Badge';

const deliveryLabels: Record<string, string> = {
  pending: 'Kutilmoqda',
  awaiting_address: 'Manzil kutilmoqda',
  ready: 'Tayyor',
  dispatched: "Yo'lga chiqdi",
  delivered: 'Yetkazildi',
};

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const delivery = useDelivery(orderId);
  const cancelMutation = useCancelOrder(orderId);
  const checkoutLink = useCreateCheckoutLink(orderId);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const payments = useQuery({
    queryKey: ['payments', 'order', orderId],
    queryFn: async () => (await api.get<PaymentOut[]>('/payments', { params: { limit: 100 } })).data,
    select: (all) => all.filter((p) => p.order_id === orderId),
    enabled: Boolean(orderId),
  });

  if (order.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (order.isError) return <ErrorCard error={order.error} onRetry={() => order.refetch()} />;

  const o = order.data;
  const paid = payments.data?.filter((p) => p.status === 'approved').length ?? 0;
  const totalPayments = payments.data?.length ?? 0;
  const paidPercent = totalPayments === 0 ? 0 : Math.round((paid / totalPayments) * 100);
  const cancellable = !['completed', 'cancelled', 'refunded', 'returned'].includes(o.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            aria-label="Orqaga"
            className="rounded-lg border border-border p-2 text-muted transition-colors hover:text-accent-ink"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl text-text">{o.order_no}</h1>
            <p className="text-sm text-muted">{formatDateTime(o.created_at)}</p>
          </div>
          <OrderStatusBadge status={o.status} />
        </div>
        {cancellable && (
          <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-4 w-4" strokeWidth={1.5} /> Bekor qilish
          </Button>
        )}
      </div>

      <Card>
        <h2 className="mb-5 text-md font-semibold text-text">Tayyorlanish bosqichi</h2>
        <CraftStepper status={o.status} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">Mahsulotlar</h2>
          <div className="space-y-3">
            {o.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <p className="font-mono text-xs font-medium text-text">Variant {item.variant_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted">
                    {item.quantity} dona{item.ring_size ? ` · o'lcham ${item.ring_size}` : ''}
                  </p>
                </div>
                <p className="font-semibold text-accent-ink"><Money value={item.unit_price} /></p>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <dt>Mahsulotlar</dt>
              <dd><Money value={o.items_total} /></dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Yetkazish</dt>
              <dd><Money value={o.delivery_fee} /></dd>
            </div>
            <div className="flex justify-between text-sm font-bold text-text">
              <dt>Jami</dt>
              <dd className="text-accent-ink"><Money value={o.grand_total} /></dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card className="flex flex-col items-center gap-3">
            <h2 className="text-md font-semibold text-text">To'lov holati</h2>
            <RingProgress percent={paidPercent} label="tasdiqlangan" size={120} />
            <div className="w-full space-y-2">
              {payments.data?.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="tnum text-muted">{formatDateTime(p.created_at)}</span>
                  <PaymentStatusBadge status={p.status} />
                </div>
              ))}
              {payments.isSuccess && payments.data.length === 0 && (
                <p className="text-center text-xs text-muted">To'lovlar hali yo'q</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-md font-semibold text-text">Yetkazib berish</h2>
            {delivery.isSuccess ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Holat</dt>
                  <dd className="text-text">{deliveryLabels[delivery.data.status]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Hudud</dt>
                  <dd className="text-text">
                    {delivery.data.zone === 'tashkent' ? 'Toshkent' : delivery.data.zone === 'region' ? 'Viloyat' : '—'}
                  </dd>
                </div>
                {delivery.data.address_text && (
                  <div>
                    <dt className="text-muted">Manzil</dt>
                    <dd className="mt-1 text-text">{delivery.data.address_text}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted">Yetkazib berish maʼlumoti yo'q</p>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              loading={checkoutLink.isPending}
              onClick={() => checkoutLink.mutate()}
            >
              <Link2 className="h-4 w-4" strokeWidth={1.5} /> Checkout havola
            </Button>
            {checkoutLink.isSuccess && (
              <a
                href={checkoutLink.data.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-xs text-accent-ink underline"
              >
                {checkoutLink.data.url}
              </a>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-md font-semibold text-text">Tarix</h2>
        <ol className="space-y-3">
          {o.history.map((h, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
              <span className="text-text">
                {h.from_status ? `${orderStatusLabels[h.from_status as keyof typeof orderStatusLabels] ?? h.from_status} → ` : ''}
                {orderStatusLabels[h.to_status as keyof typeof orderStatusLabels] ?? h.to_status}
              </span>
              <span className="ml-auto text-xs text-muted">{formatDateTime(h.created_at)}</span>
            </li>
          ))}
          {o.history.length === 0 && <p className="text-sm text-muted">Tarix bo'sh</p>}
        </ol>
      </Card>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} heading="Buyurtmani bekor qilish">
        <div className="space-y-4">
          <Textarea
            label="Bekor qilish sababi"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Sabab (ixtiyoriy)"
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Ortga
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate(reason || null, { onSuccess: () => setCancelOpen(false) })
              }
            >
              Bekor qilish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
