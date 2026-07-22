import { api } from '@/shared/api/client';
import type {
  CheckoutLinkOut,
  DeliveryOut,
  DeliveryStatus,
  ListParams,
  OrderCancel,
  OrderCreate,
  OrderOut,
  OrderStatus,
} from '@/shared/api/types';

export interface OrdersListParams extends ListParams {
  status?: OrderStatus;
}

export async function listOrders(params: OrdersListParams = {}): Promise<OrderOut[]> {
  return (await api.get<OrderOut[]>('/orders', { params })).data;
}

export async function getOrder(orderId: string): Promise<OrderOut> {
  return (await api.get<OrderOut>(`/orders/${orderId}`)).data;
}

export async function createOrder(body: OrderCreate): Promise<OrderOut> {
  return (await api.post<OrderOut>('/orders', body)).data;
}

export async function cancelOrder(orderId: string, body: OrderCancel): Promise<OrderOut> {
  return (await api.post<OrderOut>(`/orders/${orderId}/cancel`, body)).data;
}

export async function getDelivery(orderId: string): Promise<DeliveryOut> {
  return (await api.get<DeliveryOut>(`/delivery/orders/${orderId}`)).data;
}

export async function createCheckoutLink(orderId: string): Promise<CheckoutLinkOut> {
  return (await api.post<CheckoutLinkOut>(`/delivery/orders/${orderId}/checkout-link`)).data;
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
): Promise<DeliveryOut> {
  return (await api.patch<DeliveryOut>(`/delivery/${deliveryId}/status`, { status })).data;
}
