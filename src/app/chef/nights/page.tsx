import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NightCard } from "@/components/night-card";
import { Container, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { listBoardNights } from "@/lib/nights/queries";

export const metadata: Metadata = { title: "Open nights" };

export default function OpenNightsPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-5xl py-12">
        <p className="text-sm text-muted">
          <Link href="/chef" className="hover:text-accent">Chef dashboard</Link> / Open nights
        </p>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.25em] text-accent">Open nights</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">Pick a night. The room&apos;s booked.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Rooms we&apos;ve booked with venues: restaurants on their slow nights, cafés after close, lofts with a kitchen. Pitch a menu, a price and a seat count for one night. We say yes or no, usually within a few days, and a yes becomes a draft dinner in that room.
        </p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <Board />
        </Suspense>
      </Container>
    </main>
  );
}

async function Board() {
  const user = await requireRole("CHEF", "/chef/nights");
  const nights = await listBoardNights(user.id);
  if (nights.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState title="No open nights right now">
          We add nights as venues sign on. Meanwhile, <Link href="/chef/events/new" className="text-accent underline-offset-2 hover:underline">publish a dinner</Link> at your place or your own space.
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="mt-10 grid gap-4 md:grid-cols-2">
      {nights.map((n) => (
        <li key={n.id} className="flex">
          <NightCard night={n} href={`/chef/nights/${n.id}`} pitchStatus={n.myPitch?.status} />
        </li>
      ))}
    </ul>
  );
}
