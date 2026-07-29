# API gaps — frontend blocked / degraded features

> Living list of endpoints the frontend needs but the live API
> (`https://almaz.api.cognilabs.org`, spec at `/openapi.json`) does not yet
> provide, plus response-shape mismatches. Verified live on 2026-07-29 with a
> Super Admin account.

## Blocking gaps (feature is built but flag-gated OFF until these land)

| # | Need | Evidence | Frontend impact |
|---|------|----------|-----------------|
| 1 | **Edit an order** — `PATCH /orders/{order_id}` | `PATCH` and `PUT` both return **405 Method Not Allowed** live | Order editing (client, line items, ring size, price, discount, deposit terms, due date, jeweler, notes) — built behind `VITE_FEATURE_ORDER_EDITING`, OFF |
| 2 | **Manual order stage transition** — e.g. `POST /orders/{order_id}/status {status}` | Only `POST /orders/{id}/cancel` exists; status is otherwise workflow-driven (payment approve/reject, delivery) | Kanban drag-&-drop to change stage; inline stage change from a row — built behind `VITE_FEATURE_ORDERS_DND`, OFF (board stays read-only until this lands) |
| 3 | **Clients CRUD** — `GET/POST/PATCH/DELETE /clients` (or `/customers`) | No `/clients` or `/customers` path exists; clients are derived from `/inbox/conversations` | Cannot create/edit/delete a client from the CRM; the Clients page is read-only (derived) |
| 4 | **CORS origins** — allow the frontend origin(s) | `OPTIONS /auth/login` with `Origin: http://localhost:4173` → **400, no `access-control-allow-origin`** | Browser app cannot reach the API from local dev or any un-allowlisted deploy; add `http://localhost:4173` + the prod frontend origin to `CORS_ORIGINS` |

## Non-blocking / nice-to-have

| Need | Note |
|------|------|
| **Order list sorting** — a `sort` / `order_by` param on `GET /orders` | No sort param; the UI relies on the default (confirmed newest-first). Explicit sorting would make it robust. |
| **Server-side dashboard time-series** — today/weekly revenue + trends on `/analytics/dashboard` | The endpoint returns all-time totals + KPIs only (no time-windowing). The weekly chart is currently a fully-paginated `/orders?date_from=…` window (correct, but N requests for a busy week). A `range` param on analytics would collapse it to one call. |
| **`ProductOut` spec drift** — real response has fields not in `/openapi.json` (e.g. `requires_ring_size`) | Non-breaking (extra keys ignored), but the spec should document them so generated types stay accurate. |
| **Product weight + ring size on `ProductOut`** | Jewelers want og'irlik (g) and o'lcham on the product card, but `ProductOut` returns neither (ring size lives only on `OrderItemOut`). The card omits them rather than printing "—"; add `weight_grams` + a size/size-range to `ProductOut` and they'll appear automatically. |
| **Shared product image (seed-data quality, not an API gap)** | Live `/catalog/products` returns `.../static/uzuk.jpg` as `media[0].image_url` for 12 of 13 products (verified 2026-07-29). The frontend renders exactly what the API sends — no client-side default-image substitution. Point each product at its own photo (upload endpoint works) to fix the "every product looks the same" effect. |
| **Report export** — `GET /analytics/report/export` (CSV/PDF) | No export endpoint exists. The dead "Eksport" button (was permanently disabled behind a "Tez orada" tooltip) was **removed** rather than faked; re-add it the moment an export endpoint lands. |
| **Date-ranged revenue/count summary** on `/analytics/*` | The Reports page's period "Tushum/Buyurtmalar" tiles still aggregate a 200-capped `useOrders(undefined, 200)` client-side — same class of silent under-count the dashboard had, but scoped to the Reports summary only (the top-products list already uses the server `/analytics/top-products` with `date_from/date_to`). A `GET /analytics/dashboard?date_from&date_to` (or a dedicated summary endpoint) would make it exact at any volume. |

## Verified working live (2026-07-29)

- Auth: `POST /auth/login` → token, `/auth/me`, refresh — all OK.
- Products: full CRUD persists (create → refetch → PATCH → refetch → DELETE → 404).
- Orders: `POST /orders` persists; `POST /orders/{id}/cancel` → status `cancelled`.
- Payments: `GET /payments` OK (shape matches). Approve/reject exist (not exercised on real data).
- Server-side filters on `/orders`: `status`, `date_from`, `date_to`, `customer_id`, `limit`/`offset` with a real `total` — all correct.
