import { Link } from 'react-router-dom';
import { Coins, Gem, Receipt, Users } from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorCard,
  HallmarkBadge,
  OrderStatusBadge,
  Skeleton,
  SkeletonCards,
  StatCard,
  Money,
  tierForTotal,
} from '@/shared/ui';
import { formatDateTime, formatNumber, formatShortAmount } from '@/shared/lib/format';
import { useAuthStore } from '@/shared/stores/auth';
import { useDashboardStats } from '../hooks';
import { NecklaceChart } from '../components/NecklaceChart';
import { useClients } from '@/features/clients/hooks';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli oqshom';
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const stats = useDashboardStats();
  const clients = useClients();

  const vip = [...(clients.data ?? [])]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 4);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl text-text">
          {greeting()}, {user?.full_name ?? 'mehmon'}
        </h1>
        <p className="mt-1 text-sm text-muted">Bugungi do'kon manzarasi</p>
      </div>

      {stats.isPending && <SkeletonCards count={4} />}
      {stats.isError && <ErrorCard error={stats.error} onRetry={() => stats.refetch()} />}
      {stats.isSuccess && (
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          <StatCard
            label="Bugungi savdo"
            value={stats.data.todayRevenue}
            formatter={formatShortAmount}
            suffix="so'm"
            icon={Coins}
            trend={12}
          />
          <StatCard label="Yangi buyurtmalar" value={stats.data.todayOrders} icon={Users} trend={5} />
          <StatCard label="Sotilgan uzuklar" value={stats.data.ringsSold} icon={Gem} trend={8} />
          <StatCard
            label="O'rtacha chek"
            value={stats.data.avgCheck}
            formatter={formatShortAmount}
            suffix="so'm"
            icon={Receipt}
            trend={-3}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-md font-semibold text-text">Haftalik savdo marjoni</h2>
          <p className="mb-4 text-xs text-muted">Har bir marvarid — bir kun; brilliant — rekord kun</p>
          {stats.isPending && <Skeleton className="h-64 w-full" />}
          {stats.isSuccess && <NecklaceChart data={stats.data.week} />}
        </Card>

        <Card>
          <h2 className="mb-4 text-md font-semibold text-text">VIP mijozlar</h2>
          {clients.isPending && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {vip.map((c) => (
            <Link
              key={c.id}
              to="/clients"
              className="mb-3 flex items-center justify-between rounded-lg border border-border p-3 transition-colors last:mb-0 hover:border-strong"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{c.fullName}</p>
                <p className="text-xs text-accent-ink"><Money short value={c.totalPurchases} /></p>
              </div>
              <HallmarkBadge tier={tierForTotal(c.totalPurchases)} size="sm" />
            </Link>
          ))}
          {clients.isSuccess && vip.length === 0 && (
            <p className="text-sm text-muted">Mijozlar hali yo'q</p>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-md font-semibold text-text">So'nggi buyurtmalar</h2>
          <Link to="/orders" className="text-sm font-semibold text-accent-ink hover:text-accent-ink">
            Barchasi →
          </Link>
        </div>
        {stats.isSuccess && stats.data.latest.length === 0 && (
          <EmptyState heading="Buyurtmalar hali yo'q" hint="Birinchi buyurtma shu yerda ko'rinadi" />
        )}
        {stats.isSuccess && stats.data.latest.length > 0 && (
          <table className="mt-4 w-full min-w-[560px] text-sm">
            <tbody>
              {stats.data.latest.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-border transition-colors duration-150 hover:bg-accent-soft"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-mono text-xs font-medium text-text hover:text-accent-ink"
                    >
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-muted">{formatNumber(o.items.length)} ta</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-accent-ink">
                    <Money value={o.grand_total} />
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-muted">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
