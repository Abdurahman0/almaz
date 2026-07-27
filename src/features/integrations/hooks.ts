import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as integrationsApi from './api';
import type { EventListParams } from './api';
import type { IntegrationConfigCreate, IntegrationConfigUpdate } from '@/shared/api/types';

export const integrationKeys = {
  all: ['integrations'] as const,
  configs: ['integrations', 'configs'] as const,
  events: (params: EventListParams) => ['integrations', 'events', params] as const,
  webhookInfo: ['integrations', 'telegram', 'webhook-info'] as const,
};

export function useIntegrationConfigs() {
  return useQuery({
    queryKey: integrationKeys.configs,
    queryFn: () => integrationsApi.listConfigs(),
  });
}

export function useUpsertConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IntegrationConfigCreate) => integrationsApi.upsertConfig(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.configs }),
  });
}

export function usePatchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: IntegrationConfigUpdate }) =>
      integrationsApi.patchConfig(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.configs }),
  });
}

export function useDeleteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsApi.deleteConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.configs }),
  });
}

export function useIntegrationEvents(params: EventListParams = {}) {
  return useQuery({
    queryKey: integrationKeys.events(params),
    queryFn: () => integrationsApi.listEvents(params),
  });
}

export function useTelegramWebhookInfo(enabled = true) {
  return useQuery({
    queryKey: integrationKeys.webhookInfo,
    queryFn: () => integrationsApi.tgWebhookInfo(),
    enabled,
    retry: false,
  });
}

export function useTgSetWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => integrationsApi.tgSetWebhook(url),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.webhookInfo }),
  });
}

export function useTgDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationsApi.tgDeleteWebhook(),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.webhookInfo }),
  });
}

export function useTgMe() {
  return useMutation({ mutationFn: () => integrationsApi.tgMe() });
}

export function useIgSubscribe() {
  return useMutation({ mutationFn: () => integrationsApi.igSubscribe() });
}
