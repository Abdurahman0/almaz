import { api, getItems, getList, type Paginated } from '@/shared/api/client';
import type {
  CheckoutLinkOut,
  DeliveryOut,
  DeliveryStatus,
  ListParams,
  OrderCancel,
  OrderCreate,
  OrderItemsReplace,
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

/** PATCH /orders/{id} — strict allowlist: only customer_id / notes /
 *  assigned_operator_id apply (see OrderUpdate). Anything else → 422. */
export async function updateOrder(orderId: string, body: OrderUpdate): Promise<OrderOut> {
  return (await api.patch<OrderOut>(`/orders/${orderId}`, body)).data;
}

/** PATCH /orders/{id}/items — full-replacement item array; server recalculates
 *  totals + stock reservations and returns the full OrderOut (see OrderItemsReplace). */
export async function replaceOrderItems(orderId: string, body: OrderItemsReplace): Promise<OrderOut> {
  return (await api.patch<OrderOut>(`/orders/${orderId}/items`, body)).data;
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
