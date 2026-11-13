import type { Db } from "@/lib/db";
import type { Booking } from "@/generated/prisma/client";
import type { BookingType, EventMode, EventStatus } from "@/generated/prisma/enums";
import { decideSeatRequest, type DeclineCode } from "./rules";

export class BookingError extends Error {
  constructor(
    public readonly code: DeclineCode | "event_not_found",
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
