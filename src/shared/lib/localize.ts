import { useUiStore } from '@/shared/stores/ui';
import type { Lang } from '@/shared/stores/ui';

type Named = { name_uz: string; name_ru?: string | null } | null | undefined;
type Described = {
  description_uz?: string | null;
  description_ru?: string | null;
} | null | undefined;

/** Pick a dictionary/product name in the active language, falling back to uz. */
export function pickName(obj: Named, lang: Lang): string {
  if (!obj) return '';
  if (lang === 'ru' && obj.name_ru) return obj.name_ru;
  return obj.name_uz ?? '';
}

/** Pick a product description in the active language, falling back to uz. */
export function pickDescription(obj: Described, lang: Lang): string {
  if (!obj) return '';
  if (lang === 'ru' && obj.description_ru) return obj.description_ru;
  return obj.description_uz ?? '';
}

/** Hook returning a name-picker bound to the current UI language. */
export function useLocalizedName(): (obj: Named) => string {
  const lang = useUiStore((s) => s.lang);
  return (obj) => pickName(obj, lang);
}
