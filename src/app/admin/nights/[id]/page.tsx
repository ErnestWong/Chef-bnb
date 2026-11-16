import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelNightButton, PitchDecisionForm } from "@/components/night-forms";
import { Badge, Container } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { formatDuration, formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { describeVenueTake, netAtFullTable } from "@/lib/nights/terms";
import { getNightForAdmin } from "@/lib/nights/queries";

export const metadata: Metadata = { title: "Open night" };

const PITCH_TONE = { PENDING: "warn", APPROVED: "accent", DECLINED: "neutral", WITHDRAWN: "neutral" } as const;

export default function AdminNightPage({ params, searchParams }: PageProps<"/admin/nights/[id]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <Night params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Night({ params, searchParams }: { params: PageProps<"/admin/nights/[id]">["params"]; searchParams: PageProps<"/admin/nights/[id]">["searchParams"] }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireRole("ADMIN", `/admin/nights/${id}`);
  const night = await getNightForAdmin(id);
  if (!night) notFound();
  const take = { venueSharePct: night.venueSharePct, venueFeeCents: night.venueFeeCents, terms: night.terms };

  return (
    <Container className="max-w-4xl py-12">
      <p className="text-sm text-muted">
        <Link href="/admin/nights" className="hover:text-accent">Open nights</Link> / {formatEventDateTime(night.startsAt)}
      </p>
      {query.added === "1" && <p role="status" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">The night is on the board.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">{night.venue.name}</h1>
        <Badge tone={night.status === "OPEN" ? "accent" : night.status === "CANCELLED" ? "warn" : "neutral"}>{night.status.toLowerCase()}</Badge>
      </div>
      <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
        <dt className="text-muted">When</dt>
        <dd>{formatEventDateTime(night.startsAt)} · room for {formatDuration(night.durationMin)}</dd>
        <dt className="text-muted">Where</dt>
        <dd>{night.venue.address} ({night.venue.neighborhood}, near {night.venue.crossStreets})</dd>
        <dt className="text-muted">Seats</dt>
        <dd>{night.minSeats}–{night.maxSeats} (room holds {night.venue.capacity}){night.venue.hasBar ? " · licensed bar" : " · BYOB"}</dd>
        <dt className="text-muted">Venue takes</dt>
        <dd>{describeVenueTake(take)}</dd>
        {night.suggestedPriceCents !== null && (
          <>
            <dt className="text-muted">Guide price</dt>
            <dd>{formatMoney(night.suggestedPriceCents)} a seat · full table nets the chef {formatMoney(netAtFullTable(take, night.suggestedPriceCents, night.maxSeats))}</dd>
          </>
        )}
        {night.crew && (
          <>
            <dt className="text-muted">Crew credits</dt>
            <dd>{night.crew}</dd>
          </>
        )}
        {night.event && (
          <>
            <dt className="text-muted">Dinner</dt>
            <dd>
              {night.event.status === "DRAFT" ? (
                night.event.title
              ) : (
                <Link href={`/events/${night.event.id}`} className="text-accent underline-offset-2 hover:underline">{night.event.title}</Link>
              )}{" "}
              by {night.event.chef.displayName} ({night.event.status.toLowerCase()})
            </dd>
          </>
        )}
      </dl>
      {night.status === "OPEN" && (
        <div className="mt-4">
          <CancelNightButton nightId={night.id} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl">Pitches</h2>
        {night.pitches.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No pitches yet. Approved chefs see this night on their board.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {night.pitches.map((p) => (
              <li key={p.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-muted">
                      <Link href={`/chefs/${p.chef.slug}`} className="hover:text-accent">{p.chef.displayName}</Link> · {p.chef.cuisines.map((c) => c.name).join(", ")}
                    </p>
                    <p className="font-display text-xl">{p.title}</p>
                    <p className="font-mono text-sm">
                      {formatMoney(p.priceCents)} a seat · {pluralize(p.maxGuests, "seat")} · full table nets {formatMoney(netAtFullTable(take, p.priceCents, p.maxGuests))}
                    </p>
                  </div>
                  <Badge tone={PITCH_TONE[p.status]}>{p.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{p.pitch}</p>
                {p.decisionNote && <p className="mt-2 text-xs text-muted">Note: {p.decisionNote}</p>}
                {p.status === "PENDING" && night.status === "OPEN" && (
                  <div className="mt-4">
                    <PitchDecisionForm pitchId={p.id} nightId={night.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
