import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui";
import { getPublicEvent } from "@/lib/queries/events";

export const metadata: Metadata = { title: "Request seats" };

/** Placeholder until the booking flow (M6) lands; the backend rule set already exists. */
export default function BookPage({ params }: PageProps<"/events/[id]/book">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <BookStub params={params} />
      </Suspense>
    </main>
  );
}

async function BookStub({ params }: { params: PageProps<"/events/[id]/book">["params"] }) {
  const event = await getPublicEvent((await params).id);
  if (!event) notFound();
  return (
    <Container className="max-w-xl py-16">
      <h1 className="font-display text-3xl">Booking opens soon</h1>
      <p className="mt-3 text-muted">
        Seat requests for <span className="font-medium text-foreground">{event.title}</span> aren&apos;t open yet. The booking flow is the next thing being built.
      </p>
      <Link href={`/events/${event.id}`} className="mt-8 inline-block text-accent underline-offset-2 hover:underline">
        ← Back to the dinner
      </Link>
    </Container>
  );
}
