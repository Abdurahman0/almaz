import { useQuery } from '@tanstack/react-query';
import { isSameDay, parseISO, startOfDay, subDays } from 'date-fns';
import { api, getList } from '@/shared/api/client';
import type { AnalyticsDashboard, OrderOut } from '@/shared/api/types';

/**
 * Coerce whatever /analytics/dashboard returns into a fully-populated shape.
 * The live API returns the complete object, but a partial or unexpected body
 * (older deploy, error envelope) must never white-screen the dashboard — every
 * field a consumer reads is guaranteed present with a numeric zero fallback.
 */
function normalizeAnalytics(raw: unknown): AnalyticsDashboard {
  const d = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Partial<AnalyticsDashboard>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    conversations_total: num(d.conversations_total),
    orders_total: num(d.orders_total),
    ai_created_orders: num(d.ai_created_orders),
    revenue: num(d.revenue),
    orders_by_status: d.orders_by_status ?? {},
    payments: {
      total: num(d.payments?.total),
      approved: num(d.payments?.approved),
      approval_rate: num(d.payments?.approval_rate),
    },
    kpi: {
      sales_conversion: num(d.kpi?.sales_conversion),
      lead_conversion: num(d.kpi?.lead_conversion),
      ai_handled_share: num(d.kpi?.ai_handled_share),
    },
  };
}

/** Server-computed all-time totals + KPIs (no time-windowing). */
export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => normalizeAnalytics((await api.get('/analytics/dashboard')).data),
    retry: 1,
  });
}

export interface DayPoint {
  label: string;
  date: Date;
  revenue: number;
  isRecord: boolean;
}

export interface WeekStats {
  week: DayPoint[];
  todayRevenue: number;
  /** today-vs-yesterday revenue delta (percent); null when yesterday had none. */
  trend: number | null;
}

const dayLabels = ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];

/**
 * Weekly revenue series. /analytics/dashboard has no time-series, so this pulls
 * ONLY the last 8 days of orders and pages through the ENTIRE window (not a
 * flat 200-row cap) so it stays correct at any order volume.
 */
export function useDashboardWeek() {
  return useQuery({
    queryKey: ['analytics', 'week'],
    queryFn: async (): Promise<WeekStats> => {
      const today = new Date();
      const from = startOfDay(subDays(today, 7)).toISOString();
      const all: OrderOut[] = [];
      let offset = 0;
      const limit = 100;
      for (;;) {
        const page = await getList<OrderOut>('/orders', { params: { date_from: from, limit, offset } });
        all.push(...page.items);
        offset += page.items.length;
        if (page.items.length === 0 || offset >= page.total) break;
      }
      const active = all.filter((o) => !['cancelled', 'refunded', 'returned'].includes(o.status));
      const revenueOn = (d: Date) =>
        active.filter((o) => isSameDay(parseISO(o.created_at), d)).reduce((s, o) => s + Number(o.grand_total), 0);

      const week: DayPoint[] = Array.from({ length: 7 }, (_, i) => {
        const date = startOfDay(subDays(today, 6 - i));
        return { label: dayLabels[date.getDay()], date, revenue: revenueOn(date), isRecord: false };
      });
      const max = Math.max(...week.map((d) => d.revenue));
      if (max > 0) {
        const record = week.find((d) => d.revenue === max);
        if (record) record.isRecord = true;
      }
      const todayRevenue = revenueOn(startOfDay(today));
      const ydayRevenue = revenueOn(startOfDay(subDays(today, 1)));
      const trend = ydayRevenue > 0 ? Math.round(((todayRevenue - ydayRevenue) / ydayRevenue) * 100) : null;
      return { week, todayRevenue, trend };
    },
  });
}

/** The most recent orders (server sorts newest-first). Bounded — never a full scan. */
export function useLatestOrders(limit = 8) {
  return useQuery({
    queryKey: ['orders', 'latest', limit],
    queryFn: () => getList<OrderOut>('/orders', { params: { limit } }).then((r) => r.items),
  });
}
