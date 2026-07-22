import { api } from '@/shared/api/client';
import type {
  Channel,
  ConversationOut,
  ConversationStatus,
  ListParams,
  MessageOut,
} from '@/shared/api/types';

export interface ConversationListParams extends ListParams {
  status?: ConversationStatus;
  channel?: Channel;
}

export async function listConversations(
  params: ConversationListParams = {},
): Promise<ConversationOut[]> {
  return (await api.get<ConversationOut[]>('/inbox/conversations', { params: { limit: 100, ...params } }))
    .data;
}

export async function getConversation(id: string): Promise<ConversationOut> {
  return (await api.get<ConversationOut>(`/inbox/conversations/${id}`)).data;
}

export async function listMessages(conversationId: string): Promise<MessageOut[]> {
  return (
    await api.get<MessageOut[]>(`/inbox/conversations/${conversationId}/messages`, {
      params: { limit: 100 },
    })
  ).data;
}

export async function sendMessage(conversationId: string, text: string): Promise<MessageOut> {
  return (await api.post<MessageOut>(`/inbox/conversations/${conversationId}/messages`, { text })).data;
}

export async function markRead(conversationId: string): Promise<void> {
  await api.post(`/inbox/conversations/${conversationId}/read`);
}

export async function assignConversation(conversationId: string, operatorId: string): Promise<void> {
  await api.post(`/inbox/conversations/${conversationId}/assign`, { operator_id: operatorId });
}
