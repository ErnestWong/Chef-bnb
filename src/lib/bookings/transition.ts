import type { Db } from "@/lib/db";
import type { Booking } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { actorFor, type Principal } from "./actors";
import { ACTIVE_STATUSES, canTransition } from "./transitions";

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

/**
 * Move a booking through the state machine on behalf of a signed-in user.
 * Locks the event row so capacity-affecting changes serialize with new
 * requests, writes booking_log in the same transaction, and resets the event
 * to UNSOLD when its last active booking goes away (so a buyout is possible
 * again). Time rules: attendance only after the dinner starts; cancellation
 * only before.
 */
export async function transitionBooking(db: Db, input: TransitionInput, now = new Date()): Promise<Booking> {
  return db.$transaction(async (tx) => {
    // Resolve only the immutable parent ID before locking. All decisions must
    // use state read after the lock, including competing booking transitions.
    const parent = await tx.booking.findUnique({ where: { id: input.bookingId }, select: { eventId: true } });
    if (!parent) throw new TransitionError("not_found", "Booking not found.");
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${parent.eventId} FOR UPDATE`;

    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { event: { select: { id: true, startsAt: true, chef: { select: { userId: true } } } } },
    });
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

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: input.to,
        ...(input.to === "CONFIRMED" ? { paidMarkedAt: now } : {}),
        ...(input.to === "CANCELLED" ? { cancelledAt: now } : {}),
      },
    });
    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: input.to,
        actorUserId: input.by.id,
        note: input.note ?? null,
        at: now,
      },
    });

    const wasActive = (ACTIVE_STATUSES as readonly string[]).includes(booking.status);
    const isActive = (ACTIVE_STATUSES as readonly string[]).includes(input.to);
    if (wasActive && !isActive) {
      const remaining = await tx.booking.count({
        where: { eventId: booking.event.id, status: { in: [...ACTIVE_STATUSES] } },
      });
      if (remaining === 0) {
        await tx.event.update({ where: { id: booking.event.id }, data: { mode: "UNSOLD" } });
      }
    }
    return updated;
  });
}
