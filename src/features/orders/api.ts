import { api, getItems, getList, type Paginated } from '@/shared/api/client';
import type {
  CheckoutLinkOut,
  DeliveryOut,
  DeliveryStatus,
  ListParams,
  OrderCancel,
  OrderCreate,
  OrderOut,
  OrderStatus,
  OrderUpdate,
} from '@/shared/api/types';

export interface OrdersListParams extends ListParams {
  status?: OrderStatus;
  customer_id?: string;
  assigned_operator_id?: string;
  created_by_ai?: boolean;
  order_no?: string;
  date_from?: string;
  date_to?: string;
}

/** Flat orders array (dashboard / reports). */
export async function listOrders(params: OrdersListParams = {}): Promise<OrderOut[]> {
  return getItems<OrderOut>('/orders', { params: { limit: 200, ...params } });
}

/** Paginated orders for the orders page. */
export async function listOrdersPage(params: OrdersListParams = {}): Promise<Paginated<OrderOut>> {
  return getList<OrderOut>('/orders', { params: { limit: 50, ...params } });
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

/** Re-create an order from an existing one's line items (a real POST /orders). */
export async function duplicateOrder(order: OrderOut): Promise<OrderOut> {
  return createOrder({
    customer_id: order.customer_id,
    items: order.items.map((it) => ({
      variant_id: it.variant_id,
      quantity: it.quantity,
      ring_size: it.ring_size,
      engraving_text: it.engraving_text,
      box_id: it.box_id,
    })),
  });
}

/*
 * Endpoints below DO NOT EXIST on the API yet (see docs/API-GAPS.md). They are
 * wired to the expected shapes and gated by feature flags (FEATURES.orderEditing
 * / FEATURES.ordersKanbanDnd) so the UI can be switched on the moment the backend
 * ships them — without further frontend work. Do not call them while the flag is
 * off (they will 405 today).
 */
export async function updateOrder(orderId: string, body: OrderUpdate): Promise<OrderOut> {
  return (await api.patch<OrderOut>(`/orders/${orderId}`, body)).data;
}

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<OrderOut> {
  return (await api.post<OrderOut>(`/orders/${orderId}/status`, { status })).data;
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
