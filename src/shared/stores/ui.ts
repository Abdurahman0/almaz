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
  /** Count of ring-eligible navigations this session (NOT persisted). Every
   *  RING_TRANSITION_EVERY-th one plays the ring crossing; the rest fade. */
  ringNav: number;
  setPreset: (p: Preset) => void;
  setLang: (l: Lang) => void;
  toggleSidebar: () => void;
  /** Increment and return the new ring-nav count. */
  bumpRingNav: () => number;
  /** Reset the counter (on logout). */
  resetRingNav: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      preset: 'velvet',
      lang: 'uz',
      sidebarCollapsed: false,
      ringNav: 0,
      setPreset: (preset) => {
        applyThemeAttrs(preset);
        set({ preset });
      },
      setLang: (lang) => set({ lang }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      bumpRingNav: () => {
        const n = get().ringNav + 1;
        set({ ringNav: n });
        return n;
      },
      resetRingNav: () => set({ ringNav: 0 }),
    }),
    {
      name: 'almaz-ui',
      version: 3,
      // ringNav is session state — keep it out of storage.
      partialize: (s) => ({ preset: s.preset, lang: s.lang, sidebarCollapsed: s.sidebarCollapsed }),
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
