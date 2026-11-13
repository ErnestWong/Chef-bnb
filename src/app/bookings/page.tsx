import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TransitionButton } from "@/components/booking-forms";
import { BOOKING_TYPE_LABELS, BookingStatusBadge } from "@/components/booking-status";
import { Container, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { listBookingsForGuest } from "@/lib/queries/bookings";

export const metadata: Metadata = { title: "Your bookings" };

export default function BookingsPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-3xl py-12">
        <h1 className="font-display text-4xl">Your bookings</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
          <BookingList />
        </Suspense>
      </Container>
    </main>
  );
}

async function BookingList() {
  const user = await requireUser("/bookings");
  const bookings = await listBookingsForGuest(user);
  const now = new Date();

  if (bookings.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState title="No bookings yet">
          <Link href="/events" className="text-accent underline-offset-2 hover:underline">Find a dinner</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {bookings.map((b) => {
        const upcoming = b.event.startsAt > now;
        const cancellable = upcoming && (b.status === "REQUESTED" || b.status === "CONFIRMED");
        return (
          <li key={b.id} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-accent">{formatEventDateTime(b.event.startsAt)}</p>
                <Link href={`/bookings/${b.id}`} className="font-display text-2xl hover:text-accent">
                  {b.event.title}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {b.event.chef.displayName} · {b.event.venue.neighborhood} · {BOOKING_TYPE_LABELS[b.type]}, {pluralize(b.partySize, "guest")} · {formatMoney(b.amountCents)}
                </p>
              </div>
              <BookingStatusBadge status={b.status} />
            </div>
            {b.status === "REQUESTED" && upcoming && (
              <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm">
                Pay {formatMoney(b.amountCents)} to <span className="font-medium">{b.event.chef.paymentHandle ?? "the chef (details on the booking page)"}</span> to confirm your seat.{" "}
                <Link href={`/bookings/${b.id}`} className="text-accent underline-offset-2 hover:underline">Details</Link>
              </p>
            )}
            {cancellable && (
              <div className="mt-3">
                <TransitionButton bookingId={b.id} to="CANCELLED" label="Cancel booking" returnTo="/bookings" variant="danger" confirmText="Cancel this booking? Refunds, if any, are handled by the chef." />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
