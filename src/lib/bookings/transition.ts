import type { Db } from "@/lib/db";
import type { Booking, Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { actorFor, type Principal } from "./actors";
import { ACTIVE_STATUSES, canTransition, type Actor } from "./transitions";

export class TransitionError extends Error {
  constructor(
    public readonly code: "not_found" | "forbidden" | "illegal" | "too_early" | "too_late",
    message: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

export type TransitionInput = {
  bookingId: string;
  to: BookingStatus;
  by: Principal;
  note?: string;
};

type Tx = Prisma.TransactionClient;

/** Lock the booking's event row first; every decision below reads state taken after the lock. */
async function lockBookingEvent(tx: Tx, bookingId: string) {
  const parent = await tx.booking.findUnique({ where: { id: bookingId }, select: { eventId: true } });
  if (!parent) return null;
  await tx.$queryRaw`SELECT id FROM events WHERE id = ${parent.eventId} FOR UPDATE`;
  return tx.booking.findUnique({
    where: { id: bookingId },
    include: { event: { select: { id: true, startsAt: true, chef: { select: { userId: true } } } } },
  });
}

/**
 * Write the transition: booking row, booking_log row, and the event back to
 * UNSOLD when its last active booking goes away (so a buyout is possible again).
 * Caller holds the event lock and has already checked the state machine.
 */
export async function applyTransition(
  tx: Tx,
  booking: { id: string; status: BookingStatus; eventId: string },
  to: BookingStatus,
  opts: { actorUserId: string | null; note?: string | null; now: Date },
): Promise<Booking> {
  const updated = await tx.booking.update({
    where: { id: booking.id },
    data: {
      status: to,
      ...(to === "CONFIRMED" ? { paidMarkedAt: opts.now } : {}),
      ...(to === "CANCELLED" ? { cancelledAt: opts.now } : {}),
    },
  });
  await tx.bookingLog.create({
    data: {
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus: to,
      actorUserId: opts.actorUserId,
      note: opts.note ?? null,
      at: opts.now,
    },
  });

  const wasActive = (ACTIVE_STATUSES as readonly string[]).includes(booking.status);
  const isActive = (ACTIVE_STATUSES as readonly string[]).includes(to);
  if (wasActive && !isActive) {
    const remaining = await tx.booking.count({
      where: { eventId: booking.eventId, status: { in: [...ACTIVE_STATUSES] } },
    });
    if (remaining === 0) {
      await tx.event.update({ where: { id: booking.eventId }, data: { mode: "UNSOLD" } });
    }
  }
  return updated;
}

/**
 * Move a booking through the state machine on behalf of a signed-in user.
 * Locks the event row so capacity-affecting changes serialize with new
 * requests, writes booking_log in the same transaction, and resets the event
 * to UNSOLD when its last active booking goes away. Time rules: attendance
 * only after the dinner starts; cancellation only before.
 */
export async function transitionBooking(db: Db, input: TransitionInput, now = new Date()): Promise<Booking> {
  return db.$transaction(async (tx) => {
    const booking = await lockBookingEvent(tx, input.bookingId);
    if (!booking) throw new TransitionError("not_found", "Booking not found.");

    const actor = actorFor(input.by, booking, { chefUserId: booking.event.chef.userId });
    if (!actor) throw new TransitionError("forbidden", "You can't change this booking.");
    if (!canTransition(booking.status, input.to, actor)) {
      throw new TransitionError("illegal", `A ${booking.status.toLowerCase()} booking can't be marked ${input.to.toLowerCase()} by the ${actor}.`);
    }
    const started = booking.event.startsAt <= now;
    if ((input.to === "ATTENDED" || input.to === "NO_SHOW") && !started) {
      throw new TransitionError("too_early", "Attendance can be marked once the dinner has started.");
    }
    if (input.to === "CANCELLED" && started && actor !== "admin") {
      throw new TransitionError("too_late", "This dinner has already started.");
    }

    return applyTransition(tx, booking, input.to, { actorUserId: input.by.id, note: input.note, now });
  });
}

export type SystemTransitionInput = {
  bookingId: string;
  to: BookingStatus;
  note: string;
};

/**
 * A state change made by the scheduled jobs (actor "system", no user). Returns
 * null instead of throwing when the booking is no longer in a state the system
 * may move from, so re-running a job is a no-op rather than an error.
 */
export async function systemTransition(db: Db, input: SystemTransitionInput, now = new Date()): Promise<Booking | null> {
  const actor: Actor = "system";
  return db.$transaction(async (tx) => {
    const booking = await lockBookingEvent(tx, input.bookingId);
    if (!booking) return null;
    if (!canTransition(booking.status, input.to, actor)) return null;
    return applyTransition(tx, booking, input.to, { actorUserId: null, note: input.note, now });
  });
}
