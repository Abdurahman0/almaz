import { api } from '@/shared/api/client';
import type { SettingOut, SettingValue } from '@/shared/api/types';

/** Global setting keys (migration 0011 defaults). /settings is not paginated. */
export const SETTING_KEYS = {
  engravingPrice: 'engraving_price',
  engravingMaxChars: 'engraving_max_chars',
  engravingEnabled: 'engraving_enabled',
  lowStockThreshold: 'low_stock_threshold',
  aiEnabled: 'ai_enabled',
  aiPauseMinutes: 'ai_pause_minutes',
  boxesEnabled: 'boxes_enabled',
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
