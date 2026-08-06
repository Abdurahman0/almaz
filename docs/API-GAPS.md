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

### ✅ Content model — shipped & integrated (verified live 2026-07-31)

"Content" is **Instagram media** — single **`product_id` FK** per item. All the content asks landed:

- **By-id GET** — `GET /catalog/instagram-media/{id}` → **200** (full model); missing → **404** `"Instagram media topilmadi"`. The `/social/content/{id}` deep link now fetches by id (no feed scan) and shows a "Kontent topilmadi" state on 404.
- **Global list** — `GET /catalog/instagram-media` → **bare JSON array** (no `{items,total}` envelope). Real filters: `product_id`, `status`, `media_type`, `limit`, `offset`. The social feed uses this (one call, joined with the product list — N+1 gone) and the product filter is now **server-side**.
- **Extended model** — `InstagramMediaOut` adds `caption: string|null`, `status: 'draft'|'scheduled'|'published'` (enum), `scheduled_at: string|null`, and `like_count`/`view_count`/`comment_count`. All writable on **create** (`POST …/instagram`) and **update** (`PATCH /catalog/instagram-media/{id}`) — verified persist. Image is still URL-reuse.

**Outstanding on content:**
| Gap | Detail |
|-----|--------|
| `ordering` / `sort` / `date_from` ignored | The list endpoint accepts these params but **silently ignores** them (garbage value → 200). The "Eng ko'p ko'rilgan" sort is done **client-side**. |
| Engagement never null (always 0) | `like_count`/`view_count`/`comment_count` come back `0`, never `null`, even on a freshly created item. The UI hides the block when all three are null (defensive) but that path can't be exercised — real IG-synced numbers aren't populated yet. |

## ✅ Recently closed (verified live 2026-07-31)

- **Manual order stage transition** — `POST /orders/{order_id}/status {status}` → full `OrderOut` with a new `history[]` entry. Kanban DnD now persists (`VITE_FEATURE_ORDERS_DND=true`). Note: `/status` **rejects** `cancelled`/`refunded`/`returned` (400 → use `/orders/{id}/cancel`), so the cancelled column routes to `/cancel`.
- **Edit an order — full line-item editing, status, notes (all live, re-verified 2026-07-31).**
  - `PATCH /orders/{order_id}` is now **strict** — only `notes`, `customer_id`, `assigned_operator_id` apply. Any other field (including the former `status`, `items`, `due_date`) → **422 `extra_forbidden`**. The earlier silent-ignore bug is **gone** (nonsense/`status`/`items` all 422; `notes` 200). Notes go via PATCH; status still routes through `POST /orders/{id}/status` (history-preserving; `cancelled`/`refunded`/`returned` → `/cancel`).
  - **Line items → `PATCH /orders/{id}/items` `{ "items": [...] }`** — **full-replacement** array (no per-item routes; `/items/{item_id}` → 404). Server recalculates `items_total`/`grand_total` **and** stock reservations, returns the full `OrderOut`. ⚠️ **Item ids regenerate on every call** — the editor keys rows off client ids, never server item ids. ⚠️ Omitted `engraving_text`/`box_id` are **dropped**, so existing rows round-trip them.
  - **Ring size** is validated against the category's `available_sizes`: invalid → **400** `"Bu kategoriyada mavjud o'lchamlar: 16, 17, 18. '20' o'lchami mavjud emas."`. Free input when the category has no `available_sizes`. Not required server-side even when `requires_ring_size`.
  - **Editable statuses:** `draft`, `pending`, `waiting_payment`, `payment_review` (all four verified 2026-07-31). Otherwise → **400** `"Bu holatda buyurtma tarkibini tahrirlab bo'lmaydi (holat=…)"`. Insufficient stock → **400** `"Zaxira yetarli emas (SKU …): mavjud N, kerak M"`. The editor maps ring-size 400 → that row's size field, stock 400 → that row's quantity field, status/box 400 → a page-level notice, and blocks saving an empty item list (would be a 422). `VITE_FEATURE_ORDER_EDITING=true` (unchanged).
  - **`assigned_operator_id` is PATCH-able** (`PATCH /orders/{id}` → 200; `null` unassigns — both verified). The order editor now has an operator select ("Tayinlanmagan" = null); the operator shows on the order detail and Kanban cards.
  - **`requires_box` now exists on both `CategoryOut` and `ProductOut`** (product inherits). The create wizard + edit rows read it from the product and make the box selector **mandatory** on that row (blocks save with "Bu mahsulot uchun quti tanlang"), with the reactive 400 mapping kept as a safety net. ⚠️ **BUT `requires_box` is effectively read-only** — `POST /catalog/categories` **500s** and `PATCH /catalog/categories/{id}` **silently ignores** `requires_box` (stays `False`). So no category can be made box-requiring, and the mandatory-box path is **untestable end-to-end** until the write path is fixed.

## ✅ Inbox — customer & conversation CRUD (shipped, verified live 2026-07-31)

- `CustomerOut` now returns **`phone: string | null`** everywhere, including the `customer` object inside `GET /inbox/conversations`. Types + UI updated (header + list row show the phone with a `tel:` link).
- **`PATCH /inbox/customers/{id}` `{ full_name?, phone? }`** → `CustomerOut`. Partial (only given fields); unknown field → **422** (`extra_forbidden`); not found → 404. Verified: renaming a placeholder customer persists and the conversation list reflects it (then restored).
- **`DELETE /inbox/conversations/{id}`** → 204 (conversation + messages gone, customer kept). Route confirmed (404 on a nil id).
- **`DELETE /inbox/customers/{id}`** → 204, or **400** when the customer has orders: `"Bu mijozning N ta buyurtmasi bor — o'chirib bo'lmaydi. Avval buyurtmalarni bekor qiling yoki faqat suhbatni o'chiring."` (verified live — customer survived; the UI shows this message inline in the ConfirmDialog).
- Note: destructive **success** paths (delete conversation / delete customer-without-orders) were **not** run against production — the inbox has no test-data creation endpoint, so no throwaway customer could be made. Endpoints + error contracts are verified; the flows are wired to them.
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
| 🔴 **`POST /catalog/categories` → 500 (REGRESSION)** | Category creation returns **500 "Ichki xatolik yuz berdi"** even for a minimal valid body (`{name_uz}`), verified 2026-07-31. This **breaks all category management** in the catalog. Highest priority. |
| 🔴 **`requires_box` is not writable** | The field exists on `CategoryOut`/`ProductOut` (read), but there's no way to set it `true`: create 500s and `PATCH /catalog/categories/{id}` returns 200 while **silently ignoring** `requires_box` (stays `False`). The frontend's mandatory-box UI is built and ready but can't be exercised until this lands. |
| **Content list `ordering`/`date_from` ignored** | `GET /catalog/instagram-media?ordering=…&date_from=…` accepts the params but ignores them (garbage → 200). "Eng ko'p ko'rilgan" sort is client-side. |

## Verified working live (2026-07-29)

- Auth: `POST /auth/login` → token, `/auth/me`, refresh — all OK.
- Products: full CRUD persists (create → refetch → PATCH → refetch → DELETE → 404).
- Orders: `POST /orders` persists; `POST /orders/{id}/cancel` → status `cancelled`.
- Payments: `GET /payments` OK (shape matches). Approve/reject exist (not exercised on real data).
- Server-side filters on `/orders`: `status`, `date_from`, `date_to`, `customer_id`, `limit`/`offset` with a real `total` — all correct.

## Order detail page (2026-08-06) — gaps found while building the full order view

| # | Need | Evidence | Frontend behavior today |
|---|------|----------|--------------------------|
| 1 | **Payment amount on `PaymentOut`** | `PaymentOut` has receipt/status/payer but **no `amount`** field | "Paid vs remaining" in so'm is impossible; the order page shows an honest receipts progress (approved-of-total count), never an invented sum |
| 2 | **BTS branch details on the order** | The chosen branch (name/address/work hours/phone) exists only inside the one-time `/map/{token}` flow (`MapBranch` in resolve/confirm); `DeliveryOut` returns only zone/provider/lat/lng/address fields | The delivery card shows the "BTS — filialdan olib ketish" badge + the pin coordinates; branch name/hours can't be displayed. Ask: persist `bts_branch_id` (+ a `GET /delivery/branches/{id}` or embed) on the delivery |
| 3 | **`GET /inbox/customers/{id}`** | Only PATCH/DELETE exist; customer objects are reachable solely via the conversations list | Client card resolves the customer from the cached conversations+orders join (`useClients`); a customer with no conversation shows as a placeholder id |
| 4 | **Customer `created_at`** | `CustomerOut` has no created/joined timestamp | "Mijoz bo'lgan sana" is approximated by the earliest order date (labelled "Birinchi buyurtma") |
| 5 | **Discount on `OrderOut`** | Totals are `items_total`/`delivery_fee`/`grand_total` only — no discount field | The totals panel has no discount row (nothing to show) |
| 6 | **Product/image on `OrderItemOut`** | Items carry only `variant_id` (+ box/engraving snapshots) | Product name/photo/material/stone resolved client-side from the single cached `/catalog/products` list + the two reference dictionaries; box photos from one `/catalog/categories/{id}/boxes` call per unique category with a boxed item — no N+1 |

## Gap-fix batch announced 2026-08-06 — integration shipped, LIVE VERIFICATION PENDING

The backend reports all four order-detail gaps fixed. This workspace currently has
**no API credentials** (the OpenAPI docs endpoint itself now requires login), so the
fixes could not be probed. Everything below is integrated behind feature detection
and lights up as soon as the fields actually appear; run the one-shot probe when
credentials are available and update this section with real findings:

```bash
ALMAZ_EMAIL=... ALMAZ_PASSWORD=... node scripts/probe-gaps.mjs
```

| # | Announced fix | Integrated (feature-detected) | Probe checks |
|---|---------------|-------------------------------|--------------|
| 1 | BTS branch on `GET /delivery/orders/{id}` | `DeliveryOut.bts_branch{name,region,district,address,landmark,phone,work_hours,lat,lng}` typed optional; delivery card renders the full branch block; map preview draws customer pin + branch marker + dashed connector + "Masofa ≈ N km" | exact field name/shape; whether `OrderOut` carries anything usable for the Kanban/list compact branch label (without it, per-row branch names would be an N+1 — **not** wired yet) |
| 2 | `CustomerOut.created_at` | typed optional; client card shows "Mijoz: <sana>dan beri" when present, first-order date only as fallback | field presence + format |
| 3 | Category create 500 / PATCH regression | form already sends the full body; nothing to change client-side | minimal + full create round-trip, PATCH each field, `available_sizes: null` clearing, cleanup |
| 4 | `requires_box` writable | "Quti talab qilinadimi?" switch added to the category form (create + edit, partial PATCH) | round-trip on create/PATCH; propagation to `ProductOut` (unconditional vs only-when-true); end-to-end: box-less order against a box-requiring product — expects a 4xx, reports a server-side enforcement gap if accepted |

Still open (unchanged): `PaymentOut.amount`, order discount field, content list
`ordering`/`date_from` ignored, engagement counters always 0.
