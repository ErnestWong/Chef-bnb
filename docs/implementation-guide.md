# Implementation Guide

End-to-end build instructions for coding agents, derived from [strategy.md](./strategy.md). Scope: BYOB only, max 10 guests per event, payments offline, NYC only, responsive web.

Source of truth is the Claude doc "Dinner Party Marketplace — MVP Strategy Plan" (Implementation Guide tab); this file mirrors it so the plan lives with the code. When they drift, the doc wins; update this file.

## For the implementing agent

Build milestones in order; each one ends deployed and verifiable. Read the strategy first — the Data model, Booking model and Engineering design sections are the spec; this file is the build order. Where they conflict, ask Ernest rather than guessing.

**Stack (fixed — don't substitute without asking):**

- Next.js (App Router) + TypeScript + Tailwind, single app, deployed on Vercel
- Postgres on Neon, accessed through Prisma; all booking writes inside transactions
- Auth.js (NextAuth v5) with Google as the only provider
- Resend for email, React Email for templates
- Vercel Blob for menu PDFs and photos; Mapbox GL for the neighborhood map
- Vercel Cron hitting one `/api/cron` route hourly, authenticated with `CRON_SECRET`

**Conventions:**

- All mutations are server actions (or route handlers) validating input with zod; no client-side trust
- Every booking state change writes a `booking_log` row in the same transaction
- Capacity checks take a row lock on the event (`SELECT ... FOR UPDATE`) before counting seats
- Private columns (exact address, payment_handle, guest emails) are only ever selected in server functions that check role and booking status; public queries use a separate select list
- Money stored as integer cents even though payments are offline; dates in UTC, displayed in America/New_York
- Seed script (`pnpm db:seed`) creates fake chefs, events and bookings in every state, so each milestone is demoable

**Definition of done, every milestone:** `pnpm verify` passes (lint, typecheck, unit tests, build), migrations apply cleanly to a fresh database, seed runs, the feature works on the Vercel preview URL, and tasks marked 🧑 (Ernest) are either done or explicitly deferred.

Tasks marked 🧑 below need Ernest; everything else is agent-doable.

## Services

All free tiers to start; nothing here should cost money until there's real traffic. Rough free-tier limits are from memory — confirm current limits when setting each one up.

| Concern | Service | Why this one | Ernest provides | Needed by |
|---|---|---|---|---|
| Code hosting | GitHub (private repo) | Agents and CI work against it | Create repo, grant agent access | M0 |
| Hosting + CI | Vercel | Native Next.js, preview deploys per PR, cron included | Account, import the repo, add env vars | M0 |
| Database | Neon (Postgres) | Serverless Postgres, free tier, branching for previews | Account, copy `DATABASE_URL` | M1 |
| ORM | Prisma | Mature, agents handle it well, migrations built in | — | M1 |
| Auth | Auth.js v5 + Google OAuth | Matches the Google-only sign-in decision | Google Cloud OAuth client (see checklist) | M2 |
| File storage | Vercel Blob | No extra account; token lives in Vercel | Enable in Vercel dashboard | M3 |
| Email | Resend | Simple API, React Email templates, free ~100/day | Account, API key, verify sending domain | M7 |
| Maps | Mapbox | Free tier ~50k loads/mo; static neighborhood pin | Account, public token | M5 |
| Jobs | Vercel Cron | One hourly hit, no extra infra | — | M7 |
| Errors | Sentry (optional) | Free tier, catches production errors | Account + DSN, or skip | M9 |
| Domain | Cloudflare Registrar or Namecheap | At-cost pricing, easy DNS | Pick name, buy (~$10–15/yr), point DNS at Vercel | M9 (previews work without it) |

Database decided: Neon (Supabase considered and passed on). Still swappable if preferred: Postmark in place of Resend.

## Environment variables

Set in Vercel (production + preview) and in `.env.local` for dev. `.env.example` lists every key with a comment; Ernest fills real values. Secrets never go in the repo or in chat logs.

| Variable | What | Who supplies | Needed by |
|---|---|---|---|
| `DATABASE_URL` | Neon connection string (pooled), plus `DIRECT_URL` (unpooled) for Prisma migrations | 🧑 Ernest, from Neon dashboard | M1 |
| `AUTH_SECRET` | Session encryption key | Agent generates (`openssl rand -base64 32`) | M2 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client | 🧑 Ernest, from Google Cloud console | M2 |
| `ADMIN_EMAILS` | Comma-separated emails that get the admin role on sign-in | 🧑 Ernest (his Gmail) | M2 |
| `NEXT_PUBLIC_APP_URL` | Canonical URL for links in emails | Agent (Vercel URL now, domain later) | M2 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Auto-set when Ernest enables Blob | M3 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map rendering (public token) | 🧑 Ernest, from Mapbox | M5 |
| `RESEND_API_KEY` | Email sending | 🧑 Ernest, from Resend | M7 |
| `EMAIL_FROM` | Sender, e.g. `hello@<domain>` | 🧑 Ernest (needs verified domain) | M7 |
| `CRON_SECRET` | Shared secret the cron route requires | Agent generates; also set in vercel.json cron config | M7 |
| `SENTRY_DSN` | Error reporting | 🧑 Ernest if using Sentry, else omit | M9 |

## Ernest's setup checklist

In dependency order. Items 1–4 unblock the agent entirely for the first two milestones; the rest can trail.

- [x] **1. GitHub repo** — create a private repo, grant the agent access. (M0) _Repo exists at ErnestWong/Chef-bnb; currently public — flip to private._
- [ ] **2. Vercel** — create account, import the repo. Previews deploy from then on. (M0)
- [ ] **3. Neon** — create a project, paste `DATABASE_URL` and `DIRECT_URL` into Vercel env + `.env.local`. (M1)
- [ ] **4. Google OAuth** — in Google Cloud console: new project → OAuth consent screen (External, app name, your email) → Credentials → OAuth client ID (Web). Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://<app>.vercel.app/api/auth/callback/google` (add the real domain later). Copy ID + secret into env. Set `ADMIN_EMAILS` to your Gmail. (M2)
- [ ] **5. Enable Vercel Blob** in the dashboard. (M3)
- [ ] **6. Mapbox** — account + public token. (M5)
- [ ] **7. Resend** — account, API key. Domain verification (DNS records) needs the domain from item 9; until then emails send from Resend's test address, dev-only. (M7)
- [ ] **8. Decisions the agent will ask for** — confirm or change the defaults it will otherwise use: cancellation windows (7 days / 48 h), request-expiry (48 h), group-size cap (5), go/no-go cutoff (72 h), review window (30 days), email wording, brand name + one accent color. (M5–M7)
- [ ] **9. Domain** — pick the name, buy it, point DNS at Vercel, add it to Google OAuth redirect URIs and Resend. (M9)
- [ ] **10. Content** — 3–5 real chef profiles (bios, photos, sample menus) and your own admin pass over them. Casa Wong can be the first. (M9)
- [ ] **11. Lawyer consult** — runs in parallel with the build; blocks public launch posture, not code. (before launch)
- [ ] **12. Terms + privacy policy** — draft pages ship in M9; have the lawyer read them. (before launch)

## Milestones 0–3: foundation

### M0 — Scaffold and deploy

- Next.js App Router + TypeScript + Tailwind + Prisma init; `pnpm verify` script (lint, typecheck, vitest, build)
- GitHub Actions running `pnpm verify` on every PR; Vercel previews on
- Health route (`/api/health`) returning build info; placeholder landing page
- `.env.example` with every variable from the table above
- _Done when:_ preview URL serves the landing page, CI is green. 🧑 Items 1–2.

### M1 — Schema and seed

- Prisma schema for the eight tables in the strategy's Data model plus `booking_log`; enums for statuses; indexes on `events(starts_at, status)` and `events(borough)`
- Database constraints, not just app checks: `max_guests <= 10`, `min_guests <= max_guests`, one review per booking (unique on `booking_id`)
- Seed script: ~6 fake chefs, ~15 events across boroughs/cuisines/dates, bookings in every state, a few reviews
- Unit tests for the capacity rule: concurrent seat requests on the same event can't oversell (row-lock test)
- _Done when:_ fresh DB migrates + seeds; capacity test passes. 🧑 Item 3.

### M2 — Auth and roles

- Auth.js with Google; user row created on first sign-in; emails in `ADMIN_EMAILS` get the admin role
- Roles: guest (default), chef (after approval), admin; route protection (`/admin/*` admin-only, chef dashboard chef-only)
- Account page stub: name, avatar from Google, dinners attended (0 for now)
- _Done when:_ Ernest signs in with Google on the preview and sees `/admin`. 🧑 Item 4.
- _Status (2026-11-13):_ built with a placeholder email-only sign-in in place of Google, by Ernest's call to skip OAuth for now. Google becomes a provider swap in `src/auth.ts` once item 4 is done; roles, route protection and the account page are in place.

### M3 — Chef intake and admin

- Chef application form: bio, credentials, website/Instagram, cuisines (multi-select), hosting setup (home/venue), needs-FOH/servers/venue flags (stored, unused), sample menu PDF + photos via Vercel Blob
- Admin queue: list applications, view, approve/reject with a note; email notification deferred to M7 (show status in-app)
- Public chef profile at `/chefs/[slug]`: bio, credentials, cuisines, photos, dinners hosted (0), reviews (empty state)
- _Done when:_ a test user applies, admin approves, profile page renders. 🧑 Item 5.
- _Status (2026-11-13):_ built, minus uploads. Application form (bio, credentials, links, cuisines, hosting setup + FOH/server flags, payment handle, cert number), admin queue with approve / reject / suspend and a note the chef sees. Approval grants the CHEF role; the JWT re-reads roles from the DB every 2 minutes so no re-login is needed. Photos + menu PDF wait for Vercel Blob (item 5). Verified in headless Chrome: apply → approve → chef dashboard unlocked → public profile.

## Milestones 4–6: the core loop

### M4 — Events

- Chef creates/edits/publishes events: date + time, duration, venue (address stored private; borough, neighborhood, cross-streets, rounded lat/lng stored public), menu, price per person (cents), min/max guests (max ≤ 10 enforced in form, server and DB), allowed booking types, dietary notes, BYOB note
- Server-side validation: future date, min ≤ max, venue belongs to the chef
- Chef dashboard: upcoming/past events, per-event guest list with headcount vs. minimum and dietary notes
- Event statuses: draft → published → completed/cancelled
- _Done when:_ a seeded chef publishes an event and it appears in discovery (M5 stub list is fine).
- _Status (2026-11-13):_ built. Create/edit with an existing or new venue (address private; lat/lng rounded, borough centroid fallback until a geocoder exists) and an existing or inline menu; max ≤ 10 enforced in form, server and DB; future-date check; date/price/capacity lock once seats are held; publish / unpublish / cancel (cancel releases every active booking with a `booking_log` row). Verified in headless Chrome: publish → public page shows menu and cross streets but no address → edit → cancel.

### M5 — Discovery

- `/events`: list + month-calendar views; filters: date range, borough, cuisine, max price, party size, solo-friendly (events allowing 1-seat bookings); server-rendered for SEO
- Event page: menu, chef card, price, seats left, date/time, Mapbox map with a rounded pin + "near X & Y" cross-streets, BYOB note, dietary notes
- Chef directory `/chefs` with cuisine filter
- Brand pass #1: 🧑 Ernest picks name + accent color (checklist item 8); agent applies a simple warm theme — no heavy design yet
- _Done when:_ seeded events are browsable and filterable on the preview; exact address appears nowhere in page source. 🧑 Item 6.
- _Status (2026-11-13):_ built ahead of M3/M4 at Ernest's request (public site first). List + calendar views, all six filters, event page, chef directory and profiles, brand pass #1 (Fraunces display + Geist, one warm accent, light/dark). Verified locally: no private column in any public page. Map shows neighborhood text until the Mapbox token exists (item 6); the "Request seats" button leads to a placeholder until M6.

### M6 — Booking (the hard one)

- Request flow: pick type (solo / group ≤ 5 / buyout), party size, dietary notes → creates `requested` booking inside a transaction with `SELECT ... FOR UPDATE` on the event; requested + confirmed seats ≤ max; buyout only when the event has no other active bookings; first booking sets event mode (open vs. bought out)
- Confirmation screen + "my bookings" page show the chef's payment handle and instructions (🧑 chefs enter their Venmo/Zelle handle in their profile)
- Chef booking controls: mark paid (→ confirmed), decline, cancel; guest cancel; every transition writes `booking_log`; declined/expired/cancelled free seats atomically
- Request expiry after 48 h (checked by cron in M7; until then a manual admin action)
- Playwright test: full happy path, plus two parallel requests for the last seats where exactly one wins
- _Done when:_ the race test passes and the happy path runs on preview end to end.
- _Status (2026-11-13):_ built (ahead of M3/M4, after the public site). Request form, confirmation page with payment handle + instructions, `/bookings` with cancel, chef guest list with mark paid / decline / cancel / attended / no-show. `transitionBooking` enforces the state machine, actor rules and time rules, locks the event row and logs every change; an event with no active bookings left returns to `UNSOLD`. Verified locally: race test, transition tests against Postgres, and the full loop driven in headless Chrome. Request expiry still waits for cron (M7). The Playwright suite is not set up yet — the CDP script in the session scratchpad did the job for now.

## Milestones 7–9: lifecycle and launch

### M7 — Email and cron

- React Email templates: seat requested (to chef), booking confirmed, request expired, event cancelled (under minimum), address reveal, review request, chef application approved/rejected
- Hourly `/api/cron` route (rejects calls without `CRON_SECRET`), running the five jobs from the strategy's Scheduled jobs table, each idempotent via its marker column
- Admin "run jobs now" button for testing
- _Done when:_ each job re-run twice produces no duplicate emails or state changes; emails render on a test inbox. 🧑 Item 7, and item 8 for email wording.
- _Status (2026-11-13):_ built. Eight React Email templates (plus one asking the chef to mark attendance after a dinner), sent through Resend when `RESEND_API_KEY` is set and printed to the server log otherwise; transactional sends (seat requested, confirmed, cancelled, application decided) run right after the transaction commits and never fail the action. `/api/cron` (Bearer `CRON_SECRET`) runs the five jobs in order: expire requests, go/no-go, address reveal, close event, review request. Each is idempotent through its marker column; go/no-go gained `events.go_no_go_checked_at` so it decides exactly once rather than re-evaluating every run. Admin has a "Run scheduled jobs now" button. A Postgres test runs the sweep twice and checks the second pass changes nothing and sends nothing. The Vercel project is on the Hobby plan, which allows one cron run per day, so `vercel.json` schedules 13:00 UTC daily; change it to `0 * * * *` on Pro. Still needs Ernest: Resend key (item 7), `CRON_SECRET` and `NEXT_PUBLIC_APP_URL` in Vercel env, and the Neon database (item 3) before any of this runs on the preview.

### M8 — Reviews and profiles

- Review form reachable from the review-request email and "my bookings": 1–5 stars + text; only for `attended` bookings, within 30 days, one per booking
- Reviews display anonymously on chef profile and event pages; admin can remove a review
- Chef aggregates (dinners hosted, average rating) and guest dinners-attended as SQL views
- _Done when:_ a seeded attended booking can leave a review and the chef's average updates.

### M9 — Polish and launch

- Brand pass #2: typography, photography placeholders, empty states, mobile QA, accessibility sweep (keyboard, contrast, alt text)
- Rate limiting on auth and booking routes; basic abuse guards (one pending application per user, booking caps per guest per day)
- Terms + privacy pages (🧑 lawyer reviews, items 11–12); BYOB and 10-guest policy stated on every event page
- 🧑 Domain cutover (item 9): DNS to Vercel, update `NEXT_PUBLIC_APP_URL`, Google redirect URIs, Resend domain, `EMAIL_FROM`
- 🧑 Real content (item 10): seed chefs replaced with real profiles; fake data wiped from production
- Optional: Sentry, Vercel Analytics
- _Done when:_ a stranger can find a real event on the real domain, request seats, and the chef can confirm them.

## Testing and verification

`pnpm verify` = lint + typecheck + unit tests + build, and is the gate for every PR. Beyond that:

| Layer | What it must prove | Tool |
|---|---|---|
| Unit | Booking state machine: every legal transition, every illegal one rejected; capacity math; cancellation windows | Vitest |
| Concurrency | Parallel requests for the same last seats — exactly one wins, no oversell | Vitest against a real Postgres (not mocks) |
| Integration | Happy path: chef applies → approved → publishes → guest requests → chef marks paid → address reveal → attended → review | Playwright on preview |
| Privacy | Exact address, payment handle and guest emails absent from public page source and public API responses | Playwright assertions |
| Jobs | Each cron job run twice = run once (idempotency) | Vitest |

Manual QA before launch (Ernest, ~an hour): sign in on a phone, book a seat as a guest, confirm it as a chef, check every email lands and reads right, and try to break the booking form.

Agent working rules: one milestone per PR (or a few small PRs), each leaving `main` deployable; when a spec question comes up, ask in the PR or here rather than inventing behavior — the strategy's Open questions list is where unresolved ones go.
