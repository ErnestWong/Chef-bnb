import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/db";
import { RULES } from "@/lib/bookings/rules";
import { BOROUGH_CENTROIDS, roundCoord, zonedToUtc } from "@/lib/events/manage";
import { boroughOf, canonicalNeighborhood } from "@/lib/nyc/neighborhoods";

/**
 * Open nights (docs/strategy.md, "Shared spaces and open nights"): Covers
 * books nights with partner venues, approved chefs pitch for them, and an
 * admin approves one pitch per night, which creates the chef's dinner as a
 * draft in that room. Every state change on a night happens under a row lock
 * on the night, so two approvals can't both take it.
 */

const HOUR = 3600 * 1000;
const optional = (s: z.ZodString) => s.optional().or(z.literal(""));

export class NightError extends Error {
  constructor(
    public readonly code:
      | "not_chef"
      | "not_found"
      | "night_closed"
      | "too_late"
      | "already_pitched"
      | "declined_before"
      | "not_pending"
      | "seats_out_of_range"
      | "not_partner"
      | "in_past"
      | "over_capacity",
    detail?: string,
  ) {
    super(
      detail ??
        {
          not_chef: "Only approved chefs can pitch for open nights.",
          not_found: "That night isn't on the board.",
          night_closed: "That night is no longer open.",
          too_late: `That night is inside the ${RULES.GO_NO_GO_HOURS}-hour cutoff, so it can't sell in time.`,
          already_pitched: "You've already pitched for this night.",
          declined_before: "Your pitch for this night was declined. Pick another night, or reply to the note to talk it through.",
          not_pending: "That pitch has already been decided.",
          seats_out_of_range: "Pick a number of seats inside the night's range.",
          not_partner: "Open nights are only for rooms Covers has booked.",
          in_past: "The night has to be in the future.",
          over_capacity: "The room doesn't seat that many.",
        }[code],
    );
    this.name = "NightError";
  }
}

// ---------- Chef side ----------

export const pitchSchema = z.object({
  nightId: z.string().min(1),
  title: z.string().trim().min(3, "Give the dinner a name.").max(80),
  pitch: z.string().trim().min(40, "A few sentences: the menu, and what the night is like.").max(1500),
  priceDollars: z.coerce.number().min(0).max(1000),
  maxGuests: z.coerce.number().int().min(1).max(RULES.MAX_VENUE_CAPACITY),
});
export type PitchInput = z.infer<typeof pitchSchema>;

/** A night is on the chef board while it's open and still ahead of the go/no-go cutoff. */
export function isPitchable(night: { status: string; startsAt: Date }, now = new Date()): boolean {
  return night.status === "OPEN" && night.startsAt.getTime() - now.getTime() > RULES.GO_NO_GO_HOURS * HOUR;
}

/** Pitch for a night, or pitch again after withdrawing. One pitch per chef per night. */
export async function submitPitch(db: Db, userId: string, input: PitchInput, now = new Date()) {
  const chef = await db.chefProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!chef || chef.status !== "APPROVED") throw new NightError("not_chef");
  const night = await db.openNight.findUnique({ where: { id: input.nightId }, select: { id: true, status: true, startsAt: true, minSeats: true, maxSeats: true } });
  if (!night) throw new NightError("not_found");
  if (night.status !== "OPEN") throw new NightError("night_closed");
  if (!isPitchable(night, now)) throw new NightError("too_late");
  if (input.maxGuests < night.minSeats || input.maxGuests > night.maxSeats) {
    throw new NightError("seats_out_of_range", `This night seats ${night.minSeats}–${night.maxSeats}.`);
  }

  const data = { title: input.title, pitch: input.pitch, priceCents: Math.round(input.priceDollars * 100), maxGuests: input.maxGuests };
  const existing = await db.nightPitch.findUnique({ where: { openNightId_chefId: { openNightId: night.id, chefId: chef.id } }, select: { id: true, status: true } });
  if (existing) {
    if (existing.status === "PENDING") throw new NightError("already_pitched");
    if (existing.status === "DECLINED") throw new NightError("declined_before");
    if (existing.status === "APPROVED") throw new NightError("night_closed");
    return db.nightPitch.update({ where: { id: existing.id }, data: { ...data, status: "PENDING", decidedAt: null, decisionNote: null } });
  }
  try {
    return await db.nightPitch.create({ data: { ...data, openNightId: night.id, chefId: chef.id } });
  } catch (err) {
    // Two submits at once: the unique index on (night, chef) decides.
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") throw new NightError("already_pitched");
    throw err;
  }
}

/** The chef takes a pending pitch back. */
export async function withdrawPitch(db: Db, userId: string, pitchId: string) {
  const { count } = await db.nightPitch.updateMany({ where: { id: pitchId, status: "PENDING", chef: { userId } }, data: { status: "WITHDRAWN" } });
  if (count === 0) throw new NightError("not_pending");
}

// ---------- Admin side ----------

export const partnerVenueSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(3).max(120),
  kitchenNotes: optional(z.string().trim().max(300)),
  hasBar: z.boolean().default(false),
  address: z.string().trim().min(5).max(200),
  neighborhood: z.string().trim().min(2).max(60).refine((n) => canonicalNeighborhood(n) !== null, "Pick a neighborhood from the list."),
  crossStreets: z.string().trim().min(3).max(80),
  capacity: z.coerce.number().int().min(2).max(RULES.MAX_VENUE_CAPACITY),
  lat: z.coerce.number().min(40.4).max(41).optional().or(z.nan()),
  lng: z.coerce.number().min(-74.3).max(-73.6).optional().or(z.nan()),
});
export type PartnerVenueInput = z.infer<typeof partnerVenueSchema>;

/** A room Covers has booked. No owner: it belongs to Covers, and chefs reach it through open nights. */
export async function createPartnerVenue(db: Db, input: PartnerVenueInput) {
  const neighborhood = canonicalNeighborhood(input.neighborhood)!;
  const borough = boroughOf(neighborhood)!;
  const fallback = BOROUGH_CENTROIDS[borough];
  return db.venue.create({
    data: {
      ownerUserId: null,
      type: "PARTNER_VENUE",
      name: input.name,
      description: input.description,
      kitchenNotes: input.kitchenNotes || null,
      hasBar: input.hasBar,
      address: input.address,
      neighborhood,
      borough,
      crossStreets: input.crossStreets,
      lat: roundCoord(Number.isFinite(input.lat) ? (input.lat as number) : fallback.lat),
      lng: roundCoord(Number.isFinite(input.lng) ? (input.lng as number) : fallback.lng),
      capacity: input.capacity,
    },
  });
}

export const openNightSchema = z
  .object({
    venueId: z.string().min(1, "Pick a room."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    durationMin: z.coerce.number().int().min(60).max(600),
    minSeats: z.coerce.number().int().min(1).max(RULES.MAX_VENUE_CAPACITY),
    maxSeats: z.coerce.number().int().min(1).max(RULES.MAX_VENUE_CAPACITY),
    venueSharePct: z.coerce.number().int().min(0).max(100),
    venueFeeDollars: z.coerce.number().min(0).max(100_000),
    terms: optional(z.string().trim().max(200)),
    suggestedPriceDollars: z.coerce.number().min(0).max(1000).optional(),
    crew: optional(z.string().trim().max(120)),
  })
  .refine((n) => n.minSeats <= n.maxSeats, { message: "The minimum can't be above the maximum.", path: ["minSeats"] });
export type OpenNightInput = z.infer<typeof openNightSchema>;

export async function createOpenNight(db: Db, input: OpenNightInput, now = new Date()) {
  const venue = await db.venue.findUnique({ where: { id: input.venueId }, select: { id: true, type: true, capacity: true } });
  if (!venue) throw new NightError("not_found", "That room doesn't exist.");
  if (venue.type !== "PARTNER_VENUE") throw new NightError("not_partner");
  if (input.maxSeats > venue.capacity) throw new NightError("over_capacity", `The room seats ${venue.capacity}.`);
  const startsAt = zonedToUtc(input.date, input.time);
  if (startsAt <= now) throw new NightError("in_past");
  return db.openNight.create({
    data: {
      venueId: venue.id,
      startsAt,
      durationMin: input.durationMin,
      minSeats: input.minSeats,
      maxSeats: input.maxSeats,
      venueSharePct: input.venueSharePct,
      venueFeeCents: Math.round(input.venueFeeDollars * 100),
      terms: input.terms || null,
      suggestedPriceCents: input.suggestedPriceDollars === undefined ? null : Math.round(input.suggestedPriceDollars * 100),
      crew: input.crew || null,
    },
  });
}

export const ANOTHER_CHEF_NOTE = "Another chef got this night. Pitch another one on the board.";
export const NIGHT_CANCELLED_NOTE = "The venue night was cancelled.";

/** Lock the night a pitch belongs to and return the pitch, or throw. */
async function lockPitchNight(tx: Prisma.TransactionClient, pitchId: string) {
  const ref = await tx.nightPitch.findUnique({ where: { id: pitchId }, select: { openNightId: true } });
  if (!ref) throw new NightError("not_found", "That pitch doesn't exist.");
  await tx.$queryRaw`SELECT id FROM open_nights WHERE id = ${ref.openNightId} FOR UPDATE`;
  const pitch = await tx.nightPitch.findUnique({
    where: { id: pitchId },
    include: {
      chef: { select: { id: true, status: true, cuisines: { select: { id: true } } } },
      openNight: { include: { venue: { select: { id: true, borough: true, hasBar: true } } } },
    },
  });
  return pitch!;
}

/**
 * Approve one pitch: the night is taken, the chef gets a draft dinner in the
 * room (night's date, time and seat floor; the pitch's title, price and
 * seats; the night's crew as credits), and every other pending pitch for the
 * night is declined. Returns the new dinner and the pitches to notify.
 */
export async function approvePitch(db: Db, pitchId: string, note?: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const pitch = await lockPitchNight(tx, pitchId);
    const night = pitch.openNight;
    if (pitch.status !== "PENDING") throw new NightError("not_pending");
    if (night.status !== "OPEN") throw new NightError("night_closed");
    if (!isPitchable(night, now)) throw new NightError("too_late");
    if (pitch.chef.status !== "APPROVED") throw new NightError("not_chef", "That chef isn't approved to host right now.");

    const event = await tx.event.create({
      data: {
        chefId: pitch.chef.id,
        venueId: night.venue.id,
        openNightId: night.id,
        format: "ROOM",
        title: pitch.title,
        description: pitch.pitch,
        startsAt: night.startsAt,
        durationMin: night.durationMin,
        priceCents: pitch.priceCents,
        minGuests: Math.min(night.minSeats, pitch.maxGuests),
        maxGuests: pitch.maxGuests,
        allowedBookingTypes: ["SEAT", "GROUP", "BUYOUT"],
        goNoGoAt: new Date(night.startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR),
        borough: night.venue.borough,
        byob: !night.venue.hasBar,
        credits: night.crew,
        status: "DRAFT",
        cuisines: { connect: pitch.chef.cuisines.map((c) => ({ id: c.id })) },
      },
      select: { id: true },
    });
    await tx.openNight.update({ where: { id: night.id }, data: { status: "TAKEN" } });
    await tx.nightPitch.update({ where: { id: pitch.id }, data: { status: "APPROVED", decidedAt: now, decisionNote: note?.trim() || null } });
    const others = await tx.nightPitch.findMany({ where: { openNightId: night.id, status: "PENDING", id: { not: pitch.id } }, select: { id: true } });
    if (others.length) {
      await tx.nightPitch.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { status: "DECLINED", decidedAt: now, decisionNote: ANOTHER_CHEF_NOTE } });
    }
    return { eventId: event.id, declinedPitchIds: others.map((o) => o.id) };
  });
}

export async function declinePitch(db: Db, pitchId: string, note?: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const pitch = await lockPitchNight(tx, pitchId);
    if (pitch.status !== "PENDING") throw new NightError("not_pending");
    await tx.nightPitch.update({ where: { id: pitch.id }, data: { status: "DECLINED", decidedAt: now, decisionNote: note?.trim() || null } });
  });
}

/** Take an open night off the board; pending pitches are declined so their chefs hear. */
export async function cancelOpenNight(db: Db, nightId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM open_nights WHERE id = ${nightId} FOR UPDATE`;
    const night = await tx.openNight.findUnique({ where: { id: nightId }, select: { id: true, status: true } });
    if (!night) throw new NightError("not_found");
    if (night.status !== "OPEN") throw new NightError("night_closed", "Only open nights can be cancelled here; a booked night is cancelled from its dinner.");
    await tx.openNight.update({ where: { id: night.id }, data: { status: "CANCELLED" } });
    const pending = await tx.nightPitch.findMany({ where: { openNightId: night.id, status: "PENDING" }, select: { id: true } });
    if (pending.length) {
      await tx.nightPitch.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: "DECLINED", decidedAt: now, decisionNote: NIGHT_CANCELLED_NOTE } });
    }
    return { declinedPitchIds: pending.map((p) => p.id) };
  });
}
