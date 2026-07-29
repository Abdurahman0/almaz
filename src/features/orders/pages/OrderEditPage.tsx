import { useEffect, useMemo, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, ConfirmDialog, ErrorCard, PageHeader, Select, Skeleton, Textarea, orderStatusLabels } from '@/shared/ui';
import { FEATURES } from '@/shared/config/flags';
import type { OrderStatus } from '@/shared/api/types';
import { useOrder, useUpdateOrder } from '../hooks';

const STATUS_OPTIONS = (Object.keys(orderStatusLabels) as OrderStatus[]).map((s) => ({ value: s, label: orderStatusLabels[s] }));

/*
 * Order editing. The backend has no `PATCH /orders/{id}` yet (docs/API-GAPS.md),
 * so this page is reachable only when FEATURES.orderEditing is on — it is wired
 * to the expected OrderUpdate shape + optimistic mutation, ready to switch on the
 * moment the endpoint ships. With the flag off it renders an honest notice.
 */
export default function OrderEditPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const update = useUpdateOrder(orderId);

  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (order.data && !seeded) {
      setStatus(order.data.status);
      setSeeded(true);
    }
  }, [order.data, seeded]);

  const dirty = useMemo(() => {
    if (!order.data) return false;
    return status !== order.data.status || notes.trim().length > 0;
  }, [order.data, status, notes]);

  // Unsaved-changes guard on in-app navigation.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !update.isSuccess && currentLocation.pathname !== nextLocation.pathname);

  if (!FEATURES.orderEditing) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Buyurtmani tahrirlash hozircha mavjud emas — backend `PATCH /orders/&#123;id&#125;` endpointini kutmoqda.
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate(`/orders/${orderId}`)}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Orqaga
        </Button>
      </Card>
    );
  }

  if (order.isPending) return <Skeleton className="h-64 w-full" />;
  if (order.isError) return <ErrorCard error={order.error} onRetry={() => order.refetch()} />;

  const submit = () =>
    update.mutate(
      { status: status || undefined, notes: notes.trim() || null },
      { onSuccess: () => navigate(`/orders/${orderId}`) },
    );

  return (
    <div>
      <PageHeader
        heading={`${order.data.order_no} — tahrirlash`}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/orders/${orderId}`)}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Orqaga
          </Button>
        }
      />
      <Card className="max-w-xl space-y-5">
        <Select label="Holat" options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as OrderStatus)} />
        <Textarea label="Izoh" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ichki izoh" />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate(`/orders/${orderId}`)}>Bekor qilish</Button>
          <Button onClick={submit} loading={update.isPending} disabled={!dirty}>Saqlash</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        heading="Saqlanmagan o'zgarishlar"
        description="O'zgarishlar saqlanmadi. Sahifadan chiqasizmi?"
        confirmLabel="Chiqish"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
