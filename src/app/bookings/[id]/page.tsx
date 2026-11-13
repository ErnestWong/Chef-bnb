import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TransitionButton } from "@/components/booking-forms";
import { BOOKING_TYPE_LABELS, BookingStatusBadge } from "@/components/booking-status";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { RULES } from "@/lib/bookings/rules";
import { BOROUGH_LABELS, formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { getBookingForGuest } from "@/lib/queries/bookings";

export const metadata: Metadata = { title: "Booking" };

export default function BookingPage({ params, searchParams }: PageProps<"/bookings/[id]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <BookingDetails params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BookingDetails({ params, searchParams }: { params: PageProps<"/bookings/[id]">["params"]; searchParams: PageProps<"/bookings/[id]">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/bookings/${id}`);
  const b = await getBookingForGuest(id, user);
  if (!b) notFound();
  const isNew = sp.new === "1";
  const upcoming = b.event.startsAt > new Date();
  const cancellable = upcoming && (b.status === "REQUESTED" || b.status === "CONFIRMED");
  const expiresAt = new Date(b.createdAt.getTime() + RULES.REQUEST_EXPIRY_HOURS * 3600 * 1000);

  return (
    <Container className="max-w-2xl py-12">
      <p className="text-sm text-muted">
        <Link href="/bookings" className="hover:text-accent">Your bookings</Link> / {b.event.title}
      </p>
      {isNew && (
        <h1 className="font-display mt-3 text-3xl">Seats requested — one more step</h1>
      )}
      {!isNew && <h1 className="font-display mt-3 text-3xl">{b.event.title}</h1>}

      <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-accent">{formatEventDateTime(b.event.startsAt)}</p>
            <p className="font-display text-2xl">{b.event.title}</p>
            <p className="mt-1 text-sm text-muted">
              {b.event.chef.displayName} · {b.event.venue.neighborhood}, {BOROUGH_LABELS[b.event.borough]} · near {b.event.venue.crossStreets}
            </p>
          </div>
          <BookingStatusBadge status={b.status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Booking</dt>
            <dd className="font-medium">{BOOKING_TYPE_LABELS[b.type]}, {pluralize(b.partySize, "guest")}</dd>
          </div>
          <div>
            <dt className="text-muted">Total</dt>
            <dd className="font-medium">{formatMoney(b.amountCents)}</dd>
          </div>
          {b.dietaryNotes && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-muted">Dietary notes</dt>
              <dd>{b.dietaryNotes}</dd>
            </div>
          )}
        </dl>
      </div>

      {b.status === "REQUESTED" && upcoming && (
        <section className="mt-6 rounded-2xl border-2 border-accent/40 bg-accent-soft p-6">
          <h2 className="font-display text-2xl">Pay the chef to confirm</h2>
          <p className="mt-2 text-sm">
            Send <span className="font-semibold">{formatMoney(b.amountCents)}</span> to{" "}
            <span className="font-semibold">{b.event.chef.paymentHandle ?? "the chef"}</span>
            {b.event.chef.paymentNote && <> — {b.event.chef.paymentNote}</>}
          </p>
          {!b.event.chef.paymentHandle && (
            <p className="mt-2 text-sm text-muted">The chef hasn&apos;t added payment details yet; they&apos;ll reach out.</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Your seats are held until {formatEventDateTime(expiresAt)}. The chef marks the booking paid once the money arrives, and you&apos;ll see it confirmed here.
          </p>
        </section>
      )}

      {b.status === "CONFIRMED" && upcoming && (
        <section className="mt-6 rounded-2xl border border-line p-6 text-sm">
          <h2 className="font-display text-2xl">You&apos;re in</h2>
          <p className="mt-2">The exact address is emailed {RULES.ADDRESS_REVEAL_HOURS} hours before the dinner. It&apos;s BYOB — bring something to drink.</p>
        </section>
      )}

      {cancellable && (
        <div className="mt-6">
          <TransitionButton bookingId={b.id} to="CANCELLED" label="Cancel booking" returnTo={`/bookings/${b.id}`} variant="danger" confirmText="Cancel this booking? Refunds, if any, are handled by the chef." />
        </div>
      )}
    </Container>
  );
}
