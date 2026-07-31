import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as inboxApi from './api';
import type { ConversationListParams } from './api';
import type { AiControlRequest, ConversationOut, CustomerOut, CustomerUpdate, MessageOut } from '@/shared/api/types';

export const inboxKeys = {
  all: ['inbox'] as const,
  conversations: ['inbox', 'conversations'] as const,
  conversationsFiltered: (params: ConversationListParams) =>
    ['inbox', 'conversations', params] as const,
  messages: (id: string) => ['inbox', 'messages', id] as const,
};

export function useConversations(params: ConversationListParams = {}) {
  return useQuery({
    queryKey: inboxKeys.conversationsFiltered(params),
    queryFn: () => inboxApi.listConversations(params),
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: inboxKeys.messages(conversationId),
    queryFn: () => inboxApi.listMessages(conversationId),
    enabled: Boolean(conversationId),
    refetchInterval: 10_000,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => inboxApi.sendMessage(conversationId, text),
    // Optimistic append: the message shows instantly, rolls back on failure.
    onMutate: async (text) => {
      const key = inboxKeys.messages(conversationId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MessageOut[]>(key);
      const optimistic: MessageOut = {
        id: `optimistic-${text.length}-${previous?.length ?? 0}`,
        conversation_id: conversationId,
        direction: 'outgoing',
        sender_type: 'operator',
        sender_user_id: null,
        content: text,
        attachments: null,
        delivery_status: 'pending',
        is_read: true,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<MessageOut[]>(key, (old) => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (_e, _text, ctx) => {
      if (ctx?.previous) qc.setQueryData(inboxKeys.messages(conversationId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: inboxKeys.conversations });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => inboxApi.markRead(conversationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.conversations }),
  });
}

/**
 * Edit a customer (name/phone). The customer is embedded in every conversation
 * row, so we optimistically patch it across ALL cached conversation queries
 * (base + filtered), roll back on error, and invalidate so the list reflects the
 * server truth everywhere.
 */
export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, body }: { customerId: string; body: CustomerUpdate }) =>
      inboxApi.updateCustomer(customerId, body),
    onMutate: async ({ customerId, body }) => {
      await qc.cancelQueries({ queryKey: inboxKeys.conversations });
      const snapshots = qc.getQueriesData<ConversationOut[]>({ queryKey: inboxKeys.conversations });
      qc.setQueriesData<ConversationOut[]>({ queryKey: inboxKeys.conversations }, (old) =>
        old?.map((c) =>
          c.customer && c.customer.id === customerId ? { ...c, customer: { ...c.customer, ...body } } : c,
        ),
      );
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: inboxKeys.conversations }),
  });
}

/** Delete a conversation + its messages (customer kept). Drops the messages cache
 *  and refreshes the list. */
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => inboxApi.deleteConversation(conversationId),
    onSuccess: (_d, conversationId) => {
      qc.removeQueries({ queryKey: inboxKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: inboxKeys.conversations });
    },
  });
}

/** Delete a customer entirely. Throws on 400 (customer has orders) — the caller
 *  maps it to a helpful message. */
export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => inboxApi.deleteCustomer(customerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.conversations }),
  });
}

export function useAssign(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (operatorId: string) => inboxApi.assignConversation(conversationId, operatorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
  });
}

/** Turn the conversation's AI off/on or pause it (minutes / until an instant). */
export function useAiControl(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AiControlRequest) => inboxApi.setAiControl(conversationId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.conversations }),
  });
}

/** Force the AI to answer now (operator override). Refreshes messages + state. */
export function useForceAiRespond(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => inboxApi.forceAiRespond(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inboxKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: inboxKeys.conversations });
    },
  });
}

/** Unique customers derived from conversations (the API has no /customers list). */
export function useCustomers() {
  return useQuery({
    queryKey: inboxKeys.conversations,
    queryFn: () => inboxApi.listConversations(),
    select: (conversations): CustomerOut[] => {
      const customers = new Map<string, CustomerOut>();
      for (const conv of conversations) {
        if (conv.customer) customers.set(conv.customer.id, conv.customer);
      }
      return Array.from(customers.values());
    },
  });
}
