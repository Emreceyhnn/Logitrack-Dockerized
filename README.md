# LogiTrack v2

**LogiTrack** is a multi-tenant logistics and fleet management platform. It covers the full operational lifecycle of a logistics company — shipments, routes, drivers, vehicles, trailers, warehouses, inventory, customers, fuel tracking, maintenance, and analytics — behind a role-based, company-scoped access model.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Prisma 7** on **Neon Postgres**, and **MUI 7**.

---

## ✨ Features

- **Shipment management** — full shipment lifecycle with a strict status state machine (including `FAILED` / `RETURNED` / `DELAYED` states), priorities, service types, multi-stop support, item-level tracking, and audit history.
- **Route planning & dispatch** — routes with ordered stops, driver/vehicle assignment with conflict and capacity guards, and route status tracking. Turn-by-turn routing via **Valhalla** and polyline decoding for map display.
- **Live fleet tracking** — real-time vehicle positions on **Leaflet** maps, powered by **Firebase Realtime Database**.
- **Fleet & maintenance** — vehicles, trailers and trailer assignments, fuel logs, maintenance records with status/type tracking, and document management (with signed document access via Supabase Storage).
- **Warehouse operations** — warehouses, zones, warehouse tasks (pick/pack/etc. with priorities), inventory and inventory movements, plus a dedicated **warehouse-worker** UI surface.
- **Customer management** — customers with multiple locations and Google Places address autocomplete.
- **Analytics & reports** — operational dashboards and reports built on MUI X Charts.
- **Multi-currency** — exchange rates synced from an external API via a scheduled job.
- **SLA monitoring** — cron endpoints (e.g. expiration checks, delayed-shipment detection) under `app/api/cron/`.
- **Internationalization** — fully localized UI (English 🇬🇧 / Turkish 🇹🇷) with locale-prefixed routes (`/[lang]/…`) and dictionary-based translations.
- **Onboarding & landing** — public marketing pages (statically generated) and a company onboarding flow.

## 🔐 Security & Multi-Tenancy

- **Tenant isolation** — every domain record is scoped by a required `companyId`; a tenant guard enforces isolation at the data-access layer (`app/lib/tenant-context.ts`).
- **Authentication** — JWT access/refresh tokens (`jose`), password hashing with `bcryptjs`, and **immediate session revocation** via an Upstash Redis denylist.
- **Authorization** — permission-based RBAC. Roles and their permission sets are defined in [`roles.json`](roles.json) (Administrator, Warehouse Manager, Dispatcher, Warehouse Operator, …) and enforced in `app/lib/auth-middleware.ts`.
- **Edge middleware** ([`proxy.ts`](proxy.ts)) — locale routing, route protection, IP-based **rate limiting**, and a strict **nonce-based CSP** (the nonce is propagated on request headers so Next.js can pick it up during SSR).
- **Rate limiting** — Redis-backed limiter shared by the middleware and API routes.
- **Audit logging** — `AuditLog` model records domain mutations.
- **Soft deletes** — domain entities are soft-deleted, never hard-deleted.

## 🏗️ Architecture

```
app/
├── [lang]/                  # Locale-prefixed routes (en / tr)
│   └── (pages)/
│       ├── (landing)/       # Public marketing pages (SSG)
│       ├── (dashboard)/     # Authenticated app: overview, shipments, routes,
│       │                    # drivers, vehicle, fuel, inventory, warehouses,
│       │                    # customers, users, company, analytics, reports
│       ├── auth/            # Sign in / sign up
│       ├── onboarding/      # Company onboarding
│       └── warehouse-worker/# Task-focused UI for warehouse staff
├── api/                     # REST-style route handlers per domain
│   ├── auth/ company/ customers/ drivers/ inventory/ routes/
│   ├── shipments/ trailers/ vehicles/ warehouses/ warehouse-worker/
│   ├── analytics/ overview/ reports/ exchange-rates/ valhalla/
│   └── cron/                # Scheduled jobs (expiration checks, SLA)
├── components/              # Shared React components
├── hooks/                   # Shared React hooks
└── lib/
    ├── controllers/         # Domain logic (one module per domain, co-located tests)
    ├── actions/             # Server actions
    ├── services/            # External integrations (e.g. exchange rates)
    ├── validation/          # Zod server schemas
    ├── validationSchema/    # Yup client schemas
    ├── language/            # i18n dictionaries & navigation helpers
    ├── auth-middleware.ts   # AuthN/AuthZ for API routes
    ├── tenant-context.ts    # Multi-tenant guard
    ├── rate-limiter.ts      # Redis-backed rate limiting
    └── db.ts                # Prisma client (Neon serverless adapter)
```

**Request flow:** `proxy.ts` (edge: locale + auth gate + rate limit + CSP) → route handler / server action → `auth-middleware` (permissions) → `tenant-context` (company scoping) → controller → Prisma.

API route errors are normalized through a central `handleApiError()` that maps `AppError` statuses to proper HTTP responses (403/404/409/429).

### Dual validation stack

Client and server intentionally use **different** validation libraries to keep the browser bundle small (~350 kB saved):

- **Client:** `Formik` + `Yup` — schemas in `app/lib/validationSchema/`. Never import Zod or `@prisma/client` here.
- **Server:** `Zod` — schemas in `app/lib/validation/`, with full access to Prisma enums.

> ⚠️ **Drift risk:** when a field constraint changes, update *both* the Yup and Zod schemas.

### Data model

The Prisma schema (~27 models) centers on `Company` as the tenant root, with `User`/`Role`/`Session`, fleet entities (`Driver`, `Vehicle`, `Trailer`, `MaintenanceRecord`, `FuelLog`), warehouse entities (`Warehouse`, `WarehouseZone`, `WarehouseTask`, `Inventory`, `InventoryMovement`), commerce entities (`Customer`, `CustomerLocation`), and operations (`Shipment` + stops/items/history, `Route` + stops, `Document`, `Issue`, `AuditLog`, `ExchangeRate`).

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, standalone output), React 19, TypeScript 5 |
| UI | MUI 7, MUI X (Charts, Date Pickers), Emotion, Framer Motion, Lucide, Sonner |
| Data fetching | TanStack Query 5, TanStack Table 8 |
| Database | PostgreSQL (Neon serverless) + Prisma 7 |
| Cache / sessions / rate limit | Upstash Redis |
| Realtime tracking | Firebase Realtime Database (+ firebase-admin) |
| File storage | Supabase Storage (signed URLs) |
| Maps & routing | Leaflet / react-leaflet, Valhalla, Google Places autocomplete |
| Auth | jose (JWT), bcryptjs |
| Validation | Zod (server) / Yup + Formik (client) |
| Testing | Node test runner + Testing Library + jsdom, Playwright, live integration tests |
| Quality | ESLint 9, Prettier, Husky + lint-staged |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon recommended)
- Upstash Redis, Firebase, and Supabase projects (see env vars below)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then fill in the values

# 3. Apply database migrations
npm run db:deploy      # or db:migrate for development

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See [`.env.example`](.env.example) for the full list. Key groups:

| Group | Variables |
|---|---|
| Database | `DATABASE_URL` |
| Auth | `JWT_SECRET` (required at startup), `REFRESH_SECRET` |
| Redis | `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `REDIS_URL`, … |
| Firebase | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Maps | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY` |
| FX rates | `EXCHANGE_RATE_API_KEY`, `EXCHANGE_RATE_BASE_URL` |
| Admin console | `PLATFORM_ADMIN_USER_IDS` (see below) |

## 🛡️ Super Admin Console

A cross-tenant administration and service-diagnostics console at **`/[lang]/admin`**.

### Access

Access is **not** role-based. `roles.json`'s `role_admin` is a *company* role — every tenant has one — so granting it platform-wide reach would break tenant isolation. The console is instead gated on an explicit allowlist of user IDs supplied out of band:

```bash
# .env — comma-separated user IDs (cuid). Find them via `npm run db:run`.
PLATFORM_ADMIN_USER_IDS=cuid_one,cuid_two
```

**It fails closed:** an unset or empty allowlist grants nobody access. An attacker with write access to `users`/`roles` still cannot promote themselves, because the allowlist is not in the database.

### Authorization model

`app/lib/platform-admin.ts` is the single choke point. `platformAdminAction(operation, fn)` runs, in order: allowlist check → rate limit (60/min) → audit write → `runAsSystem()`.

> **Invariant:** this is the *only* place in the app that pairs `runAsSystem()` (which bypasses the fail-closed tenant guard in `db.ts`) with a user-facing request path. Never call `runAsSystem()` directly from a route handler or server action.

Denied attempts are audited too — a non-admin probing the console is a security signal.

### Modules

| Area | Route | Notes |
|---|---|---|
| Overview | `/admin` | KPIs + activity charts, all from real rows |
| Health matrix | `/admin/health` | Live probes: Postgres, Redis, Resend, Cloudinary, Firebase, Valhalla |
| Tenants / Users / Sessions | `/admin/{tenants,users,sessions}` | Suspend, deactivate, kill sessions |
| Audit logs | `/admin/audit` | Append-only; no edit or delete route exists |
| Database browser | `/admin/database` | Read + soft-delete only; closed model allowlist, no editing |
| Deleted records | `/admin/deleted` | Review and restore soft-deleted rows |
| Feature flags + env | `/admin/{flags,settings}` | Flags in Redis; env values masked server-side |
| Service sandbox | `/admin/sandbox/*` | API tester, SSE stream, email, queue monitor |

### Deliberate omissions

These are absent because the underlying integration does not exist in this codebase. Simulating them would imply coverage that isn't there:

- **Payment gateway sandbox** — no Stripe/Iyzico integration.
- **BullMQ job board** — no queue library; the monitor reports real Redis keyspace state instead.
- **Raw WebSocket tester** — no WS endpoint; a real SSE endpoint (`/api/admin/sandbox/stream`) is provided.
- **User masquerade** — `SessionJWTPayload` carries no impersonation claim, so a masquerade token would be indistinguishable from a genuine login and its actions unattributable. Implementing it safely needs an `impersonatedBy` claim, a shortened token lifetime, a persistent UI banner, and dedicated `AuditAction` enum members (a migration). See `MasqueradeNotice.tsx`.

### Deletion model

Deletes in the console are **soft**: `deletedAt` is stamped and the tenant-guard extension hides the row from every read in the app. Nothing is erased.

This is not a shortcut — it is the only correct option here. Almost every foreign key in the schema is `onDelete: Restrict`, so a real `DELETE` of a company or user is rejected by Postgres as soon as any dependent row exists, and `audit_logs.userId` is `Restrict` too, meaning a hard delete of a user would either fail or destroy its own audit trail.

- **Covered models:** `User`, `Company`, `Shipment`, `Route`, `Warehouse`, `Customer`, `Driver`, `Inventory` (added in `20260807120000_add_soft_delete_columns`), plus `Vehicle` and `Trailer` which already had `deletedAt`.
- **Reversible** via `/admin/deleted`.
- **Deleting a user** revokes every live session — otherwise they keep working until their access token expires.
- **Deleting a company** also soft-deletes its users and signs them out, and requires the operator to retype the tenant name.
- **Protected:** an admin cannot delete their own account, and no account listed in `PLATFORM_ADMIN_USER_IDS` can be deleted (a two-admin platform must not be reducible to zero).

> **Uniqueness caveat:** `users.email`, `companies.name` and `companies.domain` stay `@unique` in Postgres regardless of deletion, so a soft-deleted record still occupies its value. Signup and company-creation checks spread `INCLUDE_DELETED` (from `app/lib/softDelete.ts`) to see deleted rows — without it they would report the value as free and then crash on the unique constraint.

### Security notes

- **API tester is SSRF-guarded.** `assertSafeApiPath` rejects absolute URLs, protocol-relative paths, `file:`, traversal escapes and cloud-metadata IPs; only this app's own `/api/*` is reachable. Covered by 18 tests.
- **`set-cookie` / `authorization` response headers are redacted** before reaching the browser.
- **No credential columns are ever selected** — `User.password`, `User.googleId`, `Session.token`, `Session.refreshToken`. Covered by tests.
- **The email tester sends real mail** through Resend using production templates, and says so in the UI.

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | `prisma generate` + lint + production build |
| `npm start` | Run the standalone production server |
| `npm test` | Run the full test suite (mocked) |
| `npm run test:live` | Run tests against live external services |
| `npm run test:single -- <file>` | Run a single test file |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:run` | Open Prisma Studio |
| `npm run lint` / `lint:fix` | Lint (and auto-fix) |
| `npm run analyze` | Build with bundle analyzer |

## 🧪 Testing

Tests are **co-located** with the code they cover (`*.test.ts[x]` next to the source) and run on the native Node test runner with `tsx`, `global-jsdom`, and module mocks. Files named `*.live.test.ts` hit real external services and only run via `npm run test:live`. Playwright is available for end-to-end testing.

## ⚠️ Project Invariants

A few rules that keep the build and runtime healthy — check these before large refactors:

- **`DriverStatus`** is only `ON_JOB` / `OFF_DUTY` / `ON_LEAVE` (default `OFF_DUTY`).
- **Cache modules** (`*/cache.ts`) must not contain `"use server"`, and barrels must not re-export `invalidate*Cache` — violating this leaks `revalidatePath` into client bundles and breaks `next build`.
- **CSP nonce** must be set on *request* headers in `proxy.ts` (not just the response) or strict-CSP hydration breaks.
- **dayjs** is configured once in `dayjsConfig.ts` (with `localizedFormat` + `en.formats` patch for MUI pickers); never call `dayjs.locale("en", obj)` elsewhere.
- **`app/[lang]/layout.tsx`** must stay cookie-free so the landing pages remain statically generated.
- **Decimal fields** must be serialized before crossing the server/client boundary.
- **`runAsSystem()`** must only ever be reached from a user-facing path via `platformAdminAction` (`app/lib/platform-admin.ts`). It bypasses the tenant guard, so any other call site is a cross-tenant data leak.
- **Soft-delete filtering** is injected by `db.ts` for every model in `SOFT_DELETE_MODELS`. A query that must see deleted rows (uniqueness checks against `@unique` columns, the restore view) has to spread `INCLUDE_DELETED` into its `where` — a bare `deletedAt: undefined` does not work under `exactOptionalPropertyTypes`. It lives in `app/lib/softDelete.ts`, **not** `db.ts`, so the dozens of tests that mock `db.ts` don't each have to re-export it.
