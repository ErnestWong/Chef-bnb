import { z } from "zod";
import type { Db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Borough } from "@/generated/prisma/enums";
import { RULES } from "@/lib/bookings/rules";
import { checkDinnerShape, dinnerLimits } from "@/lib/events/formats";
import { APP_TIME_ZONE } from "@/lib/format";
import { BOROUGHS } from "@/lib/queries/event-filters";
import { boroughOf, canonicalNeighborhood } from "@/lib/nyc/neighborhoods";

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
    // The real limit depends on the venue (10 at home, the room's capacity elsewhere); saveEvent checks it.
    minGuests: z.coerce.number().int().min(1).max(RULES.MAX_VENUE_CAPACITY),
    maxGuests: z.coerce.number().int().min(1).max(RULES.MAX_VENUE_CAPACITY),
    allowedBookingTypes: z.array(z.enum(["SEAT", "GROUP", "BUYOUT"])).min(1, "Allow at least one way to book."),
    cuisineIds: z.array(z.string().min(1)).min(1, "Pick at least one cuisine.").max(4),
    dietaryNotes: z.string().trim().max(500).optional(),
    /** BYOB, or the venue's licensed bar (rooms with a bar only). */
    drinks: z.enum(["BYOB", "BAR"]).default("BYOB"),
    byobNote: z.string().trim().max(200).optional(),
    // Venue: an existing one the chef owns, or a new one (their home or their own space).
    venueId: z.string().optional(),
    venueKind: z.enum(["HOME", "SPACE"]).default("HOME"),
    venueName: optional(z.string().trim().min(2).max(80)),
    venueCapacity: z.coerce.number().int().min(1).max(RULES.MAX_VENUE_CAPACITY).optional(),
    venueHasBar: z.boolean().default(false),
    venueAddress: optional(z.string().trim().min(5).max(200)),
    venueNeighborhood: optional(z.string().trim().min(2).max(60).refine((n) => canonicalNeighborhood(n) !== null, "Pick a neighborhood from the list.")),
    /** Derived from the neighborhood; accepted for older clients. */
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
  .refine((e) => e.venueId || (e.venueAddress && e.venueNeighborhood && e.venueCrossStreets), {
    message: "Pick a venue or fill in a new one (address, neighborhood, cross streets).",
    path: ["venueId"],
  })
  .refine((e) => e.venueId || e.venueKind === "HOME" || e.venueCapacity, {
    message: "How many people does the space seat?",
    path: ["venueCapacity"],
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
  constructor(
    public readonly code: "not_chef" | "venue_not_yours" | "menu_not_yours" | "in_past" | "not_found" | "locked" | "closed" | "shape",
    detail?: string,
    /** The form field the message belongs to, when there is one. */
    public readonly field?: string,
  ) {
    super(
      detail ??
        {
          not_chef: "Only approved chefs can create dinners.",
          venue_not_yours: "That venue isn't yours.",
          menu_not_yours: "That menu isn't yours.",
          in_past: "The dinner has to start in the future.",
          not_found: "Dinner not found.",
          locked: "This dinner already has bookings; the date, price and capacity can't change.",
          closed: "Cancelled or completed dinners can't be edited or reopened.",
          shape: "Check the seats and drinks for this venue.",
        }[code],
    );
  }
}

const VENUE_LIMIT_SELECT = { id: true, borough: true, type: true, capacity: true, hasBar: true } as const;

/**
 * Create or update an event for the signed-in chef. Validates ownership,
 * future date, and the venue's rules: a dinner at home seats at most 10 and is
 * BYOB; a room seats what it holds and may use its own bar. A dinner from an
 * open night keeps the night's room, date and time whatever the form sends.
 */
export async function saveEvent(db: Db, userId: string, input: EventInput, eventId?: string, now = new Date()) {
  const chef = await db.chefProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!chef || chef.status !== "APPROVED") throw new EventError("not_chef");

  return db.$transaction(async (tx) => {
    // Share the booking lock before reading occupancy or changing the event.
    if (eventId) await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
    const night = eventId
      ? (
          await tx.event.findFirst({
            where: { id: eventId, chefId: chef.id },
            select: { openNight: { select: { startsAt: true, durationMin: true, minSeats: true, maxSeats: true, venue: { select: VENUE_LIMIT_SELECT } } } },
          })
        )?.openNight ?? null
      : null;

    const startsAt = night ? night.startsAt : zonedToUtc(input.date, input.time);
    if (startsAt <= now) throw new EventError("in_past");
    if (night && input.durationMin > night.durationMin) {
      throw new EventError("shape", `The venue has the room for ${night.durationMin} minutes.`, "durationMin");
    }

    let venue: { id: string; borough: Borough; type: "CHEF_HOME" | "CHEF_SPACE" | "PARTNER_VENUE"; capacity: number; hasBar: boolean };
    if (night) {
      venue = night.venue;
    } else if (input.venueId) {
      const own = await tx.venue.findFirst({ where: { id: input.venueId, ownerUserId: userId }, select: VENUE_LIMIT_SELECT });
      if (!own) throw new EventError("venue_not_yours");
      venue = own;
    } else {
      const neighborhood = canonicalNeighborhood(input.venueNeighborhood!)!;
      const borough = boroughOf(neighborhood)!;
      const fallback = BOROUGH_CENTROIDS[borough];
      const space = input.venueKind === "SPACE";
      venue = await tx.venue.create({
        data: {
          ownerUserId: userId,
          type: space ? "CHEF_SPACE" : "CHEF_HOME",
          name: space ? input.venueName || null : null,
          hasBar: space && input.venueHasBar,
          address: input.venueAddress!,
          neighborhood,
          borough,
          crossStreets: input.venueCrossStreets!,
          lat: roundCoord(Number.isFinite(input.venueLat) ? (input.venueLat as number) : fallback.lat),
          lng: roundCoord(Number.isFinite(input.venueLng) ? (input.venueLng as number) : fallback.lng),
          capacity: space ? input.venueCapacity! : RULES.MAX_HOME_GUESTS,
        },
        select: VENUE_LIMIT_SELECT,
      });
    }

    const limits = dinnerLimits(venue, night);
    const problem = checkDinnerShape(limits, { minGuests: input.minGuests, maxGuests: input.maxGuests, drinks: input.drinks });
    if (problem) throw new EventError("shape", problem.message, problem.field);
    const venueId = venue.id;
    const borough = venue.borough;

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
      format: limits.format,
      byob: input.drinks !== "BAR",
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
