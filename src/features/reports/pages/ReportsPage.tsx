import { useMemo, useState } from 'react';
import { endOfMonth, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
import { Download } from 'lucide-react';
import {
  Button,
  Card,
  ErrorCard,
  HallmarkBadge,
  PageHeader,
  SkeletonCards,
  Money,
  Tooltip,
  DateRangePicker,
  type Range,
  tierForTotal,
} from '@/shared/ui';
import { formatNumber } from '@/shared/lib/format';
import { useOrders } from '@/features/orders/hooks';
import { useProducts } from '@/features/products/hooks';
import { useClients } from '@/features/clients/hooks';

export default function ReportsPage() {
  const [range, setRange] = useState<Range>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const orders = useOrders(undefined, 200);
  const products = useProducts();
  const clients = useClients();

  const report = useMemo(() => {
    if (!orders.data) return null;
    const inPeriod = orders.data.filter(
      (o) =>
        isWithinInterval(parseISO(o.created_at), { start: range.from, end: range.to }) &&
        !['cancelled', 'refunded', 'returned'].includes(o.status),
    );
    const revenue = inPeriod.reduce((s, o) => s + Number(o.grand_total), 0);

    const byVariant = new Map<string, { qty: number; revenue: number }>();
    for (const o of inPeriod) {
      for (const item of o.items) {
        const cur = byVariant.get(item.variant_id) ?? { qty: 0, revenue: 0 };
        cur.qty += item.quantity;
        cur.revenue += Number(item.unit_price) * item.quantity;
        byVariant.set(item.variant_id, cur);
      }
    }
    const topProducts = Array.from(byVariant.entries())
      .map(([variantId, agg]) => {
        const product = products.data?.find((p) => p.variants.some((v) => v.id === variantId));
        return { name: product?.name ?? `Variant ${variantId.slice(0, 8)}`, ...agg };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return { revenue, count: inPeriod.length, topProducts };
  }, [orders.data, products.data, range]);

  const topClients = [...(clients.data ?? [])]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        heading="Hisobotlar"
        subheading="Davr kesimida do'kon ko'rsatkichlari"
        actions={
          <Tooltip content="Tez orada">
            <span>
              <Button variant="secondary" disabled>
                <Download className="h-4 w-4" strokeWidth={1.5} /> Eksport
              </Button>
            </span>
          </Tooltip>
        }
      />

      <div className="mb-6">
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {orders.isPending && <SkeletonCards count={2} />}
      {orders.isError && <ErrorCard error={orders.error} onRetry={() => orders.refetch()} />}

      {report && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-caps text-muted">Tushum</p>
              <p className="mt-2 text-stat tnum text-accent-ink">
                <Money short value={report.revenue} />
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-caps text-muted">Buyurtmalar</p>
              <p className="mt-2 tnum text-stat text-text">
                {formatNumber(report.count)}
              </p>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-md font-semibold text-text">
                Eng ko'p sotilganlar
              </h2>
              {report.topProducts.length === 0 && (
                <p className="text-sm text-muted">Bu davrda savdo bo'lmagan</p>
              )}
              <ol className="space-y-3">
                {report.topProducts.map((p, i) => (
                  <li key={p.name + i} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-semibold text-accent-ink">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-text">{p.name}</span>
                    <span className="text-xs text-muted">{p.qty} dona</span>
                    <span className="font-semibold text-accent-ink"><Money short value={p.revenue} /></span>
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
                    <HallmarkBadge tier={tierForTotal(c.totalPurchases)} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-text">{c.fullName}</span>
                    <span className="font-semibold text-accent-ink">
                      <Money short value={c.totalPurchases} />
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
