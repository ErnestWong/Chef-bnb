import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Borough } from "@/generated/prisma/enums";
import { getDb } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/bookings/transitions";
import { PUBLIC_EVENT_SELECT } from "./public-select";
import { parseEventFilters, type EventFilters } from "./event-filters";

export { parseEventFilters };
export type { EventFilters };

export type PublicEvent = Prisma.EventGetPayload<{ select: typeof PUBLIC_EVENT_SELECT }> & {
  seatsLeft: number;
  soloFriendly: boolean;
};

async function seatsHeldByEvent(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const rows = await getDb().booking.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, status: { in: [...ACTIVE_STATUSES] } },
    _sum: { partySize: true },
  });
  return new Map(rows.map((r) => [r.eventId, r._sum.partySize ?? 0]));
}

function decorate(
  event: Prisma.EventGetPayload<{ select: typeof PUBLIC_EVENT_SELECT }>,
  held: number,
): PublicEvent {
  const seatsLeft = event.mode === "BOUGHT_OUT" ? 0 : Math.max(0, event.maxGuests - held);
  return { ...event, seatsLeft, soloFriendly: event.allowedBookingTypes.includes("SEAT") };
}

/** Published, upcoming events matching the filters, soonest first. */
export async function listPublishedEvents(filters: EventFilters, now = new Date()): Promise<PublicEvent[]> {
  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    startsAt: { gte: filters.from && filters.from > now ? filters.from : now, ...(filters.to ? { lte: filters.to } : {}) },
    ...(filters.borough ? { borough: filters.borough as Borough } : {}),
    ...(filters.cuisine ? { cuisines: { some: { slug: filters.cuisine } } } : {}),
    ...(filters.maxPriceCents ? { priceCents: { lte: filters.maxPriceCents } } : {}),
    ...(filters.soloFriendly ? { allowedBookingTypes: { has: "SEAT" } } : {}),
  };
  const events = await getDb().event.findMany({ where, select: PUBLIC_EVENT_SELECT, orderBy: { startsAt: "asc" } });
  const held = await seatsHeldByEvent(events.map((e) => e.id));
  return events
    .map((e) => decorate(e, held.get(e.id) ?? 0))
    .filter((e) => (filters.partySize ? e.seatsLeft >= filters.partySize : true));
}

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  const event = await getDb().event.findFirst({
    where: { id, status: { in: ["PUBLISHED", "COMPLETED", "CANCELLED"] } },
    select: PUBLIC_EVENT_SELECT,
  });
  if (!event) return null;
  const held = await seatsHeldByEvent([event.id]);
  return decorate(event, held.get(event.id) ?? 0);
}

/** A chef's published upcoming events, for their profile page. */
export async function listUpcomingEventsForChef(chefId: string, now = new Date()): Promise<PublicEvent[]> {
  const events = await getDb().event.findMany({
    where: { chefId, status: "PUBLISHED", startsAt: { gte: now } },
    select: PUBLIC_EVENT_SELECT,
    orderBy: { startsAt: "asc" },
  });
  const held = await seatsHeldByEvent(events.map((e) => e.id));
  return events.map((e) => decorate(e, held.get(e.id) ?? 0));
}

export async function listCuisines() {
  return getDb().cuisine.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
}
