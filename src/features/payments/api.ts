import { api } from '@/shared/api/client';
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
}

export async function listPayments(params: PaymentListParams = {}): Promise<PaymentOut[]> {
  return (await api.get<PaymentOut[]>('/payments', { params: { limit: 100, ...params } })).data;
}

export async function approvePayment(paymentId: string): Promise<PaymentOut> {
  return (await api.post<PaymentOut>(`/payments/${paymentId}/approve`)).data;
}

export async function rejectPayment(paymentId: string, reason: string | null): Promise<PaymentOut> {
  return (await api.post<PaymentOut>(`/payments/${paymentId}/reject`, { reason })).data;
}

export async function listCards(): Promise<PaymentCardOut[]> {
  return (await api.get<PaymentCardOut[]>('/payments/cards')).data;
}

export async function createCard(body: PaymentCardCreate): Promise<PaymentCardOut> {
  return (await api.post<PaymentCardOut>('/payments/cards', body)).data;
}

export async function updateCard(cardId: string, body: PaymentCardUpdate): Promise<PaymentCardOut> {
  return (await api.patch<PaymentCardOut>(`/payments/cards/${cardId}`, body)).data;
}
