import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorCard,
  OrderStatusBadge,
  PageHeader,
  Pager,
  SkeletonRows,
  orderStatusLabels,
  Money,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useOrdersPage } from '../hooks';
import type { OrderStatus } from '@/shared/api/types';

const PAGE_SIZE = 30;

const filterOptions: Array<OrderStatus | 'all'> = [
  'all',
  'pending',
  'waiting_payment',
  'payment_review',
  'confirmed',
  'preparing',
  'shipping',
  'completed',
  'cancelled',
];

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [status]);
  const query = useOrdersPage({
    status: status === 'all' ? undefined : status,
    limit: PAGE_SIZE,
    offset,
  });
  const orders = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        heading="Buyurtmalar"
        subheading="Har bir uzuk — alohida hikoya"
        actions={
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Yangi buyurtma
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setStatus(opt)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              status === opt
                ? 'bg-accent-btn text-on-accent'
                : 'bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {opt === 'all' ? 'Barchasi' : orderStatusLabels[opt]}
          </button>
        ))}
      </div>

      {query.isPending && <SkeletonRows rows={7} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && orders.length === 0 && (
        <Card>
          <EmptyState
            heading="Buyurtmalar topilmadi"
            hint="Yangi buyurtma yaratib, birinchi uzukni yo'lga chiqaring"
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/orders/new')}>
                Yangi buyurtma
              </Button>
            }
          />
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
                <tr
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
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
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="tnum text-right text-muted">{order.items.length} ta</td>
                  <td className="text-right font-semibold text-accent-ink">
                    <Money value={order.grand_total} />
                  </td>
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
    </div>
  );
}
