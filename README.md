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
pnpm dev                     # http://localhost:3000
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
- [ ] M1 — schema and seed
- [ ] M2 — auth and roles
- [ ] M3–M9 — see the implementation guide
