import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PastEventCard } from "@/components/event-card";
import { Container, EmptyState } from "@/components/ui";
import { listPastEvents } from "@/lib/queries/events";

export const metadata: Metadata = {
  title: "Past dinners",
  description: "Dinners that already happened: the photos and what the table said.",
};

export default function PastEventsPage() {
  return (
    <main className="flex-1">
      <Container className="py-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <Link href="/events" className="hover:text-accent">Dinners</Link> / Past
        </p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">What it&apos;s like.</h1>
        <p className="mt-2 max-w-xl text-muted">Dinners that already happened, with the photos and what the table said afterwards. Reviews are anonymous and only from people who were there.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <PastList />
        </Suspense>
      </Container>
    </main>
  );
}

async function PastList() {
  // Request-time data: CI builds without DATABASE_URL, so this subtree must not prerender.
  await connection();
  const events = await listPastEvents();
  if (events.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState title="No dinners yet">
          The first ones are on the <Link href="/events" className="text-accent underline-offset-2 hover:underline">calendar</Link>.
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <li key={e.id}>
          <PastEventCard event={e} />
        </li>
      ))}
    </ul>
  );
}
