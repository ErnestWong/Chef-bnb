import "server-only";
import type { Db } from "@/lib/db";
import type { CancelledBooking } from "@/lib/events/manage";
import type { Messenger } from "@/lib/messaging";
import * as S from "@/lib/sms/texts";
import type { EmailInput } from "./mailer";
import * as T from "./templates";

/**
 * Load what each notification needs and send it. These run after the
 * transaction that changed state has committed, and never throw: a delivery
 * failure is logged, not surfaced to the user, because the booking change
 * already happened.
 *
 * Channel: a text when the person has a verified phone, else an email. Phone
 * is the sign-in for most guests, so it is the channel they actually read.
 */

export type Recipient = { name: string | null; email: string | null; phone: string | null };

const nameOf = (u: Recipient) => u.name?.trim() || u.email?.split("@")[0] || "there";

type Message = { email: Omit<EmailInput, "to">; sms: string };

/** Send one message by the recipient's channel. False when they have no contact at all (logged). */
export async function deliver(m: Messenger, to: Recipient, message: Message, prefer: "sms" | "email" = "sms"): Promise<boolean> {
  const channels = prefer === "sms" ? (["sms", "email"] as const) : (["email", "sms"] as const);
  for (const channel of channels) {
    if (channel === "sms" && to.phone) return m.sms.send({ to: to.phone, body: message.sms });
    if (channel === "email" && to.email) return m.email.send({ to: to.email, ...message.email });
  }
  console.error(`[notify] no channel for recipient ${JSON.stringify({ name: to.name })}`);
  return false;
}

async function attempt(label: string, fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[notify] ${label} failed`, err);
    return false;
  }
}

const CONTACT = { name: true, email: true, phone: true } as const;

/** To the chef: a guest requested seats. */
export function notifySeatRequested(db: Db, m: Messenger, bookingId: string) {
  return attempt(`seat requested ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        type: true, partySize: true, amountCents: true, dietaryNotes: true,
        guest: { select: CONTACT },
        event: { select: { id: true, title: true, startsAt: true, chef: { select: { displayName: true, user: { select: CONTACT } } } } },
      },
    });
    if (!b) return false;
    const p = {
      chefName: b.event.chef.displayName, guestName: nameOf(b.guest), bookingType: b.type, partySize: b.partySize, amountCents: b.amountCents,
      dietaryNotes: b.dietaryNotes, eventId: b.event.id, eventTitle: b.event.title, startsAt: b.event.startsAt,
    };
    return deliver(m, b.event.chef.user, { email: T.seatRequestedEmail(p), sms: S.seatRequestedText(p) });
  });
}

/** To the guest: the chef marked their booking paid. */
export function notifyBookingConfirmed(db: Db, m: Messenger, bookingId: string) {
  return attempt(`booking confirmed ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, partySize: true, amountCents: true,
        guest: { select: CONTACT },
        event: { select: { title: true, startsAt: true, chef: { select: { displayName: true } }, venue: { select: { neighborhood: true, crossStreets: true } } } },
      },
    });
    if (!b) return false;
    const p = {
      guestName: nameOf(b.guest), chefName: b.event.chef.displayName, bookingId: b.id, eventTitle: b.event.title, startsAt: b.event.startsAt,
      partySize: b.partySize, amountCents: b.amountCents, neighborhood: b.event.venue.neighborhood, crossStreets: b.event.venue.crossStreets,
    };
    return deliver(m, b.guest, { email: T.bookingConfirmedEmail(p), sms: S.bookingConfirmedText(p) });
  });
}

/** To the guest: their unpaid request expired. */
export function notifyRequestExpired(db: Db, m: Messenger, bookingId: string, now = new Date()) {
  return attempt(`request expired ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: { guest: { select: CONTACT }, event: { select: { id: true, title: true, startsAt: true, durationMin: true } } },
    });
    if (!b) return false;
    const eventOver = b.event.startsAt.getTime() + b.event.durationMin * 60_000 <= now.getTime();
    const p = { guestName: nameOf(b.guest), eventId: b.event.id, eventTitle: b.event.title, startsAt: b.event.startsAt, eventOver };
    return deliver(m, b.guest, { email: T.requestExpiredEmail(p), sms: S.requestExpiredText(p) });
  });
}

/**
 * To every guest whose booking was released, plus the chef when the system
 * cancelled (under minimum). Returns how many messages went out.
 */
export async function notifyEventCancelled(
  db: Db,
  m: Messenger,
  eventId: string,
  cancelled: CancelledBooking[],
  opts: { reason: string; cancelledBy: "chef" | "system" },
): Promise<number> {
  let sent = 0;
  await attempt(`event cancelled ${eventId}`, async () => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { title: true, startsAt: true, chef: { select: { displayName: true, user: { select: CONTACT } } } },
    });
    if (!event) return false;
    const wasPaid = new Map(cancelled.map((c) => [c.id, c.status === "CONFIRMED"]));
    const bookings = await db.booking.findMany({
      where: { id: { in: cancelled.map((c) => c.id) } },
      select: { id: true, amountCents: true, guest: { select: CONTACT } },
    });
    for (const b of bookings) {
      const p = {
        recipientName: nameOf(b.guest), recipient: "guest" as const, chefName: event.chef.displayName, eventTitle: event.title, startsAt: event.startsAt,
        reason: opts.reason, cancelledBy: opts.cancelledBy, paidCents: wasPaid.get(b.id) ? b.amountCents : 0,
      };
      if (await deliver(m, b.guest, { email: T.eventCancelledEmail(p), sms: S.eventCancelledText(p) })) sent++;
    }
    if (opts.cancelledBy === "system") {
      const p = {
        recipientName: event.chef.displayName, recipient: "chef" as const, chefName: event.chef.displayName, eventTitle: event.title, startsAt: event.startsAt,
        reason: opts.reason, cancelledBy: opts.cancelledBy, bookingsCancelled: cancelled.length,
      };
      if (await deliver(m, event.chef.user, { email: T.eventCancelledEmail(p), sms: S.eventCancelledText(p) })) sent++;
    }
    return true;
  });
  return sent;
}

/** To a confirmed guest: the exact address. The only place the venue address leaves the database for a guest. */
export function notifyAddressReveal(db: Db, m: Messenger, bookingId: string) {
  return attempt(`address reveal ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, partySize: true, dietaryNotes: true,
        guest: { select: CONTACT },
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
    const p = {
      guestName: nameOf(b.guest), chefName: b.event.chef.displayName, bookingId: b.id, eventTitle: b.event.title, startsAt: b.event.startsAt,
      partySize: b.partySize, address: b.event.venue.address, neighborhood: b.event.venue.neighborhood, crossStreets: b.event.venue.crossStreets,
      byobNote: b.event.byobNote, dietaryNotes: b.dietaryNotes,
    };
    return deliver(m, b.guest, { email: T.addressRevealEmail(p), sms: S.addressRevealText(p) });
  });
}

/** To an attended guest: please review the chef. */
export function notifyReviewRequest(db: Db, m: Messenger, bookingId: string) {
  return attempt(`review request ${bookingId}`, async () => {
    const b = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, guest: { select: CONTACT }, event: { select: { title: true, startsAt: true, chef: { select: { displayName: true } } } } },
    });
    if (!b) return false;
    const p = { guestName: nameOf(b.guest), chefName: b.event.chef.displayName, bookingId: b.id, eventTitle: b.event.title, startsAt: b.event.startsAt };
    return deliver(m, b.guest, { email: T.reviewRequestEmail(p), sms: S.reviewRequestText(p) });
  });
}

/** To the applicant: approved or rejected (suspensions are not sent). Email first: the note can be long. */
export function notifyChefDecision(db: Db, m: Messenger, profileId: string) {
  return attempt(`chef decision ${profileId}`, async () => {
    const p = await db.chefProfile.findUnique({
      where: { id: profileId },
      select: { displayName: true, status: true, reviewNote: true, user: { select: CONTACT } },
    });
    if (!p || (p.status !== "APPROVED" && p.status !== "REJECTED")) return false;
    const props = { chefName: p.displayName, decision: p.status, note: p.reviewNote };
    return deliver(m, p.user, { email: T.chefApplicationDecidedEmail(props), sms: S.chefApplicationDecidedText(props) }, "email");
  });
}

/** To the chef after a dinner ends: mark attendance. */
export function notifyMarkAttendance(db: Db, m: Messenger, eventId: string) {
  return attempt(`mark attendance ${eventId}`, async () => {
    const e = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, title: true, startsAt: true,
        chef: { select: { displayName: true, user: { select: CONTACT } } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
    });
    if (!e) return false;
    const p = { chefName: e.chef.displayName, eventId: e.id, eventTitle: e.title, startsAt: e.startsAt, confirmedBookings: e._count.bookings };
    return deliver(m, e.chef.user, { email: T.markAttendanceEmail(p), sms: S.markAttendanceText(p) });
  });
}
