import { api } from '@/shared/api/client';
import type { SettingOut, SettingValue } from '@/shared/api/types';

export const GOLD_RATE_KEYS = {
  '585': 'gold_rate_585',
  '750': 'gold_rate_750',
} as const;

export async function listSettings(): Promise<SettingOut[]> {
  return (await api.get<SettingOut[]>('/settings')).data;
}

export async function getSetting(key: string): Promise<SettingOut> {
  return (await api.get<SettingOut>(`/settings/${key}`)).data;
}

export async function updateSetting(key: string, value: SettingValue): Promise<SettingOut> {
  return (await api.put<SettingOut>(`/settings/${key}`, { value })).data;
}
