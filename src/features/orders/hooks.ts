import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersApi from './api';
import type { OrdersListParams } from './api';
import type { OrderCreate, OrderOut, OrderStatus, OrderUpdate } from '@/shared/api/types';
import { toast } from '@/shared/ui';

export const orderKeys = {
  all: ['orders'] as const,
  list: (status?: OrderStatus) => ['orders', 'list', status ?? 'all'] as const,
  page: (params: OrdersListParams) => ['orders', 'page', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  delivery: (id: string) => ['orders', 'delivery', id] as const,
};

/** Flat orders (reports / dashboard). */
export function useOrders(status?: OrderStatus, limit = 200) {
  return useQuery({
    queryKey: orderKeys.list(status),
    queryFn: () => ordersApi.listOrders({ status, limit }),
  });
}

/** Paginated orders for the orders page. */
export function useOrdersPage(params: OrdersListParams) {
  return useQuery({
    queryKey: orderKeys.page(params),
    queryFn: () => ordersApi.listOrdersPage(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Boolean(orderId),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrderCreate) => ordersApi.createOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useCancelOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string | null) => ordersApi.cancelOrder(orderId, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

/** Duplicate an order (real POST /orders from its line items). */
export function useDuplicateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: OrderOut) => ordersApi.duplicateOrder(order),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

/*
 * Order editing (PATCH /orders/{id}) still returns 405 — flag-gated behind
 * FEATURES.orderEditing until it ships. Stage change (POST /orders/{id}/status)
 * is now LIVE and used by the kanban (useSetOrderStatus below).
 */
export function useUpdateOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: OrderUpdate) => ordersApi.updateOrder(orderId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: orderKeys.detail(orderId) });
      const prev = qc.getQueryData<OrderOut>(orderKeys.detail(orderId));
      if (prev) qc.setQueryData<OrderOut>(orderKeys.detail(orderId), { ...prev, ...body } as OrderOut);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(orderKeys.detail(orderId), ctx.prev);
      toast.error("Buyurtmani yangilashda xatolik");
    },
    onSuccess: () => toast.success('Saqlandi'),
    onSettled: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

/** Stage change via POST /orders/{id}/status (kanban DnD). Live. The board holds
 *  the optimistic move + rollback; this invalidates so the server payload wins. */
export function useSetOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.setOrderStatus(id, status),
    onError: () => toast.error("Bosqichni o'zgartirishda xatolik"),
    onSettled: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function useDelivery(orderId: string) {
  return useQuery({
    queryKey: orderKeys.delivery(orderId),
    queryFn: () => ordersApi.getDelivery(orderId),
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useCreateCheckoutLink(orderId: string) {
  return useMutation({
    mutationFn: () => ordersApi.createCheckoutLink(orderId),
  });
}
