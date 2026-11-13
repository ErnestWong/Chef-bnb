import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequestSeatsForm } from "@/components/booking-forms";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { getPublicEvent } from "@/lib/queries/events";

export const metadata: Metadata = { title: "Request seats" };

export default function BookPage({ params }: PageProps<"/events/[id]/book">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <BookForm params={params} />
      </Suspense>
    </main>
  );
}

async function BookForm({ params }: { params: PageProps<"/events/[id]/book">["params"] }) {
  const { id } = await params;
  await requireUser(`/events/${id}/book`);
  const event = await getPublicEvent(id);
  if (!event) notFound();

  const closed = event.status !== "PUBLISHED" || event.seatsLeft === 0;

  return (
    <Container className="max-w-xl py-12">
      <p className="text-sm text-muted">
        <Link href={`/events/${event.id}`} className="hover:text-accent">← {event.title}</Link>
      </p>
      <h1 className="font-display mt-3 text-3xl">Request seats</h1>
      <p className="mt-2 text-muted">
        {formatEventDateTime(event.startsAt)} · {formatMoney(event.priceCents)} per seat · {pluralize(event.seatsLeft, "seat")} left
      </p>
      <div className="mt-8">
        {closed ? (
          <p className="rounded-xl border border-line p-4 text-sm text-muted">
            {event.mode === "BOUGHT_OUT" ? "This dinner has been bought out." : "This dinner isn't taking requests right now."}
          </p>
        ) : (
          <RequestSeatsForm
            event={{
              id: event.id,
              allowedBookingTypes: event.allowedBookingTypes,
              minGuests: event.minGuests,
              maxGuests: event.maxGuests,
              seatsLeft: event.seatsLeft,
              mode: event.mode,
              priceCents: event.priceCents,
            }}
          />
        )}
      </div>
    </Container>
  );
}
