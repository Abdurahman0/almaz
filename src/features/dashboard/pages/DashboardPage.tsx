import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Bot, Coins, Gem, Receipt } from 'lucide-react';
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
import { useIntroSettled } from '@/shared/stores/intro';
import { useDashboardAnalytics, useDashboardWeek, useLatestOrders } from '../hooks';
import { NecklaceChart } from '../components/NecklaceChart';
import { useClients } from '@/features/clients/hooks';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli oqshom';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const analytics = useDashboardAnalytics();
  const week = useDashboardWeek();
  const latest = useLatestOrders(8);
  const clients = useClients();
  // Heavy render (Recharts + tables) waits for the intro so it doesn't drop
  // frames under the overlay; data fetching is not gated.
  const heavyReady = useIntroSettled();

  const vip = [...(clients.data ?? [])].sort((a, b) => b.total - a.total).slice(0, 4);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl text-text">
          {greeting()}, {user?.full_name ?? 'mehmon'}
        </h1>
        <p className="mt-1 text-sm text-muted">Do'kon manzarasi</p>
      </div>

      {/* Headline totals — server-computed (/analytics/dashboard), all-time. */}
      {analytics.isPending && <SkeletonCards count={4} />}
      {analytics.isError && <ErrorCard error={analytics.error} onRetry={() => analytics.refetch()} />}
      {analytics.isSuccess && (
        <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          <StatCard label="Umumiy savdo" value={analytics.data.revenue} formatter={formatShortAmount} suffix="so'm" icon={Coins} to="/reports" />
          <StatCard label="Jami buyurtmalar" value={analytics.data.orders_total} icon={Gem} to="/orders" />
          <StatCard label="AI buyurtmalar" value={analytics.data.ai_created_orders} icon={Bot} to="/orders" />
          <StatCard label="To'lov tasdig'i" value={Math.round(analytics.data.payments.approval_rate * 100)} suffix="%" icon={Receipt} to="/payments" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-md font-semibold text-text">Haftalik savdo</h2>
              <p className="text-xs text-muted">So'nggi 7 kun</p>
            </div>
            {week.isSuccess && (
              <div className="text-right">
                <p className="text-2xs text-muted">Bugun</p>
                <p className="flex items-center justify-end gap-1.5 tnum text-sm font-semibold text-accent-ink">
                  <Money short value={week.data.todayRevenue} />
                  {week.data.trend != null && (
                    <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs ${week.data.trend >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                      {week.data.trend >= 0 ? <ArrowUpRight className="h-3 w-3" strokeWidth={2} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={2} />}
                      {Math.abs(week.data.trend)}%
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          {(week.isPending || !heavyReady) && <Skeleton className="h-64 w-full" />}
          {week.isError && heavyReady && <ErrorCard error={week.error} onRetry={() => week.refetch()} />}
          {week.isSuccess && heavyReady && <NecklaceChart data={week.data.week} />}
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
              className="mb-3 flex items-center justify-between rounded-[var(--r-sm)] border border-border p-3 transition-colors last:mb-0 hover:border-strong"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{c.name}</p>
                <p className="text-xs text-accent-ink"><Money short value={c.total} /></p>
              </div>
              <HallmarkBadge tier={tierForTotal(c.total)} size="sm" />
            </Link>
          ))}
          {clients.isSuccess && vip.length === 0 && <p className="text-sm text-muted">Mijozlar hali yo'q</p>}
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-md font-semibold text-text">So'nggi buyurtmalar</h2>
          <Link to="/orders" className="text-sm font-semibold text-accent-ink">Barchasi →</Link>
        </div>
        {(latest.isPending || !heavyReady) && <Skeleton className="mx-6 my-4 h-40" />}
        {latest.isError && heavyReady && <div className="p-4"><ErrorCard error={latest.error} onRetry={() => latest.refetch()} /></div>}
        {latest.isSuccess && heavyReady && latest.data.length === 0 && (
          <EmptyState heading="Buyurtmalar hali yo'q" hint="Birinchi buyurtma shu yerda ko'rinadi" />
        )}
        {latest.isSuccess && heavyReady && latest.data.length > 0 && (
          <table className="data-table mt-3 min-w-[560px]">
            <tbody>
              {latest.data.map((o) => (
                <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td>
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-mono text-xs font-semibold text-text hover:text-accent-ink"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {o.order_no}
                    </Link>
                  </td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td className="tnum text-right text-muted">{formatNumber(o.items.length)} ta</td>
                  <td className="text-right font-semibold text-accent-ink"><Money value={o.grand_total} /></td>
                  <td className="tnum text-right text-muted">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
