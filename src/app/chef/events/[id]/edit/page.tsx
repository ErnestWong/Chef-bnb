import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventForm } from "@/components/event-form";
import { Container } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { APP_TIME_ZONE } from "@/lib/format";

export const metadata: Metadata = { title: "Edit dinner" };

export default function EditEventPage({ params }: PageProps<"/chef/events/[id]/edit">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <EditForm params={params} />
      </Suspense>
    </main>
  );
}

function localParts(date: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

async function EditForm({ params }: { params: PageProps<"/chef/events/[id]/edit">["params"] }) {
  const { id } = await params;
  const user = await requireRole("CHEF", `/chef/events/${id}/edit`);
  const db = getDb();
  const event = await db.event.findFirst({
    where: { id, chef: { userId: user.id } },
    include: { _count: { select: { bookings: { where: { status: { in: ["REQUESTED", "CONFIRMED"] } } } } } },
  });
  if (!event) notFound();
  const [venues, menus] = await Promise.all([
    db.venue.findMany({ where: { ownerUserId: user.id }, select: { id: true, neighborhood: true, borough: true, crossStreets: true }, orderBy: { createdAt: "asc" } }),
    db.menu.findMany({ where: { chef: { userId: user.id } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const { date, time } = localParts(event.startsAt);

  return (
    <Container className="max-w-3xl py-12">
      <p className="text-sm text-muted"><Link href={`/chef/events/${event.id}`} className="hover:text-accent">{event.title}</Link> / Edit</p>
      <h1 className="font-display mt-2 text-4xl">Edit dinner</h1>
      <div className="mt-8">
        <EventForm
          venues={venues}
          menus={menus}
          values={{
            id: event.id,
            title: event.title,
            description: event.description ?? "",
            date,
            time,
            durationMin: event.durationMin,
            priceDollars: event.priceCents / 100,
            minGuests: event.minGuests,
            maxGuests: event.maxGuests,
            allowedBookingTypes: event.allowedBookingTypes,
            dietaryNotes: event.dietaryNotes ?? "",
            byobNote: event.byobNote ?? "",
            venueId: event.venueId,
            menuId: event.menuId ?? "",
            status: event.status,
            locked: event._count.bookings > 0,
          }}
        />
      </div>
    </Container>
  );
}
