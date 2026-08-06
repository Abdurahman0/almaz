import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Copy, Pencil, Printer, XCircle } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  ErrorCard,
  Modal,
  OrderStatusBadge,
  Skeleton,
  Textarea,
  toast,
  orderStatusLabels,
  type MenuItem,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { FEATURES } from '@/shared/config/flags';
import type { OrderStatus } from '@/shared/api/types';
import {
  useCancelOrder,
  useDelivery,
  useDuplicateOrder,
  useOrder,
  useSetOrderStatus,
} from '../hooks';
import { useStaff } from '@/features/settings/rbac';
import { useClients } from '@/features/clients/hooks';
import { StageStepper } from '../components/StageStepper';
import { useOrderDetailData } from '../components/detail/useDetailData';
import { ItemsCard } from '../components/detail/ItemsCard';
import { PaymentsCard } from '../components/detail/PaymentsCard';
import { TimelineCard } from '../components/detail/TimelineCard';
import { ClientCard } from '../components/detail/ClientCard';
import { DeliveryCard } from '../components/detail/DeliveryCard';
import { OperatorCard, NotesCard } from '../components/detail/MetaCards';

/** /status accepts every stage except the cancelled family (those go via /cancel). */
const STATUS_CHOICES: OrderStatus[] = [
  'pending', 'waiting_payment', 'payment_review', 'confirmed',
  'preparing', 'packed', 'shipping', 'delivered', 'completed',
];

export default function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const delivery = useDelivery(orderId);
  const clients = useClients();
  const staff = useStaff();
  const detail = useOrderDetailData(order.data);
  const cancelMutation = useCancelOrder(orderId);
  const duplicateMutation = useDuplicateOrder();
  const setStatus = useSetOrderStatus();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (order.isPending) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  if (order.isError) return <ErrorCard error={order.error} onRetry={() => order.refetch()} />;

  const o = order.data;
  const client = clients.data?.find((c) => c.id === o.customer_id);
  const cancellable = !['completed', 'cancelled', 'refunded', 'returned'].includes(o.status);
  const zoneLabel = delivery.isSuccess
    ? delivery.data.zone === 'tashkent'
      ? 'Toshkent'
      : delivery.data.zone === 'region'
        ? delivery.data.provider === 'bts' ? 'BTS' : 'Viloyat'
        : null
    : null;

  const changeStatus = (s: OrderStatus) =>
    setStatus.mutate(
      { id: o.id, status: s },
      { onSuccess: () => toast.success(`Holat: ${orderStatusLabels[s]}`) },
    );

  const statusItems: MenuItem[] = STATUS_CHOICES.filter((s) => s !== o.status).map((s) => ({
    label: orderStatusLabels[s],
    onSelect: () => changeStatus(s),
  }));
  const moreItems: MenuItem[] = [
    {
      label: 'Nusxalash',
      icon: <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />,
      onSelect: () =>
        duplicateMutation.mutate(o, {
          onSuccess: (dup) => { toast.success('Buyurtma nusxalandi'); navigate(`/orders/${dup.id}`); },
          onError: () => toast.error('Nusxalashda xatolik'),
        }),
    },
    {
      label: 'Chop etish',
      icon: <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />,
      onSelect: () => window.print(),
    },
    ...(cancellable
      ? [{
          label: 'Bekor qilish',
          icon: <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />,
          destructive: true,
          separatorBefore: true,
          onSelect: () => setCancelOpen(true),
        }]
      : []),
  ];

  const actions = (
    <>
      {FEATURES.orderEditing && (
        <Button variant="secondary" size="sm" onClick={() => navigate(`/orders/${orderId}/edit`)}>
          <Pencil className="h-4 w-4" strokeWidth={1.5} /> Tahrirlash
        </Button>
      )}
      <DropdownMenu
        items={statusItems}
        ariaLabel="Holatni o'zgartirish"
        trigger={
          <Button variant="secondary" size="sm" loading={setStatus.isPending}>
            <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} /> Holatni o'zgartirish
          </Button>
        }
      />
      <DropdownMenu items={moreItems} />
    </>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Sticky header: number + status + stepper + actions stay reachable */}
      <div className="print-header sticky top-[57px] z-20 -mx-2 mb-6 rounded-b-[var(--r-md)] border-b border-border bg-glass px-2 pb-3 pt-1 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              aria-label="Orqaga"
              className="print-hide shrink-0 rounded-[var(--r-sm)] border border-border p-2 text-muted transition-colors hover:text-accent-ink"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-xl text-text">{o.order_no}</h1>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="tnum text-xs text-muted">{formatDateTime(o.created_at)}</p>
            </div>
          </div>
          <div className="print-hide hidden flex-wrap items-center gap-2 md:flex">{actions}</div>
        </div>
        <div className="mt-3 max-w-2xl">
          <StageStepper status={o.status} />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left — the order itself */}
        <div className="min-w-0 space-y-6">
          <ItemsCard
            order={o}
            variantMap={detail.variantMap}
            boxMap={detail.boxMap}
            productsPending={detail.productsPending}
            zoneLabel={zoneLabel}
          />
          <PaymentsCard orderId={o.id} />
          <TimelineCard order={o} staff={staff.data} />
        </div>

        {/* Right — context */}
        <div className="min-w-0 space-y-6">
          <ClientCard
            customerId={o.customer_id}
            client={client}
            clientsPending={clients.isPending}
            currentOrderId={o.id}
          />
          <DeliveryCard delivery={delivery} />
          <OperatorCard order={o} staff={staff.data} staffPending={staff.isPending} />
          <NotesCard order={o} />
        </div>
      </div>

      {/* Mobile: actions collapse into a sticky bottom bar */}
      <div className="print-hide fixed inset-x-0 bottom-16 z-30 flex justify-center gap-2 border-t border-border bg-glass px-4 py-2.5 backdrop-blur md:hidden">
        {actions}
      </div>

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
