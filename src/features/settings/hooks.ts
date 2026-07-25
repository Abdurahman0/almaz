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
