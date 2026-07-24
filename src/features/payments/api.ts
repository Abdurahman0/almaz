import { api, getItems } from '@/shared/api/client';
import type {
  ListParams,
  PaymentCardCreate,
  PaymentCardOut,
  PaymentCardUpdate,
  PaymentOut,
  PaymentStatus,
} from '@/shared/api/types';

export interface PaymentListParams extends ListParams {
  status?: PaymentStatus;
  order_id?: string;
  reviewed_by?: string;
  date_from?: string;
  date_to?: string;
}

export async function listPayments(params: PaymentListParams = {}): Promise<PaymentOut[]> {
  return getItems<PaymentOut>('/payments', { params: { limit: 100, ...params } });
}

export async function approvePayment(paymentId: string): Promise<PaymentOut> {
  return (await api.post<PaymentOut>(`/payments/${paymentId}/approve`)).data;
}

export async function rejectPayment(paymentId: string, reason: string | null): Promise<PaymentOut> {
  return (await api.post<PaymentOut>(`/payments/${paymentId}/reject`, { reason })).data;
}

// ---------- Payment cards (full CRUD) ----------
export interface CardListParams extends ListParams {
  is_active?: boolean;
}

export async function listCards(params: CardListParams = {}): Promise<PaymentCardOut[]> {
  return getItems<PaymentCardOut>('/payments/cards', { params: { limit: 1000, ...params } });
}

export async function getCard(cardId: string): Promise<PaymentCardOut> {
  return (await api.get<PaymentCardOut>(`/payments/cards/${cardId}`)).data;
}

export async function createCard(body: PaymentCardCreate): Promise<PaymentCardOut> {
  return (await api.post<PaymentCardOut>('/payments/cards', body)).data;
}

export async function updateCard(cardId: string, body: PaymentCardUpdate): Promise<PaymentCardOut> {
  return (await api.patch<PaymentCardOut>(`/payments/cards/${cardId}`, body)).data;
}

export async function deleteCard(cardId: string): Promise<void> {
  await api.delete(`/payments/cards/${cardId}`);
}
