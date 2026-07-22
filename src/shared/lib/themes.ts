import type { Preset } from '@/shared/stores/ui';

/**
 * Display metadata for the preset picker. The `bg`/`accent` values are
 * previews of the CSS-variable palettes in index.css (the single source of
 * truth for actual rendering) — components never style themselves with these.
 */
export const PRESETS: Array<{ id: Preset; label: string; bg: string; surface: string; accent: string }> = [
  { id: 'velvet', label: 'Velvet', bg: '#0F1B17', surface: '#14231E', accent: '#C9A96A' },
  { id: 'noir', label: 'Noir', bg: '#0F1013', surface: '#16181D', accent: '#7A9CCB' },
  { id: 'silk', label: 'Silk', bg: '#171210', surface: '#201915', accent: '#D49A8C' },
  { id: 'marble', label: 'Marble', bg: '#F4F1EA', surface: '#FFFFFF', accent: '#B8944F' },
  { id: 'pearl', label: 'Pearl', bg: '#F2F3F1', surface: '#FFFFFF', accent: '#4FA97E' },
];
