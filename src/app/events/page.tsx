import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCalendar } from "@/components/event-calendar";
import { EventCard } from "@/components/event-card";
import { EventFiltersForm } from "@/components/event-filters";
import { Container, EmptyState } from "@/components/ui";
import { filterQuery } from "@/lib/queries/event-filters";
import { listCuisines, listPublishedEvents, parseEventFilters } from "@/lib/queries/events";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Dinners" };

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <main className="flex-1">
      <Container className="py-12">
        <h1 className="font-display text-4xl sm:text-5xl">Pull up a chair.</h1>
        <p className="mt-2 text-muted">Dated, ticketed, ten seats at most. Pick a night, a neighborhood, a kind of food.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading dinners…</p>}>
          <EventsBrowser searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

async function EventsBrowser({ searchParams }: { searchParams: PageProps<"/events">["searchParams"] }) {
  // Production logs showed Next flagging the `new Date()` defaults below as an
  // unstable prerender value even after `await searchParams`; pin the render
  // to request time explicitly, as the home page does.
  await connection();
  const filters = parseEventFilters(await searchParams);
  const [events, cuisines] = await Promise.all([listPublishedEvents(filters), listCuisines()]);

  const tab = (view: "list" | "calendar", label: string) => (
    <Link
      href={`/events${filterQuery({ ...filters, view }, view === "list" ? { view: undefined, month: undefined } : {})}`}
      aria-current={filters.view === view ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm ${filters.view === view ? "bg-foreground text-background" : "border border-line hover:border-accent"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mt-8 flex flex-col gap-6">
      <EventFiltersForm filters={filters} cuisines={cuisines} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-sm text-muted">{pluralize(events.length, "dinner")}</p>
        <div className="flex gap-2">
          {tab("list", "List")}
          {tab("calendar", "Calendar")}
          <Link href="/events/past" className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-accent">Past</Link>
        </div>
      </div>
      {filters.view === "calendar" ? (
        <EventCalendar events={events} filters={filters} />
      ) : events.length === 0 ? (
        <EmptyState title="Nothing matches those filters">Try widening the dates or clearing a filter.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
