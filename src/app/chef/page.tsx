import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Container, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { confirmedSeats, heldSeats, listEventsForChef } from "@/lib/queries/bookings";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Chef dashboard" };

export default function ChefPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-4xl py-12">
        <h1 className="font-display text-4xl">Chef dashboard</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
          <ChefOverview />
        </Suspense>
      </Container>
    </main>
  );
}

async function ChefOverview() {
  const user = await requireRole("CHEF", "/chef");
  const [profile, events] = await Promise.all([
    getDb().chefProfile.findUnique({ where: { userId: user.id }, select: { displayName: true, slug: true, status: true, paymentHandle: true } }),
    listEventsForChef(user),
  ]);
  if (!profile) return <p className="mt-6 text-sm text-muted">No chef profile found for this account.</p>;

  const now = new Date();
  const upcoming = events.filter((e) => e.startsAt > now);
  const past = events.filter((e) => e.startsAt <= now);
  const awaiting = events.reduce((n, e) => n + e.bookings.filter((b) => b.status === "REQUESTED").length, 0);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/chefs/${profile.slug}`} className="font-medium hover:text-accent">{profile.displayName}</Link>
        <Badge tone="accent">{profile.status.toLowerCase()}</Badge>
        {!profile.paymentHandle && <Badge tone="warn">No payment handle yet</Badge>}
        {awaiting > 0 && <Badge tone="warn">{pluralize(awaiting, "request")} awaiting payment</Badge>}
      </div>

      <div>
        <Link href="/chef/events/new" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">+ New dinner</Link>
      </div>
      <Section title="Upcoming" events={upcoming} empty="No upcoming dinners yet — create your first one." />
      <Section title="Past" events={past} empty="No past dinners yet." />
    </div>
  );
}

function Section({ title, events, empty }: { title: string; events: Awaited<ReturnType<typeof listEventsForChef>>; empty: string }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      {events.length === 0 ? (
        <div className="mt-3">
          <EmptyState title={empty} />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {events.map((e) => {
            const requested = e.bookings.filter((b) => b.status === "REQUESTED").length;
            const confirmed = confirmedSeats(e);
            return (
              <li key={e.id}>
                <Link href={`/chef/events/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
                  <div>
                    <p className="text-sm text-accent">{formatEventDateTime(e.startsAt)}</p>
                    <p className="font-display text-xl">{e.title}</p>
                    <p className="text-sm text-muted">{formatMoney(e.priceCents)} / seat · min {e.minGuests}, max {e.maxGuests}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{e.status.toLowerCase()}</Badge>
                    <Badge tone={confirmed >= e.minGuests ? "accent" : "warn"}>
                      {confirmed}/{e.minGuests} confirmed
                    </Badge>
                    <Badge>{heldSeats(e)}/{e.maxGuests} held</Badge>
                    {requested > 0 && <Badge tone="warn">{pluralize(requested, "request")} to review</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
