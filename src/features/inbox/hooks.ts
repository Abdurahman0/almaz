import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as inboxApi from './api';
import type { CustomerOut, MessageOut } from '@/shared/api/types';

export const inboxKeys = {
  all: ['inbox'] as const,
  conversations: ['inbox', 'conversations'] as const,
  messages: (id: string) => ['inbox', 'messages', id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: inboxKeys.conversations,
    queryFn: () => inboxApi.listConversations(),
    refetchInterval: 20_000,
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

export function useAssign(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (operatorId: string) => inboxApi.assignConversation(conversationId, operatorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
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
