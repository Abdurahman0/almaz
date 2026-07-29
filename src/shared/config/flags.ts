/*
 * Feature flags. Some features are fully built but depend on backend endpoints
 * that don't exist yet (see docs/API-GAPS.md) — they stay OFF until those land,
 * then flip the env var (no code change / redeploy of logic needed).
 *
 * Flip by setting the env var to "true" in .env / .env.local:
 *   VITE_FEATURE_ORDER_EDITING=true   # needs PATCH /orders/{id}
 *   VITE_FEATURE_ORDERS_DND=true      # needs a manual order stage-transition endpoint
 */
const env = import.meta.env as Record<string, string | undefined>;
const on = (v: string | undefined) => v === 'true' || v === '1';

export const FEATURES = {
  /** Order editing (edit form + inline stage/due-date). Needs `PATCH /orders/{id}`. */
  orderEditing: on(env.VITE_FEATURE_ORDER_EDITING),
  /** Orders Kanban drag-&-drop stage changes. Needs a manual stage-transition endpoint. */
  ordersKanbanDnd: on(env.VITE_FEATURE_ORDERS_DND),
} as const;

export type FeatureName = keyof typeof FEATURES;
