import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TransitionButton } from "@/components/booking-forms";
import { BOOKING_TYPE_LABELS, BookingStatusBadge } from "@/components/booking-status";
import { ReviewForm } from "@/components/review-form";
import { Container, Stars } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { RULES, requestExpiresAt } from "@/lib/bookings/rules";
import { BOROUGH_LABELS, formatEventDateTime, formatEventDay, formatMoney, pluralize } from "@/lib/format";
import { getBookingForGuest, getRevealedAddress } from "@/lib/queries/bookings";
import { reviewEligibility } from "@/lib/reviews/reviews";

export const metadata: Metadata = { title: "Booking" };

const HOUR = 3600 * 1000;

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
  const justReviewed = sp.reviewed === "1";
  const now = new Date();
  const upcoming = b.event.startsAt > now;
  const eligibility = reviewEligibility({ guestUserId: b.guestUserId, status: b.status, event: b.event, review: b.review }, user.id, now);
  const cancellable = upcoming && (b.status === "REQUESTED" || b.status === "CONFIRMED");
  // A hold lasts 48 h or until the dinner starts, whichever comes first.
  const expiresAt = requestExpiresAt(b.createdAt, b.event.startsAt);
  const holdEndsAtStart = expiresAt.getTime() === b.event.startsAt.getTime();
  const soon = expiresAt.getTime() - now.getTime() < 24 * HOUR;
  // Once the address has been emailed, it also shows here; never before.
  const revealed = b.status === "CONFIRMED" && upcoming ? await getRevealedAddress(b.id, user) : null;
  const revealDay = new Date(b.event.startsAt.getTime() - RULES.ADDRESS_REVEAL_HOURS * HOUR);

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
          <p className="mt-3 text-sm">
            {soon ? (
              <span className="font-medium">Pay now: </span>
            ) : null}
            {holdEndsAtStart
              ? `Your seats are held until the dinner starts, ${formatEventDateTime(expiresAt)}.`
              : `Your seats are held until ${formatEventDateTime(expiresAt)}.`}
            {soon ? " The chef confirms payments by hand, so the sooner the better." : " Unpaid requests expire then."}
          </p>
          <p className="mt-2 text-xs text-muted">
            Put your name and the dinner in the payment memo. The chef marks the booking paid once the money arrives, and you&apos;ll get a text (or an email) when they do. We&apos;ve also sent you these details.
          </p>
        </section>
      )}

      {b.status === "CONFIRMED" && upcoming && (
        <section className="mt-6 rounded-2xl border border-line p-6 text-sm">
          <h2 className="font-display text-2xl">You&apos;re in</h2>
          {revealed ? (
            <>
              <p className="mt-2">Your payment is confirmed. Here&apos;s where to go:</p>
              <p className="mt-3 text-base font-medium">{revealed.address}</p>
              <p className="text-muted">
                {b.event.venue.neighborhood}, near {b.event.venue.crossStreets} ·{" "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${revealed.address}, New York, NY`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  Open in Maps
                </a>
              </p>
              <p className="mt-3 text-xs text-muted">Also sent to you on {formatEventDateTime(revealed.sentAt)}. Please keep the address to your party.</p>
            </>
          ) : (
            <p className="mt-2">
              Your payment is confirmed.{" "}
              {revealDay <= now
                ? "The exact address goes out by text (or email) inside the last 48 hours and will show here as soon as it's sent."
                : `The exact address arrives by text (or email) about ${RULES.ADDRESS_REVEAL_HOURS} hours before the dinner, around ${formatEventDay(revealDay)}, and will show here too.`}
            </p>
          )}
          <p className="mt-2">It&apos;s BYOB — bring something to drink.</p>
        </section>
      )}

      {b.status === "ATTENDED" && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
          {b.review ? (
            <>
              <h2 className="font-display text-2xl">{justReviewed ? "Thanks for the review" : "Your review"}</h2>
              <div className="mt-3"><Stars rating={b.review.rating} /></div>
              {b.review.body && <p className="mt-2 text-sm">{b.review.body}</p>}
              <p className="mt-3 text-xs text-muted">
                {b.review.removedAt ? "An admin removed this review from the public pages." : <>Shown anonymously on <Link href={`/chefs/${b.event.chef.slug}`} className="text-accent underline-offset-2 hover:underline">{b.event.chef.displayName}&apos;s profile</Link> and the dinner page.</>}
              </p>
            </>
          ) : eligibility.ok ? (
            <>
              <h2 className="font-display text-2xl">Leave a review</h2>
              <p className="mt-1 text-sm text-muted">Anonymous to the chef and to other guests. Open until {formatEventDateTime(eligibility.deadline)}.</p>
              <div className="mt-4"><ReviewForm bookingId={b.id} chefName={b.event.chef.displayName} /></div>
            </>
          ) : (
            <p className="text-sm text-muted">The review window for this dinner closed on {formatEventDateTime(eligibility.deadline)}.</p>
          )}
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
