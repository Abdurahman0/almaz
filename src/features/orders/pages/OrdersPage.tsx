import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorCard,
  OrderStatusBadge,
  PageHeader,
  SkeletonRows,
  orderStatusLabels,
  Money,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import { useOrders } from '../hooks';
import type { OrderStatus } from '@/shared/api/types';

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
  const query = useOrders(status === 'all' ? undefined : status);
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
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              status === opt
                ? 'border-accent bg-accent-soft text-accent-ink'
                : 'border-border text-muted hover:border-strong hover:text-text'
            }`}
          >
            {opt === 'all' ? 'Barchasi' : orderStatusLabels[opt]}
          </button>
        ))}
      </div>

      {query.isPending && <SkeletonRows rows={7} />}
      {query.isError && <ErrorCard error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && query.data.length === 0 && (
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
      {query.isSuccess && query.data.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-2xs uppercase tracking-caps text-muted">
                <th className="px-4 py-2.5 font-semibold">Raqam</th>
                <th className="px-4 py-2.5 font-semibold">Holat</th>
                <th className="px-4 py-2.5 text-right font-semibold">Mahsulotlar</th>
                <th className="px-4 py-2.5 text-right font-semibold">Summa</th>
                <th className="px-4 py-2.5 text-right font-semibold">Sana</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-b border-border transition-colors duration-150 last:border-0 hover:bg-accent-soft"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/orders/${order.id}`}
                      className="font-mono text-xs font-medium text-text hover:text-accent-ink"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {order.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-muted">{order.items.length} ta</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-accent-ink">
                    <Money value={order.grand_total} />
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-muted">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
