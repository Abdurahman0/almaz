import { api, getItems } from '@/shared/api/client';
import type {
  AiState,
  Channel,
  ConversationOut,
  ConversationStatus,
  ListParams,
  MessageDirection,
  MessageOut,
  SenderType,
} from '@/shared/api/types';

export interface ConversationListParams extends ListParams {
  status?: ConversationStatus;
  channel?: Channel;
  ai_state?: AiState;
  assigned_operator_id?: string;
  unread_only?: boolean;
  q?: string;
}

export async function listConversations(
  params: ConversationListParams = {},
): Promise<ConversationOut[]> {
  return getItems<ConversationOut>('/inbox/conversations', { params: { limit: 200, ...params } });
}

export async function getConversation(id: string): Promise<ConversationOut> {
  return (await api.get<ConversationOut>(`/inbox/conversations/${id}`)).data;
}

export interface MessageListParams extends ListParams {
  direction?: MessageDirection;
  sender_type?: SenderType;
}

export async function listMessages(
  conversationId: string,
  params: MessageListParams = {},
): Promise<MessageOut[]> {
  return getItems<MessageOut>(`/inbox/conversations/${conversationId}/messages`, {
    params: { limit: 200, ...params },
  });
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
