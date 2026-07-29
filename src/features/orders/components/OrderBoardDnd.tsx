import { useEffect, useMemo, useState } from 'react';
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
import { ErrorCard, Money, SkeletonRows } from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import { useOrders } from '../hooks';
import { craftStageIndex } from '../stages';
import { StageIcon, STAGE_META, STAGE_ORDER, type StageKey } from './StageIcon';
import type { OrderOut, OrderStatus } from '@/shared/api/types';

/*
 * Flag-gated (FEATURES.ordersKanbanDnd) drag-&-drop board. It is only rendered
 * when the flag is on, i.e. once the backend ships a manual stage-transition
 * endpoint (docs/API-GAPS.md) — until then the read-only board is used. Dropping
 * a card into a stage column optimistically moves it and calls setOrderStatus;
 * on API failure the card animates back and an error toast appears.
 */

// Primary status a column drop maps an order to (the entry status of each stage).
const STAGE_PRIMARY: Record<StageKey, OrderStatus> = {
  sketch: 'pending',
  casting: 'confirmed',
  setting: 'preparing',
  polish: 'shipping',
  delivered: 'delivered',
};

function OrderCardBody({ order }: { order: OrderOut }) {
  const overdue = false; // no due_date on OrderOut yet (docs/API-GAPS.md)
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-text">{order.order_no}</span>
        <span className="tnum text-sm font-semibold text-accent-ink"><Money short value={order.grand_total} /></span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-2xs text-muted">
        <span>{order.items.length} ta mahsulot</span>
        <span className={`tnum ${overdue ? 'text-danger' : ''}`}>{formatDate(order.created_at)}</span>
      </div>
    </>
  );
}

function DraggableCard({ order, onOpen }: { order: OrderOut; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`w-full rounded-[var(--r-sm)] border border-l-[3px] border-border bg-surface p-3 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${isDragging ? 'opacity-40' : ''}`}
    >
      <OrderCardBody order={order} />
    </button>
  );
}

function Column({ stage, orders, onOpen }: { stage: StageKey; orders: OrderOut[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = orders.reduce((s, o) => s + Number(o.grand_total), 0);
  return (
    <div className="flex h-[calc(100dvh-250px)] max-h-[640px] w-[280px] shrink-0 flex-col rounded-[var(--r-md)] border border-border bg-bg/40">
      <div className="flex items-center justify-between gap-2 px-3.5 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-text">
          <StageIcon stage={stage} status="done" size="sm" />
          {STAGE_META[stage].label}
        </span>
        <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-semibold text-muted">{orders.length}</span>
      </div>
      <div className="px-3.5 pb-1 text-2xs text-muted tnum"><Money short value={total} /></div>
      <div
        ref={setNodeRef}
        className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 pb-3 transition-colors ${isOver ? 'bg-accent-soft/40' : ''}`}
      >
        {orders.map((o) => (
          <DraggableCard key={o.id} order={o} onOpen={() => onOpen(o.id)} />
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
  const [local, setLocal] = useState<OrderOut[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => setLocal(query.data ?? []), [query.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = useMemo(() => {
    const map = new Map<StageKey, OrderOut[]>();
    STAGE_ORDER.forEach((k) => map.set(k, []));
    for (const o of local) {
      const idx = craftStageIndex(o.status);
      if (idx >= 0) map.get(STAGE_ORDER[idx])!.push(o);
    }
    return map;
  }, [local]);

  const activeOrder = activeId ? local.find((o) => o.id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const over = e.over;
    if (!over) return;
    const stage = String(over.id) as StageKey;
    const order = local.find((o) => o.id === String(e.active.id));
    if (!order) return;
    const targetIdx = STAGE_META[stage].index;
    if (craftStageIndex(order.status) === targetIdx) return; // same column
    // Move locally only — the API has no manual stage-transition endpoint yet
    // (docs/API-GAPS.md). Persisted the moment one ships; session-local for now.
    const newStatus = STAGE_PRIMARY[stage];
    setLocal((cur) => cur.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
  };

  if (query.isPending) return <SkeletonRows rows={6} />;
  if (query.isError) return <ErrorCard error={query.error} onRetry={() => query.refetch()} />;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <p className="mb-2 text-2xs text-muted">
        Kartani sudrab bosqichni o'zgartiring — o'zgarishlar hozircha faqat shu sessiyada saqlanadi (backend endpointi kutilmoqda).
      </p>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
        {STAGE_ORDER.map((stage) => (
          <Column key={stage} stage={stage} orders={byStage.get(stage) ?? []} onOpen={(id) => navigate(`/orders/${id}`)} />
        ))}
      </div>
      <DragOverlay>
        {activeOrder ? (
          <div className="w-[256px] rotate-2 rounded-[var(--r-sm)] border border-l-[3px] border-accent/60 bg-surface p-3 shadow-lg">
            <OrderCardBody order={activeOrder} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
