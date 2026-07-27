import { api, getItems, getList, type Paginated } from '@/shared/api/client';
import type {
  IntegrationConfigCreate,
  IntegrationConfigOut,
  IntegrationConfigUpdate,
  IntegrationEventOut,
  ListParams,
  TelegramWebhookInfo,
} from '@/shared/api/types';

export interface ConfigListParams extends ListParams {
  provider?: string;
}

export async function listConfigs(params: ConfigListParams = {}): Promise<IntegrationConfigOut[]> {
  return getItems<IntegrationConfigOut>('/integrations/configs', { params: { limit: 200, ...params } });
}

/** `(provider,key)` upsert. */
export async function upsertConfig(body: IntegrationConfigCreate): Promise<IntegrationConfigOut> {
  return (await api.post<IntegrationConfigOut>('/integrations/configs', body)).data;
}

export async function patchConfig(
  id: string,
  body: IntegrationConfigUpdate,
): Promise<IntegrationConfigOut> {
  return (await api.patch<IntegrationConfigOut>(`/integrations/configs/${id}`, body)).data;
}

export async function deleteConfig(id: string): Promise<void> {
  await api.delete(`/integrations/configs/${id}`);
}

export interface EventListParams extends ListParams {
  provider?: string;
  status?: string;
}

export async function listEvents(params: EventListParams = {}): Promise<Paginated<IntegrationEventOut>> {
  return getList<IntegrationEventOut>('/integrations/events', { params: { limit: 20, ...params } });
}

// ---------- Telegram ----------
export async function tgSetWebhook(url: string): Promise<unknown> {
  return (await api.post('/integrations/telegram/set-webhook', { url })).data;
}
export async function tgWebhookInfo(): Promise<TelegramWebhookInfo> {
  return (await api.get<TelegramWebhookInfo>('/integrations/telegram/webhook-info')).data;
}
export async function tgMe(): Promise<Record<string, unknown>> {
  return (await api.get<Record<string, unknown>>('/integrations/telegram/me')).data;
}
export async function tgDeleteWebhook(): Promise<unknown> {
  return (await api.post('/integrations/telegram/delete-webhook')).data;
}

// ---------- Instagram ----------
export async function igSubscribe(): Promise<unknown> {
  return (await api.post('/integrations/instagram/subscribe')).data;
}
