import { useMemo, useState } from 'react';
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
import { Coins, ShoppingBag } from 'lucide-react';
import {
  Card,
  ErrorCard,
  HallmarkBadge,
  PageHeader,
  SkeletonCards,
  SkeletonRows,
  Money,
  DateRangePicker,
  type Range,
  tierForTotal,
} from '@/shared/ui';
import { formatNumber } from '@/shared/lib/format';
import { useOrders } from '@/features/orders/hooks';
import { useProducts } from '@/features/products/hooks';
import { useClients } from '@/features/clients/hooks';
import { useTopProducts } from '../hooks';
import { pickName } from '@/shared/lib/localize';
import { useUiStore } from '@/shared/stores/ui';
import type { TopProductOut } from '@/shared/api/types';

export default function ReportsPage() {
  const [range, setRange] = useState<Range>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const lang = useUiStore((s) => s.lang);
  const orders = useOrders(undefined, 200);
  const products = useProducts();
  const clients = useClients();

  const dateFrom = format(range.from, 'yyyy-MM-dd');
  const dateTo = format(range.to, 'yyyy-MM-dd');
  const topProducts = useTopProducts({ date_from: dateFrom, date_to: dateTo, limit: 5 });

  // revenue/count summary still derived from the orders list, in the picked period
  const summary = useMemo(() => {
    if (!orders.data) return null;
    const inPeriod = orders.data.filter(
      (o) =>
        isWithinInterval(parseISO(o.created_at), { start: range.from, end: range.to }) &&
        !['cancelled', 'refunded', 'returned'].includes(o.status),
    );
    return {
      revenue: inPeriod.reduce((s, o) => s + Number(o.grand_total), 0),
      count: inPeriod.length,
    };
  }, [orders.data, range]);

  // resolve a top-product name: prefer the row's own name, else look it up
  const topName = (row: TopProductOut): string => {
    if (row.name_uz || row.name_ru) {
      return pickName({ name_uz: row.name_uz ?? '', name_ru: row.name_ru ?? null }, lang);
    }
    const p = products.data?.find((x) => x.id === row.product_id);
    return p ? pickName(p, lang) : `Mahsulot ${row.product_id.slice(0, 8)}`;
  };

  const topClients = [...(clients.data ?? [])]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        heading="Hisobotlar"
        subheading="Davr kesimida do'kon ko'rsatkichlari"
      />

      <div className="mb-6">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {orders.isPending && <SkeletonCards count={2} />}
      {orders.isError && <ErrorCard error={orders.error} onRetry={() => orders.refetch()} />}

      {summary && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-muted">Tushum</p>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                  <Coins className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-3 text-stat tnum text-accent-ink">
                <Money short value={summary.revenue} />
              </p>
            </Card>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-muted">Buyurtmalar</p>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-3 tnum text-stat text-text">{formatNumber(summary.count)}</p>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-md font-semibold text-text">Eng ko'p so'ralgan / sotilgan</h2>
                <span className="text-xs font-medium text-muted">so'ralgan · sotilgan</span>
              </div>
              {topProducts.isPending && <SkeletonRows rows={5} />}
              {topProducts.isError && (
                <ErrorCard error={topProducts.error} onRetry={() => topProducts.refetch()} />
              )}
              {topProducts.isSuccess && topProducts.data.length === 0 && (
                <p className="text-sm text-muted">Bu davrda savdo bo'lmagan</p>
              )}
              <ol className="space-y-3">
                {topProducts.data?.map((p, i) => (
                  <li key={p.product_id} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-semibold text-accent-ink">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-text">{topName(p)}</span>
                    <span className="shrink-0 text-xs text-muted tnum">
                      {formatNumber(p.ordered_qty)} · <span className="text-text">{formatNumber(p.sold_qty)}</span>
                    </span>
                    <span className="w-20 shrink-0 text-right font-semibold text-accent-ink">
                      <Money short value={p.revenue} />
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <h2 className="mb-4 text-md font-semibold text-text">
                Eng faol mijozlar
              </h2>
              <ol className="space-y-3">
                {topClients.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <HallmarkBadge tier={tierForTotal(c.total)} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-text">{c.name}</span>
                    <span className="font-semibold text-accent-ink">
                      <Money short value={c.total} />
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
