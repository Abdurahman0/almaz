/** Human-readable names, grouping, placeholder + diff helpers for AI prompts. */

/** Friendly Uzbek label for each known key; derived fallback for anything new. */
const NAMES: Record<string, string> = {
  ai_system_prompt: 'Tizim prompti (system)',
  ai_greeting_text: 'Salomlashish matni',
  ai_ctx_order: 'Buyurtma konteksti',
  ai_ctx_order_guide_pending: "Buyurtma yo'riq — kutilmoqda",
  ai_ctx_order_guide_waiting_payment: "Buyurtma yo'riq — to'lov kutilmoqda",
  ai_ctx_order_guide_payment_review: "Buyurtma yo'riq — to'lov tekshiruvda",
  ai_ctx_order_guide_default: "Buyurtma yo'riq — standart",
  ai_ctx_order_receipt_hint: 'Buyurtma — chek maslahati',
  ai_ctx_instagram_found: 'Instagram — mahsulot topildi',
  ai_ctx_instagram_tip_instock: 'Instagram — maslahat (mavjud)',
  ai_ctx_instagram_tip_outstock: 'Instagram — maslahat (tugagan)',
  ai_ctx_instagram_not_found: 'Instagram — topilmadi',
  ai_msg_fallback: 'Zaxira xabar (fallback)',
  ai_msg_location_confirmed_head: 'Lokatsiya tasdiqlandi — sarlavha',
  ai_msg_location_confirmed_card: 'Lokatsiya tasdiqlandi — karta bilan',
  ai_msg_location_confirmed_nocard: 'Lokatsiya tasdiqlandi — kartasiz',
};

export function promptName(key: string): string {
  if (NAMES[key]) return NAMES[key];
  const words = key.replace(/^ai_/, '').replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// ---- grouping ----
export type GroupId = 'asosiy' | 'kontekst' | 'xabar';
export const GROUP_LABELS: Record<GroupId, string> = {
  asosiy: 'Asosiy',
  kontekst: 'Kontekst shablonlari',
  xabar: 'Tayyor xabarlar',
};
export const GROUP_ORDER: GroupId[] = ['asosiy', 'kontekst', 'xabar'];

export function groupOf(key: string): GroupId {
  if (key === 'ai_system_prompt' || key === 'ai_greeting_text') return 'asosiy';
  if (key.startsWith('ai_ctx_')) return 'kontekst';
  return 'xabar';
}

// ---- placeholders ----
export function parsePlaceholders(s: string): string[] {
  return s.split(/\s+/).map((t) => t.trim()).filter(Boolean);
}

/** Placeholder tokens that exist in `placeholders` but are missing from `text`. */
export function missingPlaceholders(placeholders: string, text: string): string[] {
  return parsePlaceholders(placeholders).filter((ph) => !text.includes(ph));
}

// ---- line diff (LCS) ----
export type DiffRow = { type: 'same' | 'add' | 'del'; text: string };

/** Line-by-line diff of `a` (default) → `b` (current): del = removed from
 *  default, add = added in current. */
export function lineDiff(a: string, b: string): DiffRow[] {
  const A = a.split('\n');
  const B = b.split('\n');
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      rows.push({ type: 'same', text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: 'del', text: A[i] });
      i++;
    } else {
      rows.push({ type: 'add', text: B[j] });
      j++;
    }
  }
  while (i < n) rows.push({ type: 'del', text: A[i++] });
  while (j < m) rows.push({ type: 'add', text: B[j++] });
  return rows;
}
