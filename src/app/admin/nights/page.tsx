import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OpenNightForm, PartnerVenueForm } from "@/components/night-forms";
import { Badge, Container, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { BOROUGH_LABELS, formatEventDateTime, pluralize } from "@/lib/format";
import { describeVenueTake } from "@/lib/nights/terms";
import { listNightsForAdmin, listPartnerVenues } from "@/lib/nights/queries";

export const metadata: Metadata = { title: "Open nights" };

const STATUS_TONE = { OPEN: "accent", TAKEN: "neutral", CANCELLED: "warn" } as const;

export default function AdminNightsPage({ searchParams }: PageProps<"/admin/nights">) {
  return (
    <main className="flex-1">
      <Container className="max-w-5xl py-12">
        <p className="text-sm text-muted">
          <Link href="/admin" className="hover:text-accent">Admin</Link> / Open nights
        </p>
        <h1 className="font-display mt-2 text-4xl">Open nights</h1>
        <p className="mt-2 max-w-2xl text-muted">Rooms Covers has booked, the nights on the board, and the chefs pitching for them. Approving a pitch gives that chef the night as a draft dinner.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <Desk searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

async function Desk({ searchParams }: { searchParams: PageProps<"/admin/nights">["searchParams"] }) {
  const [, query] = await Promise.all([requireRole("ADMIN", "/admin/nights"), searchParams]);
  const [nights, rooms] = await Promise.all([listNightsForAdmin(), listPartnerVenues()]);

  return (
    <div className="mt-8 flex flex-col gap-12">
      {query.room === "added" && <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm">Room added. Put a night on the board for it below.</p>}

      <section>
        <h2 className="font-display text-2xl">Nights</h2>
        {nights.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No nights on the board">Add a room, then a night for it.</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {nights.map((n) => (
              <li key={n.id}>
                <Link href={`/admin/nights/${n.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted">{formatEventDateTime(n.startsAt)} · {n.venue.neighborhood}</p>
                    <p className="font-display text-xl">{n.venue.name}</p>
                    <p className="font-mono text-xs text-muted">
                      {n.minSeats}–{n.maxSeats} seats · {describeVenueTake(n)}
                    </p>
                    {n.event && <p className="mt-1 text-sm">→ {n.event.title} by {n.event.chef.displayName} ({n.event.status.toLowerCase()})</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={STATUS_TONE[n.status]}>{n.status.toLowerCase()}</Badge>
                    {n._count.pitches > 0 && <Badge tone="warn">{pluralize(n._count.pitches, "pitch", "pitches")} waiting</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line p-5">
        <h2 className="font-display text-2xl">Put a night on the board</h2>
        <p className="mt-1 text-sm text-muted">Only rooms Covers has booked. Chefs see the night once it&apos;s more than 72 hours out.</p>
        <div className="mt-4">
          {rooms.length === 0 ? (
            <p className="text-sm text-muted">Add a room first.</p>
          ) : (
            <OpenNightForm rooms={rooms.map((r) => ({ id: r.id, label: `${r.name ?? "Room"} · ${r.neighborhood}`, capacity: r.capacity }))} />
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Rooms</h2>
        {rooms.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No rooms yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-surface p-4 text-sm">
                <p className="font-mono text-xs uppercase tracking-wide text-muted">
                  {r.neighborhood}, {BOROUGH_LABELS[r.borough]} · seats {r.capacity}
                  {r.hasBar ? " · bar" : ""}
                </p>
                <p className="font-display text-xl">{r.name}</p>
                <p className="text-muted">{r.description}</p>
                <p className="mt-1">{r.address}</p>
                {r.kitchenNotes && <p className="mt-1 font-mono text-xs text-muted">{r.kitchenNotes}</p>}
                <p className="mt-1 text-xs text-muted">{pluralize(r._count.openNights, "night")} so far</p>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-4 rounded-2xl border border-line p-5">
          <summary className="cursor-pointer font-medium">Add a room</summary>
          <div className="mt-4">
            <PartnerVenueForm />
          </div>
        </details>
      </section>
    </div>
  );
}
