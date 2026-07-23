# Almaz CRM

Zargarlik do'koni uchun premium CRM — React 18 + TypeScript + Vite, "Velvet Box" dizayn tizimi.

## Setup

```bash
cp .env.example .env   # VITE_API_BASE_URL=https://almaz.api.cognilabs.org
npm install
npm run dev            # http://localhost:5173
```

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc --noEmit` + production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## API notes

- Spec: <https://almaz.api.cognilabs.org/docs> (`/openapi.json`). Types derived by hand into `src/shared/api/types.ts`.
- Auth: `POST /auth/login` (email + password) → access/refresh tokens. Axios interceptor attaches `Bearer`, on 401 does a single-flight `POST /auth/refresh` retry, then logs out. Tokens persist via Zustand `persist` (`almaz-auth`).
- All server state goes through TanStack Query hooks (`useOrders`, `useProducts`, …). Components never call axios directly.
- Order crafting stepper maps the API's 13 order statuses onto 5 jewelry stages (`src/features/orders/stages.ts`).
- Gold rate per gram lives in backend key-value settings (`gold_rate_585`, `gold_rate_750`) — editable in Sozlamalar, used by the product form price calculator.
- `/analytics/dashboard` is untyped in the spec; dashboard numbers are aggregated client-side from `/orders`.

## Where mocks live

`src/shared/mocks/clients.ts` — the API has **no customers CRUD resource**, so the Clients page runs on a clearly-marked localStorage mock (seeded, ~350ms simulated latency). To swap: create `src/features/clients/api.ts` with real endpoints and repoint `src/features/clients/hooks.ts`. Everything else is live API.

## Structure

```
src/
  app/            # providers, router, RingTransition, layout (sidebar/topbar/mobile nav)
  shared/
    api/          # axios client + interceptors, types from OpenAPI
    ui/           # Button, Card, Input, Modal, Badge, Skeleton, EmptyState,
                  # StatCard, RingProgress, HallmarkBadge, Sparkles, RingMark...
    lib/          # format (money/date), i18n (uz + ru scaffold)
    stores/       # Zustand: auth (persisted), ui (theme/lang/sidebar)
    mocks/        # clients mock (see above)
  features/
    auth, dashboard, inbox, orders, products, clients,
    payments, reports, ai (knowledge), settings (+ rbac staff, audit)
```

## Design system — "Velvet Box"

Tokens in `tailwind.config.ts` + CSS variables in `src/index.css`. Dark **Velvet** (default) and light **Marble** themes via `dark`/`light` class on `<html>`. Fonts: Cormorant Garamond (display) + Manrope (UI). Signature animations: 3D ring page transition (Blender-rendered spin video overlay), crafting stepper, gold-fill payment ring, hallmark stamp tiers, count-up stats, sparkle background — all respect `prefers-reduced-motion`.
