# API gaps — frontend blocked / degraded features

> Living list of endpoints the frontend needs but the live API
> (`https://almaz.api.cognilabs.org`, spec at `/openapi.json`) does not yet
> provide, plus response-shape mismatches. Verified live on 2026-07-29 with a
> Super Admin account.

## Instagram media — backend bugs (verified live 2026-07-29, POST /catalog/products/{id}/instagram)

| # | Bug | Repro | Frontend workaround in place |
|---|-----|-------|------------------------------|
| 1 | **Reel link → HTTP 500** | `POST {"link":"https://www.instagram.com/reel/XXXX/"}` → `500 "Ichki xatolik yuz berdi"`. Same link **with** `image_url` → 200. | Create form **requires an image** when it detects a `/reel/` link, so the request never hits the crashing path. |
| 2 | **Reel saved as `media_type:"post"`** | Reel link + image → 200 but the stored `media_type` is `post`, not `reel`. | The feed derives the real type from the **permalink** (`deriveKind`), so reels still land in the Reels tab. `media_type` is not trusted for categorisation. |
| 3 | **No image fetch** | Post/story links save with `image_url: null` — the backend never pulls the Instagram thumbnail. | Link-only items render an empty placeholder; the form nudges the user to upload an image (and warns it's needed to appear in the feed). |
| 4 | **No link validation** | `POST {"link":"1234567890"}` (any string) → 200, stored as a `post` with `permalink` = the raw string. | Client detects/labels the type; a global link-format validation on the backend would prevent junk entries. |

Fix requests for the backend: (1) handle `/reel/` links without an image, (2) set `media_type` from the URL path (`/reel/`→reel, `/stories/`→story, `/p/`→post), (3) fetch the IG thumbnail when a token is configured, (4) validate the link format.

## ✅ Recently closed (verified live 2026-07-31)

- **Manual order stage transition** — `POST /orders/{order_id}/status {status}` → full `OrderOut` with a new `history[]` entry. Kanban DnD now persists (`VITE_FEATURE_ORDERS_DND=true`). Note: `/status` **rejects** `cancelled`/`refunded`/`returned` (400 → use `/orders/{id}/cancel`), so the cancelled column routes to `/cancel`.
- **Edit an order — full line-item editing, status, notes (all live, re-verified 2026-07-31).**
  - `PATCH /orders/{order_id}` is now **strict** — only `notes`, `customer_id`, `assigned_operator_id` apply. Any other field (including the former `status`, `items`, `due_date`) → **422 `extra_forbidden`**. The earlier silent-ignore bug is **gone** (nonsense/`status`/`items` all 422; `notes` 200). Notes go via PATCH; status still routes through `POST /orders/{id}/status` (history-preserving; `cancelled`/`refunded`/`returned` → `/cancel`).
  - **Line items → `PATCH /orders/{id}/items` `{ "items": [...] }`** — **full-replacement** array (no per-item routes; `/items/{item_id}` → 404). Server recalculates `items_total`/`grand_total` **and** stock reservations, returns the full `OrderOut`. ⚠️ **Item ids regenerate on every call** — the editor keys rows off client ids, never server item ids. ⚠️ Omitted `engraving_text`/`box_id` are **dropped**, so existing rows round-trip them.
  - **Ring size** is validated against the category's `available_sizes`: invalid → **400** `"Bu kategoriyada mavjud o'lchamlar: 16, 17, 18. '20' o'lchami mavjud emas."`. Free input when the category has no `available_sizes`. Not required server-side even when `requires_ring_size`.
  - **Editable statuses:** `pending`, `waiting_payment`, `payment_review` **only**. Otherwise → **400** `"Bu holatda buyurtma tarkibini tahrirlab bo'lmaydi (holat=…)"`. Insufficient stock → **400** `"Zaxira yetarli emas (SKU …): mavjud N, kerak M"`. The editor maps ring-size 400 → that row's size field, stock 400 → that row's quantity field, status 400 → a page-level notice. `VITE_FEATURE_ORDER_EDITING=true` (unchanged).
- **Category ring sizes on `ProductOut`** — `ProductOut` now returns `requires_ring_size` **and** `available_sizes` (inherited from the category). The order form reads both straight from the product — the separate category lookup was removed.

## Blocking gaps (feature is built but flag-gated OFF until these land)

| # | Need | Evidence | Frontend impact |
|---|------|----------|-----------------|
| 1 | **Clients CRUD** — `GET/POST/PATCH/DELETE /clients` (or `/customers`) | No `/clients` or `/customers` path exists; clients are derived from `/inbox/conversations` | Cannot create/edit/delete a client from the CRM; the Clients page is read-only (derived) |
| 2 | **CORS origins** — allow the frontend origin(s) | `OPTIONS /auth/login` with `Origin: http://localhost:4173` → **400, no `access-control-allow-origin`** | Browser app cannot reach the API from local dev or any un-allowlisted deploy; add `http://localhost:4173` + the prod frontend origin to `CORS_ORIGINS` |

## Non-blocking / nice-to-have

| Need | Note |
|------|------|
| **Order list sorting** — a `sort` / `order_by` param on `GET /orders` | No sort param; the UI relies on the default (confirmed newest-first). Explicit sorting would make it robust. |
| **Server-side dashboard time-series** — today/weekly revenue + trends on `/analytics/dashboard` | The endpoint returns all-time totals + KPIs only (no time-windowing). The weekly chart is currently a fully-paginated `/orders?date_from=…` window (correct, but N requests for a busy week). A `range` param on analytics would collapse it to one call. |
| **`ProductOut` spec drift** — real response occasionally carries extra keys not in `/openapi.json` | Non-breaking (extra keys ignored), but the spec should document them so generated types stay accurate. (`requires_ring_size` + `available_sizes` are inherited from **Category** and now returned on `ProductOut` — wired everywhere.) |
| **Product weight on `ProductOut`** | Jewelers want og'irlik (g) on the product card, but `ProductOut` doesn't return it. The card omits it rather than printing "—"; add `weight_grams` to `ProductOut` and it'll appear automatically. (Ring size/`available_sizes` now shipped.) |
| **Shared product image (seed-data quality, not an API gap)** | Live `/catalog/products` returns `.../static/uzuk.jpg` as `media[0].image_url` for 12 of 13 products (verified 2026-07-29). The frontend renders exactly what the API sends — no client-side default-image substitution. Point each product at its own photo (upload endpoint works) to fix the "every product looks the same" effect. |
| **Report export** — `GET /analytics/report/export` (CSV/PDF) | No export endpoint exists. The dead "Eksport" button (was permanently disabled behind a "Tez orada" tooltip) was **removed** rather than faked; re-add it the moment an export endpoint lands. |
| **Global Instagram feed** — `GET /catalog/instagram-media` (all media, filter by `media_type`) | Instagram media exists only per product (`GET /catalog/products/{id}/instagram`); there is no global list, `/social-posts`, or feed endpoint (all 404, verified 2026-07-29). The new **Instagram** page (`/social`) therefore aggregates real data client-side — page products, then fetch each product's media in parallel (N+1). A global list (optionally `?media_type=reel|story|post`) would collapse it to one call. |
| **Date-ranged revenue/count summary** on `/analytics/*` | The Reports page's period "Tushum/Buyurtmalar" tiles still aggregate a 200-capped `useOrders(undefined, 200)` client-side — same class of silent under-count the dashboard had, but scoped to the Reports summary only (the top-products list already uses the server `/analytics/top-products` with `date_from/date_to`). A `GET /analytics/dashboard?date_from&date_to` (or a dedicated summary endpoint) would make it exact at any volume. |

## Flag to backend team (from the 2026-07-31 order-editing probe)

| Item | Detail |
|------|--------|
| **`available_sizes` propagation is gated on `requires_ring_size`** | Setting a category's `available_sizes` alone does **not** propagate to `ProductOut` (`available_sizes` stays `null`); it only appears once the category's `requires_ring_size=true`. Confirm this is intended — a category with fixed sizes but `requires_ring_size=false` currently exposes no size list to the client. |
| **No `DELETE /orders/{id}`** | `Allow: GET` only (DELETE → 405). Orders can't be purged; a test order pushed to `completed` (**`ORD-260731-2E2E59`**, ~100 000, references a since-deleted test variant) can't be cancelled or deleted. Please purge it, and consider a soft-delete/admin-purge for orders. |
| **`/openapi.json` not reachable with API credentials** | The spec sits behind a separate HTTP-basic gate that the Super-Admin bearer token and login/password do **not** open (`401 "Hujjatlarga kirish uchun login/parol kerak"`). Couldn't diff generated types against the spec — had to derive the whole order-editing contract from live probes. Please expose the spec to authenticated API users (or share the docs basic-auth creds). |
| **Instagram reel-without-image 500 may be resolved** | The "Instagram media bug #1" above (reel link without `image_url` → 500) returned **200** on a 2026-07-31 probe (stored as `post`). Needs a clean re-verify; if fixed, bug #1's workaround (forcing an image on `/reel/` links) can be relaxed. |

## Verified working live (2026-07-29)

- Auth: `POST /auth/login` → token, `/auth/me`, refresh — all OK.
- Products: full CRUD persists (create → refetch → PATCH → refetch → DELETE → 404).
- Orders: `POST /orders` persists; `POST /orders/{id}/cancel` → status `cancelled`.
- Payments: `GET /payments` OK (shape matches). Approve/reject exist (not exercised on real data).
- Server-side filters on `/orders`: `status`, `date_from`, `date_to`, `customer_id`, `limit`/`offset` with a real `total` — all correct.
