import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { listConversations } from '@/features/inbox/api';
import { listOrders } from '@/features/orders/api';
import type { Channel, OrderOut } from '@/shared/api/types';

/*
 * The backend has no /customers CRUD resource. Clients are assembled from
 * real data only: customer profiles carried on inbox conversations, joined
 * with the orders list for purchase totals and history.
 */

export interface ClientRow {
  id: string;
  name: string;
  username: string | null;
  channel: Channel | null;
  language: string | null;
  externalId: string | null;
  /** Sum of grand_total over orders, excluding cancelled/refunded/returned. */
  total: number;
  ordersCount: number;
  lastOrderAt: string | null;
  orders: OrderOut[];
}

const EXCLUDED_FROM_TOTAL: ReadonlySet<string> = new Set(['cancelled', 'refunded', 'returned']);

export const clientKeys = {
  conversations: ['clients', 'conversations'] as const,
  orders: ['clients', 'orders'] as const,
};

export function useClients() {
  const [convQ, ordersQ] = useQueries({
    queries: [
      { queryKey: clientKeys.conversations, queryFn: () => listConversations({ limit: 200 }) },
      { queryKey: clientKeys.orders, queryFn: () => listOrders({ limit: 200 }) },
    ],
  });

  const data = useMemo<ClientRow[] | undefined>(() => {
    if (!convQ.data || !ordersQ.data) return undefined;
    const map = new Map<string, ClientRow>();
    for (const conv of convQ.data) {
      const c = conv.customer;
      if (!c || map.has(c.id)) continue;
      map.set(c.id, {
        id: c.id,
        name: c.full_name ?? (c.username ? `@${c.username}` : `Mijoz ${c.external_id.slice(0, 6)}`),
        username: c.username,
        channel: c.channel,
        language: c.language,
        externalId: c.external_id,
        total: 0,
        ordersCount: 0,
        lastOrderAt: null,
        orders: [],
      });
    }
    for (const order of ordersQ.data) {
      let row = map.get(order.customer_id);
      if (!row) {
        // order from a customer with no visible conversation — still real data
        row = {
          id: order.customer_id,
          name: `Mijoz ${order.customer_id.slice(0, 8)}`,
          username: null,
          channel: null,
          language: null,
          externalId: null,
          total: 0,
          ordersCount: 0,
          lastOrderAt: null,
          orders: [],
        };
        map.set(order.customer_id, row);
      }
      row.orders.push(order);
      row.ordersCount += 1;
      if (!EXCLUDED_FROM_TOTAL.has(order.status)) row.total += Number(order.grand_total);
      if (!row.lastOrderAt || order.created_at > row.lastOrderAt) row.lastOrderAt = order.created_at;
    }
    for (const row of map.values()) {
      row.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [convQ.data, ordersQ.data]);

  return {
    data,
    isPending: convQ.isPending || ordersQ.isPending,
    isError: convQ.isError || ordersQ.isError,
    isSuccess: convQ.isSuccess && ordersQ.isSuccess,
    error: convQ.error ?? ordersQ.error,
    refetch: () => {
      void convQ.refetch();
      void ordersQ.refetch();
    },
  };
}
