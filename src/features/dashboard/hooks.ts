import { useQuery } from '@tanstack/react-query';
import { isSameDay, parseISO, startOfDay, subDays } from 'date-fns';
import { api } from '@/shared/api/client';
import type { DashboardAnalytics, OrderOut } from '@/shared/api/types';
import { listOrders } from '@/features/orders/api';

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => (await api.get<DashboardAnalytics>('/analytics/dashboard')).data,
    retry: 1,
  });
}

export interface DayPoint {
  label: string;
  date: Date;
  revenue: number;
  isRecord: boolean;
}

export interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  ringsSold: number;
  avgCheck: number;
  week: DayPoint[];
  latest: OrderOut[];
}

const dayLabels = ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];

/** Client-side aggregation over orders — /analytics/dashboard is untyped in the spec. */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['analytics', 'orders-aggregate'],
    queryFn: async (): Promise<DashboardStats> => {
      const orders = await listOrders({ limit: 200 });
      const active = orders.filter((o) => !['cancelled', 'refunded', 'returned'].includes(o.status));
      const today = new Date();
      const todayOrders = active.filter((o) => isSameDay(parseISO(o.created_at), today));
      const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.grand_total), 0);
      const ringsSold = todayOrders.reduce(
        (s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0),
        0,
      );

      const week: DayPoint[] = Array.from({ length: 7 }, (_, i) => {
        const date = startOfDay(subDays(today, 6 - i));
        const revenue = active
          .filter((o) => isSameDay(parseISO(o.created_at), date))
          .reduce((s, o) => s + Number(o.grand_total), 0);
        return { label: dayLabels[date.getDay()], date, revenue, isRecord: false };
      });
      const max = Math.max(...week.map((d) => d.revenue));
      if (max > 0) {
        const record = week.find((d) => d.revenue === max);
        if (record) record.isRecord = true;
      }

      const latest = [...orders]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6);

      return {
        todayRevenue,
        todayOrders: todayOrders.length,
        ringsSold,
        avgCheck: todayOrders.length ? Math.round(todayRevenue / todayOrders.length) : 0,
        week,
        latest,
      };
    },
  });
}
