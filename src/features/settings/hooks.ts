import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as settingsApi from './api';
import { GOLD_RATE_KEYS } from './api';
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

/** Gold rate per gram, so'm — stored in backend settings. */
export function useGoldRates(): { rate585: number; rate750: number } {
  const { data } = useSettings();
  const num = (key: string, fallback: number): number => {
    const raw = data?.find((s) => s.key === key)?.value;
    const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    rate585: num(GOLD_RATE_KEYS['585'], 850_000),
    rate750: num(GOLD_RATE_KEYS['750'], 1_090_000),
  };
}
