import type { Db } from "@/lib/db";
import type { Booking } from "@/generated/prisma/client";
import type { BookingType, EventMode, EventStatus } from "@/generated/prisma/enums";
import { RULES, decideSeatRequest, type DeclineCode } from "./rules";

export class BookingError extends Error {
  constructor(
    public readonly code: DeclineCode | "event_not_found" | "already_requested" | "too_many_requests",
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export type RequestSeatsInput = {
  eventId: string;
  guestUserId: string;
  type: BookingType;
  partySize: number;
  dietaryNotes?: string | null;
};

type LockedEventRow = {
  id: string;
  status: EventStatus;
  mode: EventMode;
  starts_at: Date;
  min_guests: number;
  max_guests: number;
  price_cents: number;
  allowed_booking_types: BookingType[];
};

/**
 * Create a `requested` booking, holding its seats until the chef marks it paid
 * or it expires. The event row is locked (`SELECT ... FOR UPDATE`) for the whole
 * transaction, so concurrent requests for the last seats serialize and exactly
 * one wins. Every state change writes a booking_log row in the same transaction.
 */
export async function requestSeats(
  db: Db,
  input: RequestSeatsInput,
  now: Date = new Date(),
): Promise<Booking> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<LockedEventRow[]>`
      SELECT id, status, mode, starts_at, min_guests, max_guests, price_cents, allowed_booking_types
      FROM events
      WHERE id = ${input.eventId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      throw new BookingError("event_not_found", "This dinner no longer exists.");
    }

    // Abuse guards, per guest: one active booking per dinner, and a cap on
    // unpaid requests per day so seats can't be held across the site.
    const [duplicate, openRequests] = await Promise.all([
      tx.booking.count({ where: { eventId: row.id, guestUserId: input.guestUserId, status: { in: ["REQUESTED", "CONFIRMED"] } } }),
      tx.booking.count({ where: { guestUserId: input.guestUserId, status: "REQUESTED", createdAt: { gte: new Date(now.getTime() - 24 * 3600 * 1000) } } }),
    ]);
    if (duplicate > 0) {
      throw new BookingError("already_requested", "You already hold seats at this dinner; see your bookings.");
    }
    if (openRequests >= RULES.MAX_OPEN_REQUESTS_PER_DAY) {
      throw new BookingError("too_many_requests", `You can have ${RULES.MAX_OPEN_REQUESTS_PER_DAY} unpaid requests open at a time. Pay for one or cancel one first.`);
    }

    const held = await tx.booking.aggregate({
      where: { eventId: row.id, status: { in: ["REQUESTED", "CONFIRMED"] } },
      _sum: { partySize: true },
      _count: { _all: true },
    });

    const decision = decideSeatRequest(
      {
        status: row.status,
        mode: row.mode,
        startsAt: row.starts_at,
        minGuests: row.min_guests,
        maxGuests: row.max_guests,
        priceCents: row.price_cents,
        allowedBookingTypes: row.allowed_booking_types,
      },
      { activeSeats: held._sum.partySize ?? 0, activeBookings: held._count._all },
      { type: input.type, partySize: input.partySize },
      now,
    );
    if (!decision.ok) {
      throw new BookingError(decision.code, decision.message);
    }

    const booking = await tx.booking.create({
      data: {
        eventId: row.id,
        guestUserId: input.guestUserId,
        type: input.type,
        partySize: input.partySize,
        amountCents: decision.amountCents,
        status: "REQUESTED",
        dietaryNotes: input.dietaryNotes ?? null,
      },
    });
    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        fromStatus: null,
        toStatus: "REQUESTED",
        actorUserId: input.guestUserId,
      },
    });
    if (row.mode !== decision.nextMode) {
      await tx.event.update({ where: { id: row.id }, data: { mode: decision.nextMode } });
    }
    return booking;
  });
}
