# CLAUDE.md

Chef-bnb: a NYC dinner-party marketplace (Next.js App Router, TypeScript, Tailwind, Prisma + Neon, Auth.js). Read `docs/implementation-guide.md` for the build order and `docs/strategy.md` for the spec (Data model, Booking model, Engineering design). Where they conflict, ask rather than guess.

## Commands

```sh
pnpm dev          # dev server
pnpm verify       # lint + typecheck + vitest + build — must pass before any PR
pnpm test         # vitest only (src/**/*.test.ts)
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # tsx prisma/seed.ts
```

## Rules that matter here

- Next.js 16 with `cacheComponents` on: APIs differ from older versions. Check `node_modules/next/dist/docs/` before using an unfamiliar API. No `runtime` segment exports.
- Prisma 7: connection URLs live in `prisma.config.ts`, not the schema. Client is generated to `src/generated/prisma` (gitignored); run `pnpm db:generate` after schema changes. Runtime uses `DATABASE_URL` (pooled) via `@prisma/adapter-pg` (`getDb()` in `src/lib/db.ts`); migrations use `DIRECT_URL`. CHECK constraints (max_guests ≤ 10 etc.) are hand-written in the migration SQL — keep them when adding migrations.
- All mutations are server actions or route handlers validated with zod. Booking writes go through `src/lib/bookings/` (`requestSeats` locks the event with `SELECT ... FOR UPDATE`; `decideSeatRequest` holds the pure rules; `transitions.ts` is the state machine), and every state change writes a `booking_log` row in the same transaction.
- Auth: Auth.js v5, JWT sessions. `src/auth.config.ts` is DB-free and shared with `src/proxy.ts`; `src/auth.ts` adds the providers and a lazily-created Prisma adapter (never touch the DB at import time — CI builds without `DATABASE_URL`). The dev email sign-in (`src/lib/auth/dev-login.ts`) is a stand-in for Google; when Google lands, add the provider in `src/auth.ts` and leave the callbacks alone. Session reads (`getCurrentUser`, `requireUser`, `requireRole`) must sit inside `<Suspense>`; a `redirect()` from inside a streamed boundary returns HTTP 200 with a client redirect, so hard gates also live in the proxy.
- Tests: `src/**/*.test.ts` are pure unit tests; `src/**/*.db.test.ts` need `TEST_DATABASE_URL` pointing at a migrated Postgres and skip otherwise. No Postgres is installed on this machine; CI has none yet either.
- Private columns (exact address, payment handle, guest emails) are only selected in server functions that check role and booking status. Public pages query ONLY through the select lists in `src/lib/queries/public-select.ts` (`PUBLIC_*_SELECT`); a unit test rejects any private column there. Keep it that way when adding fields.
- Cache Components gotchas met so far: a component that uses `new Date()` before any request API must `await connection()` first (home page); `redirect()`/`notFound()` inside a streamed `<Suspense>` returns HTTP 200 (Next injects `noindex`; this is documented behavior), so hard gates belong in `src/proxy.ts`.
- Visual checks: headless Chrome's CLI `--window-size` can't go below ~500px on macOS; use CDP device emulation for phone widths (a `shot.mjs` driver lived in the session scratchpad — recreate if needed).
- Money is integer cents. Timestamps are UTC, displayed in America/New_York.
- One milestone per PR, each leaving `main` deployable. Spec questions go to the strategy's Open questions, not into invented behavior.
