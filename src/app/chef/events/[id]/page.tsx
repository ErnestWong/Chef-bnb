import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TransitionButton } from "@/components/booking-forms";
import { BOOKING_TYPE_LABELS, BookingStatusBadge } from "@/components/booking-status";
import { Badge, Container } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { confirmedSeats, getEventForChef, heldSeats } from "@/lib/queries/bookings";

export const metadata: Metadata = { title: "Guest list" };

export default function ChefEventPage({ params }: PageProps<"/chef/events/[id]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <GuestList params={params} />
      </Suspense>
    </main>
  );
}

async function GuestList({ params }: { params: PageProps<"/chef/events/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireRole("CHEF", `/chef/events/${id}`);
  const event = await getEventForChef(id, user);
  if (!event) notFound();

  const now = new Date();
  const started = event.startsAt <= now;
  const returnTo = `/chef/events/${event.id}`;
  const confirmed = confirmedSeats(event);
  const dietary = event.bookings.filter((b) => b.dietaryNotes && (b.status === "REQUESTED" || b.status === "CONFIRMED"));

  return (
    <Container className="max-w-4xl py-12">
      <p className="text-sm text-muted">
        <Link href="/chef" className="hover:text-accent">Chef dashboard</Link> / {event.title}
      </p>
      <h1 className="font-display mt-3 text-4xl">{event.title}</h1>
      <p className="mt-2 text-muted">{formatEventDateTime(event.startsAt)} · {formatMoney(event.priceCents)} / seat</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{event.status.toLowerCase()}</Badge>
        <Badge>{event.mode.toLowerCase().replace("_", " ")}</Badge>
        <Badge tone={confirmed >= event.minGuests ? "accent" : "warn"}>
          {confirmed} of {event.minGuests} minimum confirmed
        </Badge>
        <Badge>{heldSeats(event)} of {event.maxGuests} seats held</Badge>
        <Link href={`/events/${event.id}`} className="text-xs text-accent underline-offset-2 hover:underline">Public page</Link>
      </div>

      {dietary.length > 0 && (
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-xl">Dietary notes</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {dietary.map((b) => (
              <li key={b.id}>
                <span className="font-medium">{b.guest.name ?? b.guest.email}</span> ({pluralize(b.partySize, "guest")}): {b.dietaryNotes}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl">Guest list</h2>
        {event.bookings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No requests yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Guest</th>
                  <th className="px-4 py-2 font-medium">Booking</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {event.bookings.map((b) => (
                  <tr key={b.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.guest.name ?? "—"}</p>
                      <p className="text-xs text-muted">{b.guest.email}</p>
                    </td>
                    <td className="px-4 py-3">{BOOKING_TYPE_LABELS[b.type]}, {pluralize(b.partySize, "guest")}</td>
                    <td className="px-4 py-3">{formatMoney(b.amountCents)}</td>
                    <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {b.status === "REQUESTED" && !started && (
                          <>
                            <TransitionButton bookingId={b.id} to="CONFIRMED" label="Mark paid" returnTo={returnTo} variant="primary" />
                            <TransitionButton bookingId={b.id} to="CANCELLED" label="Decline" returnTo={returnTo} variant="danger" confirmText="Decline this request? The seats are released." />
                          </>
                        )}
                        {b.status === "CONFIRMED" && !started && (
                          <TransitionButton bookingId={b.id} to="CANCELLED" label="Cancel" returnTo={returnTo} variant="danger" confirmText="Cancel this confirmed booking? You'll need to refund the guest." />
                        )}
                        {b.status === "CONFIRMED" && started && (
                          <>
                            <TransitionButton bookingId={b.id} to="ATTENDED" label="Attended" returnTo={returnTo} variant="primary" />
                            <TransitionButton bookingId={b.id} to="NO_SHOW" label="No-show" returnTo={returnTo} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}
