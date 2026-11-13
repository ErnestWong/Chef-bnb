import { z } from "zod";
import type { Db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Borough } from "@/generated/prisma/enums";
import { RULES } from "@/lib/bookings/rules";
import { APP_TIME_ZONE } from "@/lib/format";
import { BOROUGHS } from "@/lib/queries/event-filters";

const HOUR = 3600 * 1000;

/** Rounded fallbacks when a chef doesn't supply coordinates (no geocoder yet). */
export const BOROUGH_CENTROIDS: Record<Borough, { lat: number; lng: number }> = {
  MANHATTAN: { lat: 40.776, lng: -73.971 },
  BROOKLYN: { lat: 40.65, lng: -73.95 },
  QUEENS: { lat: 40.728, lng: -73.794 },
  BRONX: { lat: 40.845, lng: -73.866 },
  STATEN_ISLAND: { lat: 40.579, lng: -74.151 },
};

/** Public coordinates are rounded to ~3 decimals (~100 m) before storage. */
export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** "2026-12-06" + "19:00" in America/New_York → UTC instant. */
export function zonedToUtc(date: string, time: string, timeZone = APP_TIME_ZONE): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asIfUtc - guess));
}

const optional = (s: z.ZodString) => s.optional().or(z.literal(""));

export const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().max(1000).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    durationMin: z.coerce.number().int().min(30).max(600),
    priceDollars: z.coerce.number().min(0).max(1000),
    minGuests: z.coerce.number().int().min(1).max(RULES.MAX_GUESTS),
    maxGuests: z.coerce.number().int().min(1).max(RULES.MAX_GUESTS, `At most ${RULES.MAX_GUESTS} guests per dinner.`),
    allowedBookingTypes: z.array(z.enum(["SEAT", "GROUP", "BUYOUT"])).min(1, "Allow at least one way to book."),
    cuisineIds: z.array(z.string().min(1)).min(1, "Pick at least one cuisine.").max(4),
    dietaryNotes: z.string().trim().max(500).optional(),
    byobNote: z.string().trim().max(200).optional(),
    // Venue: an existing one the chef owns, or a new one.
    venueId: z.string().optional(),
    venueAddress: optional(z.string().trim().min(5).max(200)),
    venueNeighborhood: optional(z.string().trim().min(2).max(60)),
    venueBorough: z.enum(BOROUGHS).optional().or(z.literal("")),
    venueCrossStreets: optional(z.string().trim().min(3).max(80)),
    venueLat: z.coerce.number().min(40.4).max(41).optional().or(z.nan()),
    venueLng: z.coerce.number().min(-74.3).max(-73.6).optional().or(z.nan()),
    // Menu: an existing one, or a new one typed inline.
    menuId: z.string().optional(),
    menuTitle: optional(z.string().trim().min(2).max(80)),
    menuCourses: z.string().trim().max(2000).optional(),
    intent: z.enum(["draft", "publish"]).default("draft"),
  })
  .refine((e) => e.minGuests <= e.maxGuests, { message: "Minimum guests can't exceed the maximum.", path: ["minGuests"] })
  .refine((e) => e.venueId || (e.venueAddress && e.venueNeighborhood && e.venueBorough && e.venueCrossStreets), {
    message: "Pick a venue or fill in a new one (address, neighborhood, borough, cross streets).",
    path: ["venueId"],
  });

export type EventInput = z.infer<typeof eventSchema>;

/** "Name — description" per line → course objects. */
export function parseCourses(text: string | undefined): { name: string; description?: string }[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/\s+[—–-]\s+/);
      const description = rest.join(" - ").trim();
      return description ? { name: name.trim(), description } : { name: name.trim() };
    });
}

export class EventError extends Error {
  constructor(public readonly code: "not_chef" | "venue_not_yours" | "menu_not_yours" | "in_past" | "not_found" | "locked" | "closed") {
    super(
      {
        not_chef: "Only approved chefs can create dinners.",
        venue_not_yours: "That venue isn't yours.",
        menu_not_yours: "That menu isn't yours.",
        in_past: "The dinner has to start in the future.",
        not_found: "Dinner not found.",
        locked: "This dinner already has bookings; the date, price and capacity can't change.",
        closed: "Cancelled or completed dinners can't be edited or reopened.",
      }[code],
    );
  }
}

/** Create or update an event for the signed-in chef. Validates ownership, future date, and capacity rules. */
export async function saveEvent(db: Db, userId: string, input: EventInput, eventId?: string, now = new Date()) {
  const chef = await db.chefProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!chef || chef.status !== "APPROVED") throw new EventError("not_chef");

  const startsAt = zonedToUtc(input.date, input.time);
  if (startsAt <= now) throw new EventError("in_past");

  return db.$transaction(async (tx) => {
    // Share the booking lock before reading occupancy or changing the event.
    if (eventId) await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
    let venueId = input.venueId || null;
    let borough: Borough;
    if (venueId) {
      const venue = await tx.venue.findFirst({ where: { id: venueId, ownerUserId: userId }, select: { id: true, borough: true } });
      if (!venue) throw new EventError("venue_not_yours");
      borough = venue.borough;
    } else {
      borough = input.venueBorough as Borough;
      const fallback = BOROUGH_CENTROIDS[borough];
      const venue = await tx.venue.create({
        data: {
          ownerUserId: userId,
          type: "CHEF_HOME",
          address: input.venueAddress!,
          neighborhood: input.venueNeighborhood!,
          borough,
          crossStreets: input.venueCrossStreets!,
          lat: roundCoord(Number.isFinite(input.venueLat) ? (input.venueLat as number) : fallback.lat),
          lng: roundCoord(Number.isFinite(input.venueLng) ? (input.venueLng as number) : fallback.lng),
          capacity: RULES.MAX_GUESTS,
        },
      });
      venueId = venue.id;
    }

    let menuId: string | null = input.menuId || null;
    if (menuId) {
      const menu = await tx.menu.findFirst({ where: { id: menuId, chefId: chef.id }, select: { id: true } });
      if (!menu) throw new EventError("menu_not_yours");
    } else if (input.menuTitle) {
      const menu = await tx.menu.create({
        data: { chefId: chef.id, title: input.menuTitle, courses: parseCourses(input.menuCourses) },
      });
      menuId = menu.id;
    }

    const data = {
      title: input.title,
      description: input.description || null,
      startsAt,
      durationMin: input.durationMin,
      priceCents: Math.round(input.priceDollars * 100),
      minGuests: input.minGuests,
      maxGuests: input.maxGuests,
      allowedBookingTypes: input.allowedBookingTypes,
      goNoGoAt: new Date(startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR),
      borough,
      venueId,
      menuId,
      dietaryNotes: input.dietaryNotes || null,
      byobNote: input.byobNote || null,
      byob: true,
      cuisines: { set: input.cuisineIds.map((id) => ({ id })) },
    };

    if (eventId) {
      const existing = await tx.event.findFirst({
        where: { id: eventId, chefId: chef.id },
        select: { id: true, status: true, startsAt: true, priceCents: true, minGuests: true, maxGuests: true, _count: { select: { bookings: { where: { status: { in: ["REQUESTED", "CONFIRMED"] } } } } } },
      });
      if (!existing) throw new EventError("not_found");
      if (existing.status === "CANCELLED" || existing.status === "COMPLETED") throw new EventError("closed");
      const booked = existing._count.bookings > 0;
      if (booked && (existing.startsAt.getTime() !== startsAt.getTime() || existing.priceCents !== data.priceCents || existing.minGuests !== data.minGuests || existing.maxGuests !== data.maxGuests)) {
        throw new EventError("locked");
      }
      const status = input.intent === "publish" ? "PUBLISHED" : existing.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
      return tx.event.update({ where: { id: eventId }, data: { ...data, status } });
    }
    return tx.event.create({ data: { ...data, cuisines: { connect: input.cuisineIds.map((id) => ({ id })) }, chefId: chef.id, status: input.intent === "publish" ? "PUBLISHED" : "DRAFT" } });
  });
}

export type EventStatusChange = "PUBLISHED" | "DRAFT" | "CANCELLED";

export type CancelledBooking = { id: string; status: "REQUESTED" | "CONFIRMED" };

/**
 * Cancel an event and every active booking on it, inside the caller's
 * transaction (the caller holds the event lock). Used by the chef's cancel
 * button and by the go/no-go job. The chef refunds offline; every booking
 * gets a booking_log row naming the actor (null = the system).
 */
export async function cancelEventTx(
  tx: Prisma.TransactionClient,
  eventId: string,
  opts: { actorUserId: string | null; reason: string; now?: Date },
): Promise<CancelledBooking[]> {
  const now = opts.now ?? new Date();
  const active = await tx.booking.findMany({ where: { eventId, status: { in: ["REQUESTED", "CONFIRMED"] } }, select: { id: true, status: true } });
  for (const b of active) {
    await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledAt: now } });
    await tx.bookingLog.create({ data: { bookingId: b.id, fromStatus: b.status, toStatus: "CANCELLED", actorUserId: opts.actorUserId, note: opts.reason, at: now } });
  }
  await tx.event.update({ where: { id: eventId }, data: { status: "CANCELLED", cancelledAt: now, cancelReason: opts.reason, mode: "UNSOLD" } });
  return active as CancelledBooking[];
}

export const CHEF_CANCEL_REASON = "Dinner cancelled by the chef";

/**
 * Publish / unpublish / cancel. Unpublishing is only allowed with no active
 * bookings. Returns the bookings a cancellation released (empty otherwise) so
 * the caller can notify those guests after the transaction commits.
 */
export async function setEventStatus(
  db: Db,
  userId: string,
  eventId: string,
  to: EventStatusChange,
  reason?: string,
  now = new Date(),
): Promise<{ cancelledBookings: CancelledBooking[] }> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
    const event = await tx.event.findFirst({
      where: { id: eventId, chef: { userId } },
      select: { id: true, status: true, startsAt: true, chef: { select: { status: true } }, _count: { select: { bookings: { where: { status: { in: ["REQUESTED", "CONFIRMED"] } } } } } },
    });
    if (!event) throw new EventError("not_found");
    if (event.status === to) return { cancelledBookings: [] };
    if (event.status === "CANCELLED" || event.status === "COMPLETED") throw new EventError("closed");
    if (event.startsAt <= now) throw new EventError("in_past");
    if (to === "PUBLISHED" && event.chef.status !== "APPROVED") throw new EventError("not_chef");
    if (to === "DRAFT" && event._count.bookings > 0) throw new EventError("locked");
    if (to === "CANCELLED") {
      const cancelledBookings = await cancelEventTx(tx, eventId, { actorUserId: userId, reason: reason?.trim() || CHEF_CANCEL_REASON, now });
      return { cancelledBookings };
    }
    await tx.event.update({ where: { id: eventId }, data: { status: to } });
    return { cancelledBookings: [] };
  });
}
