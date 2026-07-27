import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as settingsApi from './api';
import { SETTING_KEYS } from './api';
import type { SettingValue } from '@/shared/api/types';

export const settingKeys = {
  all: ['settings'] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingKeys.all,
    queryFn: settingsApi.listSettings,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: SettingValue }) =>
      settingsApi.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.all }),
  });
}

/** Read a numeric global setting with a fallback default. */
export function useNumberSetting(key: string, fallback: number): number {
  const { data } = useSettings();
  const raw = data?.find((s) => s.key === key)?.value;
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Global low-stock threshold (default 10). */
export function useLowStockThreshold(): number {
  return useNumberSetting(SETTING_KEYS.lowStockThreshold, 10);
}

/** Global engraving price (default 50000). */
export function useEngravingPrice(): number {
  return useNumberSetting(SETTING_KEYS.engravingPrice, 50_000);
}

/** Auto-pause minutes applied when an operator types (default 15). */
export function useAiPauseMinutes(): number {
  return useNumberSetting(SETTING_KEYS.aiPauseMinutes, 15);
}

/** Read a boolean global setting with a fallback default. */
export function useBoolSetting(key: string, fallback: boolean): boolean {
  const { data } = useSettings();
  const raw = data?.find((s) => s.key === key)?.value;
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw !== 'false' && raw !== '0';
  if (typeof raw === 'number') return raw !== 0;
  return fallback;
}

/** Global AI on/off across the whole system (default on). */
export function useAiEnabled(): boolean {
  return useBoolSetting(SETTING_KEYS.aiEnabled, true);
}

/** Whether the colored-box (gift box) feature is offered (default on). */
export function useBoxesEnabled(): boolean {
  return useBoolSetting(SETTING_KEYS.boxesEnabled, true);
}
