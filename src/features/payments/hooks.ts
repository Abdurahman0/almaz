import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentsApi from './api';
import type { PaymentCardCreate, PaymentOut, PaymentStatus } from '@/shared/api/types';

export const paymentKeys = {
  all: ['payments'] as const,
  list: (status?: PaymentStatus) => ['payments', 'list', status ?? 'all'] as const,
  cards: ['payments', 'cards'] as const,
};

export function usePayments(status?: PaymentStatus) {
  return useQuery({
    queryKey: paymentKeys.list(status),
    queryFn: () => paymentsApi.listPayments({ status }),
  });
}

/** Optimistically flips the payment's status in every cached list. */
function useReviewMutation(
  action: (id: string, reason: string | null) => Promise<PaymentOut>,
  optimisticStatus: PaymentStatus,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason = null }: { id: string; reason?: string | null }) =>
      action(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: paymentKeys.all });
      const snapshots = qc.getQueriesData<PaymentOut[]>({ queryKey: ['payments', 'list'] });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        qc.setQueryData<PaymentOut[]>(
          key,
          data.map((p) => (p.id === id ? { ...p, status: optimisticStatus } : p)),
        );
      }
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}

export function useApprovePayment() {
  return useReviewMutation((id) => paymentsApi.approvePayment(id), 'approved');
}

export function useRejectPayment() {
  return useReviewMutation((id, reason) => paymentsApi.rejectPayment(id, reason), 'rejected');
}

export function useCards() {
  return useQuery({ queryKey: paymentKeys.cards, queryFn: paymentsApi.listCards });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentCardCreate) => paymentsApi.createCard(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentKeys.cards }),
  });
}
