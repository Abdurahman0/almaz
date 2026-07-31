import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ConfirmDialog, ErrorCard, Money, SkeletonRows, toast } from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import { useClients } from '@/features/clients/hooks';
import { useCancelOrderAny, useOrders, useSetOrderStatus } from '../hooks';
import type { OrderOut, OrderStatus } from '@/shared/api/types';

/*
 * Drag-&-drop order board built on the REAL order statuses (not invented craft
 * stages). Each column groups related statuses; a drop sets the order to that
 * column's primary status. There is no manual stage-transition endpoint yet
 * (docs/API-GAPS.md), so drops move the card locally for the session only.
 */
interface BoardColumn {
  key: string;
  label: string;
  color: string;
  /** Status a drop into this column assigns. */
  primary: OrderStatus;
  /** Real statuses that live in this column. */
  statuses: OrderStatus[];
}

const COLUMNS: BoardColumn[] = [
  { key: 'new', label: 'Yangi', color: '#8b929e', primary: 'pending', statuses: ['draft', 'pending'] },
  { key: 'payment', label: "To'lov kutilmoqda", color: '#c69a4a', primary: 'waiting_payment', statuses: ['waiting_payment', 'payment_review'] },
  { key: 'confirmed', label: 'Tasdiqlangan', color: '#5b86c4', primary: 'confirmed', statuses: ['confirmed'] },
  { key: 'preparing', label: 'Tayyorlanmoqda', color: '#9575cd', primary: 'preparing', statuses: ['preparing', 'packed'] },
  { key: 'shipping', label: "Yo'lda", color: '#4aa3c8', primary: 'shipping', statuses: ['shipping'] },
  { key: 'done', label: 'Yakunlangan', color: '#4caf7d', primary: 'delivered', statuses: ['delivered', 'completed'] },
  { key: 'cancelled', label: 'Bekor / qaytarilgan', color: '#d06868', primary: 'cancelled', statuses: ['cancelled', 'refunded', 'returned'] },
];

const colKeyOf = (status: OrderStatus): string | undefined =>
  COLUMNS.find((c) => c.statuses.includes(status))?.key;

function OrderCardBody({ order, client }: { order: OrderOut; client: string | null }) {
  // A jeweler needs the ring size at a glance.
  const size = order.items.find((it) => it.ring_size)?.ring_size ?? null;
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-text">{order.order_no}</span>
        <span className="tnum text-sm font-semibold text-accent-ink"><Money short value={order.grand_total} /></span>
      </div>
      {client && <p className="mt-1 truncate text-2xs text-text">{client}</p>}
      <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-muted">
        <span className="flex items-center gap-1.5">
          {order.items.length} ta mahsulot
          {size && <span className="tnum rounded bg-surface-2 px-1.5 py-0.5 font-semibold text-accent-ink">⌀ {size}</span>}
        </span>
        <span className="tnum">{formatDate(order.created_at)}</span>
      </div>
    </>
  );
}

function DraggableCard({ order, color, client, onOpen }: { order: OrderOut; color: string; client: string | null; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      style={{ borderLeftColor: color }}
      className={`w-full cursor-grab rounded-[var(--r-sm)] border border-l-[3px] border-border bg-surface p-3 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      <OrderCardBody order={order} client={client} />
    </button>
  );
}

function Column({
  col,
  orders,
  clientOf,
  onOpen,
}: {
  col: BoardColumn;
  orders: OrderOut[];
  clientOf: (id: string) => string | null;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const total = orders.reduce((s, o) => s + Number(o.grand_total), 0);
  return (
    <div className="glass-2 flex h-[calc(100dvh-250px)] max-h-[620px] w-[264px] shrink-0 flex-col rounded-[var(--r-md)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-text">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.color }} />
          <span className="truncate">{col.label}</span>
        </span>
        <span className="tnum shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-semibold text-muted">{orders.length}</span>
      </div>
      <div className="px-3 pb-1.5 text-2xs text-muted tnum"><Money short value={total} /></div>
      <div
        ref={setNodeRef}
        className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 pb-3 transition-colors ${isOver ? 'bg-accent-soft/40' : ''}`}
      >
        {orders.map((o) => (
          <DraggableCard key={o.id} order={o} color={col.color} client={clientOf(o.customer_id)} onOpen={() => onOpen(o.id)} />
        ))}
        {orders.length === 0 && (
          <div className="mt-2 rounded-[var(--r-sm)] border border-dashed border-border py-6 text-center text-2xs text-muted">
            Bo'sh
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderBoardDnd() {
  const navigate = useNavigate();
  const query = useOrders(undefined, 200);
  const clients = useClients();
  const clientOf = (id: string) => clients.data?.find((c) => c.id === id)?.name ?? null;
  const setStatus = useSetOrderStatus();
  const cancelOrder = useCancelOrderAny();
  const [local, setLocal] = useState<OrderOut[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Dropping into "Bekor / qaytarilgan" cancels the order (releases stock) via
  // /cancel — a destructive move, so it's confirmed first.
  const [cancelTarget, setCancelTarget] = useState<{ order: OrderOut; from: OrderStatus } | null>(null);
  // Optimistic status moves are held in a ref so a background refetch can't snap a
  // dragged card back before the server round-trip settles — the override is
  // re-applied on top of every fresh payload, and dropped only on failure.
  const overrides = useRef<Map<string, OrderStatus>>(new Map());

  useEffect(() => {
    const data = query.data ?? [];
    setLocal(data.map((o) => (overrides.current.has(o.id) ? { ...o, status: overrides.current.get(o.id)! } : o)));
  }, [query.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const byCol = useMemo(() => {
    const map = new Map<string, OrderOut[]>();
    COLUMNS.forEach((c) => map.set(c.key, []));
    for (const o of local) {
      const k = colKeyOf(o.status);
      if (k) map.get(k)!.push(o);
    }
    return map;
  }, [local]);

  const activeOrder = activeId ? local.find((o) => o.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const over = e.over;
    if (!over) return;
    const col = COLUMNS.find((c) => c.key === String(over.id));
    const order = local.find((o) => o.id === String(e.active.id));
    if (!col || !order) return;
    if (colKeyOf(order.status) === col.key) return; // dropped in the same column
    const from = order.status;
    // The cancelled column must go through /cancel (/status rejects cancelled with
    // a 400). Confirm first — the card stays put until then.
    if (col.key === 'cancelled') {
      setCancelTarget({ order, from });
      return;
    }
    const to = col.primary;
    // Optimistically move the card, then persist via POST /orders/{id}/status.
    // On failure, roll the card back to its original column.
    overrides.current.set(order.id, to);
    setLocal((cur) => cur.map((o) => (o.id === order.id ? { ...o, status: to } : o)));
    setStatus.mutate(
      { id: order.id, status: to },
      {
        onSuccess: () => toast.success('Bosqich saqlandi'),
        onError: () => {
          overrides.current.delete(order.id);
          setLocal((cur) => cur.map((o) => (o.id === order.id ? { ...o, status: from } : o)));
        },
      },
    );
  };

  const doCancel = () => {
    if (!cancelTarget) return;
    const { order, from } = cancelTarget;
    setCancelTarget(null);
    overrides.current.set(order.id, 'cancelled');
    setLocal((cur) => cur.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
    cancelOrder.mutate(
      { id: order.id, reason: null },
      {
        onSuccess: () => toast.success('Buyurtma bekor qilindi'),
        onError: () => {
          overrides.current.delete(order.id);
          setLocal((cur) => cur.map((o) => (o.id === order.id ? { ...o, status: from } : o)));
          toast.error('Bekor qilishda xatolik');
        },
      },
    );
  };

  if (query.isPending) return <SkeletonRows rows={6} />;
  if (query.isError) return <ErrorCard error={query.error} onRetry={() => query.refetch()} />;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <p className="mb-2 text-2xs text-muted">
        Kartani ustundan ustunga sudrab holatini o'zgartiring — o'zgarishlar saqlanadi.
      </p>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {COLUMNS.map((col) => (
          <Column key={col.key} col={col} orders={byCol.get(col.key) ?? []} clientOf={clientOf} onOpen={(id) => navigate(`/orders/${id}`)} />
        ))}
      </div>
      <DragOverlay>
        {activeOrder ? (
          <div className="w-[248px] rotate-2 rounded-[var(--r-sm)] border border-l-[3px] border-accent/60 bg-surface p-3 shadow-lg">
            <OrderCardBody order={activeOrder} client={clientOf(activeOrder.customer_id)} />
          </div>
        ) : null}
      </DragOverlay>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        heading="Buyurtmani bekor qilish"
        description={`«${cancelTarget?.order.order_no ?? ''}» bekor qilinadi va zaxira qaytariladi.`}
        confirmLabel="Bekor qilish"
        onConfirm={doCancel}
      />
    </DndContext>
  );
}
