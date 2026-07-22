import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Preset = 'velvet' | 'noir' | 'silk' | 'marble' | 'pearl';
export type Lang = 'uz' | 'ru';

export const PRESET_IDS: Preset[] = ['velvet', 'noir', 'silk', 'marble', 'pearl'];

/** Applied synchronously so charts/components read fresh CSS vars on the very next render. */
export function applyThemeAttrs(preset: Preset): void {
  document.documentElement.dataset.theme = preset;
  delete document.documentElement.dataset.accent;
}

interface UiState {
  preset: Preset;
  lang: Lang;
  sidebarCollapsed: boolean;
  setPreset: (p: Preset) => void;
  setLang: (l: Lang) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      preset: 'velvet',
      lang: 'uz',
      sidebarCollapsed: false,
      setPreset: (preset) => {
        applyThemeAttrs(preset);
        set({ preset });
      },
      setLang: (lang) => set({ lang }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'almaz-ui',
      version: 3,
      migrate: (state) => {
        const s = (state ?? {}) as Partial<UiState> & { theme?: string };
        const legacy = s.preset ?? s.theme;
        return {
          preset: PRESET_IDS.includes(legacy as Preset) ? (legacy as Preset) : 'velvet',
          lang: s.lang ?? 'uz',
          sidebarCollapsed: s.sidebarCollapsed ?? false,
        };
      },
    },
  ),
);
