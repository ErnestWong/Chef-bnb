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
- Prisma 7: connection URLs live in `prisma.config.ts`, not the schema. Client is generated to `src/generated/prisma` (gitignored); run `pnpm db:generate` after schema changes. Runtime uses `DATABASE_URL` (pooled) via `@prisma/adapter-neon`; migrations use `DIRECT_URL`.
- All mutations are server actions or route handlers validated with zod. Booking writes run in a transaction with `SELECT ... FOR UPDATE` on the event, and every state change writes a `booking_log` row in the same transaction.
- Private columns (exact address, payment handle, guest emails) are only selected in server functions that check role and booking status. Public queries use a separate select list.
- Money is integer cents. Timestamps are UTC, displayed in America/New_York.
- One milestone per PR, each leaving `main` deployable. Spec questions go to the strategy's Open questions, not into invented behavior.
