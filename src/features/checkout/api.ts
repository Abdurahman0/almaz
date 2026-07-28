import { api } from '@/shared/api/client';
import type { CheckoutContextOut, CheckoutSubmit, DeliveryOut } from '@/shared/api/types';

/*
 * Public checkout endpoints (migration 0019). No auth — the one-time token in
 * the path is the authorization. The shared `api` instance is fine: a
 * not-logged-in customer sends no Authorization header, so it hits the open
 * route; a bad/used/expired token returns 400/404 (never 401), so the refresh
 * interceptor never fires.
 */
export async function getCheckoutContext(token: string): Promise<CheckoutContextOut> {
  return (await api.get<CheckoutContextOut>(`/checkout/${token}`)).data;
}

export async function submitCheckout(token: string, body: CheckoutSubmit): Promise<DeliveryOut> {
  return (await api.post<DeliveryOut>(`/checkout/${token}`, body)).data;
}
