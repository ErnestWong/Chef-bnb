import "server-only";
import type { Db } from "@/lib/db";
import type { CancelledBooking } from "@/lib/events/manage";
import type { Mailer } from "./mailer";
import * as T from "./templates";

/**
 * Load what each email needs and send it. These run after the transaction
 * that changed state has committed, and never throw: a mail failure is logged,
 * not surfaced to the user, because the booking change already happened.
 */

const nameOf = (u: { name: string | null; email: string }) => u.name?.trim() || u.email.split("@")[0];

async function attempt(label: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[notify] ${label} failed`, err);
    return false;
  }
}

/** To the chef: a guest requested seats. */
export function notifySeatRequested(db: Db, mailer: Mailer, bookingId: string) {
  return attempt(`seat requested ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        type: true, partySize: true, amountCents: true, dietaryNotes: true,
        guest: { select: { name: true, email: true } },
        event: { select: { id: true, title: true, startsAt: true, chef: { select: { displayName: true, user: { select: { email: true } } } } } },
      },
    });
    if (!b) return false;
    return mailer.send({
      to: b.event.chef.user.email,
      ...T.seatRequestedEmail({
        chefName: b.event.chef.displayName, guestName: nameOf(b.guest), bookingType: b.type, partySize: b.partySize, amountCents: b.amountCents,
        dietaryNotes: b.dietaryNotes, eventId: b.event.id, eventTitle: b.event.title, startsAt: b.event.startsAt,
      }),
    });
  });
}

/** To the guest: the chef marked their booking paid. */
export function notifyBookingConfirmed(db: Db, mailer: Mailer, bookingId: string) {
  return attempt(`booking confirmed ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, partySize: true, amountCents: true,
        guest: { select: { name: true, email: true } },
        event: { select: { title: true, startsAt: true, chef: { select: { displayName: true } }, venue: { select: { neighborhood: true, crossStreets: true } } } },
      },
    });
    if (!b) return false;
    return mailer.send({
      to: b.guest.email,
      ...T.bookingConfirmedEmail({
        guestName: nameOf(b.guest), chefName: b.event.chef.displayName, bookingId: b.id, eventTitle: b.event.title, startsAt: b.event.startsAt,
        partySize: b.partySize, amountCents: b.amountCents, neighborhood: b.event.venue.neighborhood, crossStreets: b.event.venue.crossStreets,
      }),
    });
  });
}

/** To the guest: their unpaid request expired. */
export function notifyRequestExpired(db: Db, mailer: Mailer, bookingId: string, now = new Date()) {
  return attempt(`request expired ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: { guest: { select: { name: true, email: true } }, event: { select: { id: true, title: true, startsAt: true, durationMin: true } } },
    });
    if (!b) return false;
    const eventOver = b.event.startsAt.getTime() + b.event.durationMin * 60_000 <= now.getTime();
    return mailer.send({
      to: b.guest.email,
      ...T.requestExpiredEmail({ guestName: nameOf(b.guest), eventId: b.event.id, eventTitle: b.event.title, startsAt: b.event.startsAt, eventOver }),
    });
  });
}

/**
 * To every guest whose booking was released, plus the chef when the system
 * cancelled (under minimum). Returns how many emails went out.
 */
export async function notifyEventCancelled(
  db: Db,
  mailer: Mailer,
  eventId: string,
  cancelled: CancelledBooking[],
  opts: { reason: string; cancelledBy: "chef" | "system" },
): Promise<number> {
  let sent = 0;
  await attempt(`event cancelled ${eventId}`, async () => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { title: true, startsAt: true, chef: { select: { displayName: true, user: { select: { name: true, email: true } } } } },
    });
    if (!event) return false;
    const wasPaid = new Map(cancelled.map((c) => [c.id, c.status === "CONFIRMED"]));
    const bookings = await db.booking.findMany({
      where: { id: { in: cancelled.map((c) => c.id) } },
      select: { id: true, amountCents: true, guest: { select: { name: true, email: true } } },
    });
    for (const b of bookings) {
      const ok = await mailer.send({
        to: b.guest.email,
        ...T.eventCancelledEmail({
          recipientName: nameOf(b.guest), recipient: "guest", chefName: event.chef.displayName, eventTitle: event.title, startsAt: event.startsAt,
          reason: opts.reason, cancelledBy: opts.cancelledBy, paidCents: wasPaid.get(b.id) ? b.amountCents : 0,
        }),
      });
      if (ok) sent++;
    }
    if (opts.cancelledBy === "system") {
      const ok = await mailer.send({
        to: event.chef.user.email,
        ...T.eventCancelledEmail({
          recipientName: event.chef.displayName, recipient: "chef", chefName: event.chef.displayName, eventTitle: event.title, startsAt: event.startsAt,
          reason: opts.reason, cancelledBy: opts.cancelledBy, bookingsCancelled: cancelled.length,
        }),
      });
      if (ok) sent++;
    }
    return true;
  });
  return sent;
}

/** To a confirmed guest: the exact address. The only place the venue address leaves the database for a guest. */
export function notifyAddressReveal(db: Db, mailer: Mailer, bookingId: string) {
  return attempt(`address reveal ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, partySize: true, dietaryNotes: true,
        guest: { select: { name: true, email: true } },
        event: {
          select: {
            title: true, startsAt: true, byobNote: true,
            chef: { select: { displayName: true } },
            // PRIVATE: address is selected here only because this booking is confirmed and inside the reveal window.
            venue: { select: { address: true, neighborhood: true, crossStreets: true } },
          },
        },
      },
    });
    if (!b) return false;
    return mailer.send({
      to: b.guest.email,
      ...T.addressRevealEmail({
        guestName: nameOf(b.guest), chefName: b.event.chef.displayName, bookingId: b.id, eventTitle: b.event.title, startsAt: b.event.startsAt,
        partySize: b.partySize, address: b.event.venue.address, neighborhood: b.event.venue.neighborhood, crossStreets: b.event.venue.crossStreets,
        byobNote: b.event.byobNote, dietaryNotes: b.dietaryNotes,
      }),
    });
  });
}

/** To an attended guest: please review the chef. */
export function notifyReviewRequest(db: Db, mailer: Mailer, bookingId: string) {
  return attempt(`review request ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, guest: { select: { name: true, email: true } }, event: { select: { title: true, startsAt: true, chef: { select: { displayName: true } } } } },
    });
    if (!b) return false;
    return mailer.send({
      to: b.guest.email,
      ...T.reviewRequestEmail({ guestName: nameOf(b.guest), chefName: b.event.chef.displayName, bookingId: b.id, eventTitle: b.event.title, startsAt: b.event.startsAt }),
    });
  });
}

/** To the applicant: approved or rejected (suspensions are not emailed). */
export function notifyChefDecision(db: Db, mailer: Mailer, profileId: string) {
  return attempt(`chef decision ${profileId}`, async () => {
    const p = await db.chefProfile.findUnique({
      where: { id: profileId },
      select: { displayName: true, status: true, reviewNote: true, user: { select: { email: true } } },
    });
    if (!p || (p.status !== "APPROVED" && p.status !== "REJECTED")) return false;
    return mailer.send({ to: p.user.email, ...T.chefApplicationDecidedEmail({ chefName: p.displayName, decision: p.status, note: p.reviewNote }) });
  });
}

/** To the chef after a dinner ends: mark attendance. */
export function notifyMarkAttendance(db: Db, mailer: Mailer, eventId: string) {
  return attempt(`mark attendance ${eventId}`, async () => {
    const e = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, title: true, startsAt: true,
        chef: { select: { displayName: true, user: { select: { email: true } } } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
    });
    if (!e) return false;
    return mailer.send({
      to: e.chef.user.email,
      ...T.markAttendanceEmail({ chefName: e.chef.displayName, eventId: e.id, eventTitle: e.title, startsAt: e.startsAt, confirmedBookings: e._count.bookings }),
    });
  });
}
