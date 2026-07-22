import { useMemo } from 'react';
import { useUiStore } from '@/shared/stores/ui';

export interface ThemeColors {
  accent: string;
  accentStrong: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
}

/**
 * Resolved CSS variable values for imperative consumers (Recharts, canvas).
 * Re-computes on preset change — the attribute is applied synchronously in
 * the store action, so reads during the next render are already fresh.
 */
export function useThemeColors(): ThemeColors {
  const preset = useUiStore((s) => s.preset);
  return useMemo(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string) => cs.getPropertyValue(name).trim();
    return {
      accent: v('--accent'),
      accentStrong: v('--accent-strong'),
      text: v('--text'),
      muted: v('--text-muted'),
      border: v('--border'),
      surface: v('--surface'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);
}
