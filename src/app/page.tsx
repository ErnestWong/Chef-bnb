import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/components/event-card";
import { ButtonLink, Container, EmptyState } from "@/components/ui";
import { listPublishedEvents, parseEventFilters } from "@/lib/queries/events";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="border-b border-line">
        <Container className="py-20 text-center sm:py-28">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-accent">New York City</p>
          <h1 className="font-display mx-auto max-w-3xl text-5xl leading-[1.05] sm:text-6xl">
            Dinner parties, cooked by real chefs, in real homes.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            A better night out than a restaurant, easier than hosting. Book a seat, bring your friends, or take the whole table.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/events">Browse dinners</ButtonLink>
            <ButtonLink href="/chefs" variant="secondary">
              Meet the chefs
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Coming up</h2>
            <ButtonLink href="/events" variant="secondary">
              All dinners
            </ButtonLink>
          </div>
          <Suspense fallback={<EventGridSkeleton />}>
            <UpcomingEvents />
          </Suspense>
        </Container>
      </section>

      <section className="border-t border-line">
        <Container className="grid gap-10 py-16 sm:grid-cols-3">
          {[
            ["Pick a dinner", "Dated events with a fixed price per seat, a set menu and a small table — ten guests at most."],
            ["Book your way", "Take a solo seat and meet people, bring 2–5 friends, or buy out the whole table for an occasion."],
            ["Bring a bottle", "Every dinner is BYOB. The exact address arrives by email 48 hours before you sit down."],
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
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-accent">For chefs</p>
            <h2 className="font-display text-3xl">Cook for a table of ten.</h2>
            <p className="mt-2 text-muted">Host ticketed dinners at home. You set the menu and the price; guests pay you directly. Apply in about three minutes.</p>
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
    return <EmptyState title="No dinners on the calendar yet">Check back soon — chefs are being onboarded.</EmptyState>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

function EventGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
    </div>
  );
}
