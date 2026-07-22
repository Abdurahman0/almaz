import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ordersApi from './api';
import type { OrderCreate, OrderStatus } from '@/shared/api/types';

export const orderKeys = {
  all: ['orders'] as const,
  list: (status?: OrderStatus) => ['orders', 'list', status ?? 'all'] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  delivery: (id: string) => ['orders', 'delivery', id] as const,
};

export function useOrders(status?: OrderStatus, limit = 100) {
  return useQuery({
    queryKey: orderKeys.list(status),
    queryFn: () => ordersApi.listOrders({ status, limit }),
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
