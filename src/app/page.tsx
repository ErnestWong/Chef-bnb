import { connection } from "next/server";
import { Suspense } from "react";
import Image from "next/image";
import { EventCard } from "@/components/event-card";
import { MoodStrip } from "@/components/mood-strip";
import { BRAND_PHOTOS } from "@/lib/brand-photos";
import { ButtonLink, Container, EmptyState } from "@/components/ui";
import { listPublishedEvents, parseEventFilters } from "@/lib/queries/events";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="border-b border-line">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-accent">New York City</p>
            <h1 className="font-display max-w-2xl text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Someone&apos;s cooking tonight. Your seat&apos;s covered.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              A small dinner party in a chef&apos;s home: come alone or with a few friends, eat what a real chef cooks, and meet the rest of the table.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/events">See the events</ButtonLink>
              <ButtonLink href="/chefs" variant="secondary">
                Meet the chefs
              </ButtonLink>
            </div>
            <p className="mt-8 font-mono text-xs uppercase tracking-wide text-muted">Ten seats · one chef · bring a bottle</p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper-2 sm:aspect-[3/2] lg:aspect-[4/5]">
            <Image src={BRAND_PHOTOS.hero.src} alt={BRAND_PHOTOS.hero.alt} fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Pull up a chair.</h2>
            <ButtonLink href="/events" variant="secondary">
              All dinners
            </ButtonLink>
          </div>
          <Suspense fallback={<EventGridSkeleton />}>
            <UpcomingEvents />
          </Suspense>
        </Container>
      </section>

      <MoodStrip />

      <section className="border-t border-line">
        <Container className="grid gap-10 py-16 sm:grid-cols-3">
          {[
            ["Pick a night", "A date, a menu, a price per seat, a neighborhood. Ten seats at most, so the table talks to itself."],
            ["Book your way", "Come alone and leave with new numbers, bring two to five friends and sit together, or take the whole table."],
            ["Bring a bottle", "BYOB, because chefs can't sell drinks at home. The address comes by text 48 hours before, once you're confirmed."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-display text-2xl">{title}</h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="border-t border-line bg-surface">
        <Container className="flex flex-wrap items-center justify-between gap-6 py-14">
          <div className="max-w-xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-accent">For chefs</p>
            <h2 className="font-display text-3xl">Cook for a table of ten.</h2>
            <p className="mt-2 text-muted">Your menu, your price, your kitchen. We fill the seats and guests pay you directly. Applying takes three minutes.</p>
          </div>
          <ButtonLink href="/host" variant="secondary">How hosting works</ButtonLink>
        </Container>
      </section>
    </main>
  );
}

async function UpcomingEvents() {
  // Request-time data ("upcoming" depends on now): opt this subtree out of the static shell.
  await connection();
  const events = (await listPublishedEvents(parseEventFilters({}))).slice(0, 6);
  if (events.length === 0) {
    return <EmptyState title="Nothing on the calendar yet">The first chefs are setting their dates. Check back in a week.</EmptyState>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

function EventGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
    </div>
  );
}
