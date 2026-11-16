import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NightCard } from "@/components/night-card";
import { PitchForm, WithdrawPitchButton } from "@/components/night-forms";
import { ButtonLink, Container } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { formatDuration, formatEventDay, formatMoney, pluralize } from "@/lib/format";
import { isPitchable } from "@/lib/nights/nights";
import { getBoardNight } from "@/lib/nights/queries";

export const metadata: Metadata = { title: "Open night" };

export default function OpenNightPage({ params, searchParams }: PageProps<"/chef/nights/[id]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <Night params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const HOW = [
  "Pitch a menu, a price per seat and how many seats you want.",
  "We say yes or no, usually within a few days. One chef gets each night.",
  "A yes becomes a draft dinner in this room, date and time filled in. Check it and publish.",
  "Guests pay you directly, as with any dinner. The venue's share is settled after the night.",
];

async function Night({ params, searchParams }: { params: PageProps<"/chef/nights/[id]">["params"]; searchParams: PageProps<"/chef/nights/[id]">["searchParams"] }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireRole("CHEF", `/chef/nights/${id}`);
  const night = await getBoardNight(id, user.id);
  if (!night) notFound();
  const pitch = night.myPitch;
  const open = isPitchable(night);

  return (
    <Container className="max-w-5xl py-12">
      <p className="text-sm text-muted">
        <Link href="/chef/nights" className="hover:text-accent">Open nights</Link> / {formatEventDay(night.startsAt)}
      </p>
      {query.pitched === "1" && (
        <p role="status" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Pitch sent. We&apos;ll text or email you either way.
        </p>
      )}
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col gap-6">
          <NightCard night={night} />
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-muted">The room is yours</dt>
            <dd>{formatDuration(night.durationMin)}</dd>
            <dt className="text-muted">Where</dt>
            <dd>{night.venue.neighborhood}, near {night.venue.crossStreets}. The street address comes with a yes.</dd>
            {night.crew && (
              <>
                <dt className="text-muted">On the night</dt>
                <dd>{night.crew}</dd>
              </>
            )}
          </dl>
          <section>
            <h2 className="font-display text-2xl">How it works</h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              {HOW.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span aria-hidden className="font-mono text-accent">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-6">
          {pitch?.status === "APPROVED" ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl">The night is yours</h2>
              <p className="text-sm text-muted">{pitch.title} is saved as a draft in this room. Check the menu, the price and the seats, then publish.</p>
              {pitch.decisionNote && <p className="rounded-md bg-paper-2 px-3 py-2 text-sm">From the team: {pitch.decisionNote}</p>}
              {night.myEventId && <ButtonLink href={`/chef/events/${night.myEventId}/edit`}>Review and publish</ButtonLink>}
            </div>
          ) : pitch?.status === "PENDING" ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl">Your pitch is in</h2>
              <p className="font-display text-xl">{pitch.title}</p>
              <p className="font-mono text-sm">{formatMoney(pitch.priceCents)} a seat · {pluralize(pitch.maxGuests, "seat")}</p>
              <p className="whitespace-pre-wrap text-sm text-muted">{pitch.pitch}</p>
              <WithdrawPitchButton pitchId={pitch.id} nightId={night.id} />
            </div>
          ) : pitch?.status === "DECLINED" ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl">Not this night</h2>
              <p className="text-sm text-muted">We went another way for this one.</p>
              {pitch.decisionNote && <p className="rounded-md bg-paper-2 px-3 py-2 text-sm">From the team: {pitch.decisionNote}</p>}
              <ButtonLink href="/chef/nights" variant="secondary">See other nights</ButtonLink>
            </div>
          ) : !open ? (
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-2xl">This night is closed</h2>
              <p className="text-sm text-muted">It&apos;s been taken, or it&apos;s too close to sell in time.</p>
              <ButtonLink href="/chef/nights" variant="secondary">See other nights</ButtonLink>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl">{pitch?.status === "WITHDRAWN" ? "Pitch again" : "Pitch this night"}</h2>
              <p className="mt-1 text-sm text-muted">One table, one seating, everyone at it. We read every pitch.</p>
              <div className="mt-5">
                <PitchForm
                  night={{
                    id: night.id,
                    minSeats: night.minSeats,
                    maxSeats: night.maxSeats,
                    suggestedPriceCents: night.suggestedPriceCents,
                    venueSharePct: night.venueSharePct,
                    venueFeeCents: night.venueFeeCents,
                    terms: night.terms,
                  }}
                />
              </div>
            </>
          )}
        </aside>
      </div>
    </Container>
  );
}
