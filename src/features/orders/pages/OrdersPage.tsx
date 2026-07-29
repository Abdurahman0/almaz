import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Plus } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorCard,
  OrderStatusBadge,
  PageHeader,
  Pager,
  Select,
  SkeletonRows,
  orderStatusLabels,
  Money,
  type SelectOption,
} from '@/shared/ui';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { useOrders, useOrdersPage } from '../hooks';
import { StageIcon, STAGE_ORDER } from '../components/StageIcon';
import { OrderBoardDnd } from '../components/OrderBoardDnd';
import { craftStageIndex } from '../stages';
import { FEATURES } from '@/shared/config/flags';
import type { OrderOut, OrderStatus } from '@/shared/api/types';

const PAGE_SIZE = 30;

const STATUS_FILTERS: OrderStatus[] = [
  'pending', 'waiting_payment', 'payment_review', 'confirmed',
  'preparing', 'shipping', 'completed', 'cancelled',
];
const statusOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  ...STATUS_FILTERS.map((s) => ({ value: s, label: orderStatusLabels[s] })),
];

/** Board columns — each groups a few statuses into one pipeline stage. */
const COLUMNS: Array<{ key: string; label: string; color: string; statuses: OrderStatus[] }> = [
  { key: 'new', label: 'Yangi', color: '#8b929e', statuses: ['draft', 'pending'] },
  { key: 'payment', label: "To'lov", color: '#c69a4a', statuses: ['waiting_payment', 'payment_review'] },
  { key: 'confirmed', label: 'Tasdiqlangan', color: '#5b86c4', statuses: ['confirmed'] },
  { key: 'prep', label: 'Tayyorlanmoqda', color: '#9575cd', statuses: ['preparing', 'packed'] },
  { key: 'shipping', label: "Yo'lda", color: '#4aa3c8', statuses: ['shipping'] },
  { key: 'done', label: 'Yakunlangan', color: '#4caf7d', statuses: ['delivered', 'completed'] },
  { key: 'cancelled', label: 'Bekor / qaytgan', color: '#d06868', statuses: ['cancelled', 'refunded', 'returned'] },
];

function OrderCard({ order, color, onOpen }: { order: OrderOut; color: string; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{ borderLeftColor: color }}
      className="w-full rounded-xl border border-l-[3px] border-border bg-surface p-3 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-text">{order.order_no}</span>
        <span className="tnum text-sm font-semibold text-accent-ink">
          <Money short value={order.grand_total} />
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-2xs text-muted">
        <span>{order.items.length} ta mahsulot</span>
        <span className="tnum">{formatDate(order.created_at)}</span>
      </div>
    </button>
  );
}

function OrderBoard() {
  const navigate = useNavigate();
  const orders = useOrders(undefined, 200);

  const grouped = useMemo(() => {
    const map = new Map<string, OrderOut[]>();
    for (const c of COLUMNS) map.set(c.key, []);
    const colOf = (s: OrderStatus) => COLUMNS.find((c) => c.statuses.includes(s))?.key;
    for (const o of orders.data ?? []) {
      const k = colOf(o.status);
      if (k) map.get(k)!.push(o);
    }
    return map;
  }, [orders.data]);

  if (orders.isPending) return <SkeletonRows rows={6} />;
  if (orders.isError) return <ErrorCard error={orders.error} onRetry={() => orders.refetch()} />;

  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
      {COLUMNS.map((col) => {
        const items = grouped.get(col.key) ?? [];
        return (
          <div
            key={col.key}
            className="flex h-[calc(100dvh-198px)] w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-bg/40"
          >
            <div className="flex items-center justify-between gap-2 px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-text">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.color }} />
                {col.label}
              </span>
              <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-semibold text-muted">
                {items.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
              {items.map((o) => (
                <OrderCard key={o.id} order={o} color={col.color} onOpen={() => navigate(`/orders/${o.id}`)} />
              ))}
              {items.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted">Bo'sh</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>(''); // '' = all
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [status]);
  const query = useOrdersPage({ status: (status as OrderStatus) || undefined, limit: PAGE_SIZE, offset });
  const orders = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <>
      <div className="mb-6 w-56">
        <Select placeholder="Barcha holatlar" options={statusOptions} value={status} onChange={setStatus} />
      </div>

      {query.isPending && <SkeletonRows rows={7} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && orders.length === 0 && (
        <Card>
          <EmptyState heading="Buyurtmalar topilmadi" hint="Filtrni o'zgartiring yoki yangi buyurtma yarating" />
        </Card>
      )}
      {query.isSuccess && orders.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Raqam</th>
                <th>Holat</th>
                <th className="!text-right">Mahsulotlar</th>
                <th className="!text-right">Summa</th>
                <th className="!text-right">Sana</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                  <td>
                    <Link
                      to={`/orders/${order.id}`}
                      className="font-mono text-xs font-semibold text-text hover:text-accent-ink"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.order_no}
                    </Link>
                  </td>
                  <td>
                    <span className="flex items-center gap-2">
                      {craftStageIndex(order.status) >= 0 && (
                        <StageIcon stage={STAGE_ORDER[craftStageIndex(order.status)]} status="active" size="sm" />
                      )}
                      <OrderStatusBadge status={order.status} />
                    </span>
                  </td>
                  <td className="tnum text-right text-muted">{order.items.length} ta</td>
                  <td className="text-right font-semibold text-accent-ink"><Money value={order.grand_total} /></td>
                  <td className="tnum text-right text-muted">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {query.isSuccess && orders.length > 0 && (
        <Pager offset={offset} limit={PAGE_SIZE} total={total} onChange={setOffset} />
      )}
    </>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'board' | 'list'>('board');

  return (
    <div>
      <PageHeader
        heading="Buyurtmalar"
        subheading="Har bir uzuk — alohida hikoya"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-surface-2 p-0.5">
              <button
                onClick={() => setView('board')}
                aria-label="Doska"
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  view === 'board' ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'
                }`}
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={1.75} /> Doska
              </button>
              <button
                onClick={() => setView('list')}
                aria-label="Ro'yxat"
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  view === 'list' ? 'bg-surface text-text shadow-xs' : 'text-muted hover:text-text'
                }`}
              >
                <List className="h-4 w-4" strokeWidth={1.75} /> Ro'yxat
              </button>
            </div>
            <Button onClick={() => navigate('/orders/new')}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Yangi buyurtma
            </Button>
          </div>
        }
      />

      {view === 'board' ? (FEATURES.ordersKanbanDnd ? <OrderBoardDnd /> : <OrderBoard />) : <OrderList />}
    </div>
  );
}
