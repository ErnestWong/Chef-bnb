# Chef-bnb

A curated, NYC-only marketplace for ticketed dinner parties. Chefs list dated events with a fixed per-person price; guests book a seat, a group, or the whole table. BYOB, max 10 guests per event, payments offline for the MVP.

Working title — the brand name is still open.

## Docs

- [docs/strategy.md](docs/strategy.md) — the why: landscape, legal posture, booking model, data model, engineering design, roadmap.
- [docs/implementation-guide.md](docs/implementation-guide.md) — the how: stack, services, env vars, milestones M0–M9, testing.

Both mirror the Claude doc *Dinner Party Marketplace — MVP Strategy Plan*; the doc is the source of truth.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Prisma + Neon Postgres · Auth.js (Google) · Resend · Vercel Blob · Mapbox · Vercel Cron. Deployed on Vercel.

## Getting started

Requires Node 22.12+ (`.nvmrc`) and pnpm 9.

```sh
pnpm install
cp .env.example .env.local   # then fill in values
pnpm db:deploy               # apply migrations (needs DIRECT_URL)
pnpm db:seed                 # fake chefs, events, bookings in every state
pnpm dev                     # http://localhost:3000
```

### Sign-in

Auth.js v5 with JWT sessions. Until Google OAuth is configured (checklist item 4), a **placeholder email-only sign-in** (`/signin`, any email, no password) creates users on first use. It is on in development and Vercel previews and off in production unless `AUTH_DEV_LOGIN=true`. Emails in `ADMIN_EMAILS` get the admin role on sign-in; the chef role only comes from admin approval.

Required: `AUTH_SECRET` (`openssl rand -base64 32`). Outside Vercel and `next dev` (for example a local `next start`), also set `AUTH_TRUST_HOST=true`.

Route protection: `src/proxy.ts` does an optimistic JWT check for `/admin`, `/chef`, `/account`; pages re-check with `requireUser` / `requireRole` from `src/lib/auth/session.ts`, always inside `<Suspense>` (Cache Components).

### Database

Postgres on Neon, through Prisma 7 with `@prisma/adapter-pg`. Schema: `prisma/schema.prisma`; migrations: `prisma/migrations/` (the init migration also carries CHECK constraints Prisma can't express — max 10 guests, min ≤ max, rating 1–5). Set `DATABASE_URL` (pooled, runtime) and `DIRECT_URL` (unpooled, migrations).

Tests in `src/**/*.db.test.ts` (including the seat-request concurrency test) run against a real Postgres when `TEST_DATABASE_URL` is set and migrated; otherwise they're skipped:

```sh
DIRECT_URL=$TEST_DATABASE_URL pnpm db:deploy
TEST_DATABASE_URL=postgresql://... pnpm test
```

## Scripts

| Script | What |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm verify` | Lint + typecheck + unit tests + build. The gate for every PR; CI runs it. |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | The pieces of `verify` |
| `pnpm db:generate` | Generate the Prisma client into `src/generated/prisma` |
| `pnpm db:migrate` | Create/apply a migration in dev |
| `pnpm db:deploy` | Apply migrations (CI / production) |
| `pnpm db:seed` | Seed fake chefs, events and bookings |

## Status

- [x] M0 — scaffold, `pnpm verify`, CI, `/api/health`, placeholder landing page
- [x] M1 — schema, migration with DB constraints, seed, booking rules + row-lock concurrency test
- [x] M2 — auth and roles (placeholder email sign-in; Google OAuth swap pending checklist item 4)
- [x] Public site + brand pass #1 — landing, `/events` list + calendar with filters, event pages, `/chefs` directory, chef profiles with anonymous reviews (M5 discovery + M3's public profile, built ahead of the chef intake and booking flows)
- [x] M6 booking flow — request seats, confirmation with the chef's payment handle, "my bookings" with cancel, chef guest list with mark paid / decline / cancel / attended / no-show; every transition logged
- [x] M3 chef intake + admin queue — `/chef/apply`, `/admin/chefs` with approve / reject / suspend (grants or removes the chef role; sessions pick it up within 2 minutes)
- [x] M4 event creation — `/chef/events/new` and `/edit` with venue + menu creation inline, publish / unpublish / cancel (cancelling releases and logs every active booking)
- [ ] File uploads (photos, menu PDF) wait for Vercel Blob (checklist item 5)
- [ ] M7 email + cron, M8 reviews, M9 polish — see the implementation guide
