import { useEffect, useState } from 'react';
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
import { formatDateTime } from '@/shared/lib/format';
import { useClients } from '@/features/clients/hooks';
import { useOrdersPage } from '../hooks';
import { StageIcon, STAGE_ORDER } from '../components/StageIcon';
import { OrderBoardDnd } from '../components/OrderBoardDnd';
import { craftStageIndex } from '../stages';
import type { OrderStatus } from '@/shared/api/types';

const PAGE_SIZE = 30;

const STATUS_FILTERS: OrderStatus[] = [
  'pending', 'waiting_payment', 'payment_review', 'confirmed',
  'preparing', 'shipping', 'completed', 'cancelled',
];
const statusOptions: SelectOption[] = [
  { value: '', label: 'Barcha holatlar' },
  ...STATUS_FILTERS.map((s) => ({ value: s, label: orderStatusLabels[s] })),
];

function OrderList() {
  const navigate = useNavigate();
  const clients = useClients();
  const clientName = (id: string) => clients.data?.find((c) => c.id === id)?.name ?? null;
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
                <th>Mijoz</th>
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
                  <td className="text-text">{clientName(order.customer_id) ?? <span className="text-muted">—</span>}</td>
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

      {view === 'board' ? <OrderBoardDnd /> : <OrderList />}
    </div>
  );
}
