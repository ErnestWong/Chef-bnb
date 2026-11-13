/** Postgres-backed; runs when TEST_DATABASE_URL is set (see request-seats.db.test.ts). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/lib/db";
import { requestSeats } from "./request-seats";
import { transitionBooking } from "./transition";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("transitionBooking against Postgres", () => {
  let db: Db;
  const tag = `tr${Date.now().toString(36)}`;
  let chefUser: { id: string };
  let chefId: string;
  let venueId: string;
  let guest: { id: string };
  let stranger: { id: string };

  async function makeEvent(startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)) {
    return db.event.create({
      data: {
        chefId,
        venueId,
        title: `${tag} dinner`,
        startsAt,
        durationMin: 120,
        priceCents: 5000,
        minGuests: 2,
        maxGuests: 6,
        allowedBookingTypes: ["SEAT", "GROUP", "BUYOUT"],
        goNoGoAt: new Date(startsAt.getTime() - 72 * 3600 * 1000),
        status: "PUBLISHED",
        borough: "QUEENS",
      },
    });
  }

  beforeAll(async () => {
    db = createPrismaClient(url);
    chefUser = await db.user.create({ data: { email: `${tag}-chef@example.test`, roles: ["GUEST", "CHEF"] } });
    chefId = (await db.chefProfile.create({ data: { userId: chefUser.id, displayName: "T", slug: `${tag}-chef`, bio: "t", status: "APPROVED" } })).id;
    venueId = (
      await db.venue.create({
        data: { ownerUserId: chefUser.id, address: "1 St", neighborhood: "N", borough: "QUEENS", crossStreets: "A & B", lat: 40.7, lng: -73.9, capacity: 10 },
      })
    ).id;
    guest = await db.user.create({ data: { email: `${tag}-guest@example.test` } });
    stranger = await db.user.create({ data: { email: `${tag}-stranger@example.test` } });
  });

  afterAll(async () => {
    await db.event.deleteMany({ where: { chefId } });
    await db.user.deleteMany({ where: { email: { startsWith: `${tag}-` } } });
    await db.$disconnect();
  });

  it("chef marks paid, guest cannot; strangers are forbidden; logs are written", async () => {
    const event = await makeEvent();
    const booking = await requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "SEAT", partySize: 1 });

    await expect(transitionBooking(db, { bookingId: booking.id, to: "CONFIRMED", by: { id: guest.id, roles: ["GUEST"] } })).rejects.toMatchObject({ code: "illegal" });
    await expect(transitionBooking(db, { bookingId: booking.id, to: "CANCELLED", by: { id: stranger.id, roles: ["GUEST"] } })).rejects.toMatchObject({ code: "forbidden" });

    const confirmed = await transitionBooking(db, { bookingId: booking.id, to: "CONFIRMED", by: { id: chefUser.id, roles: ["GUEST", "CHEF"] }, note: "Venmo received" });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.paidMarkedAt).not.toBeNull();

    await expect(transitionBooking(db, { bookingId: booking.id, to: "ATTENDED", by: { id: chefUser.id, roles: ["GUEST", "CHEF"] } })).rejects.toMatchObject({ code: "too_early" });

    const logs = await db.bookingLog.findMany({ where: { bookingId: booking.id }, orderBy: { at: "asc" } });
    expect(logs.map((l) => [l.fromStatus, l.toStatus])).toEqual([[null, "REQUESTED"], ["REQUESTED", "CONFIRMED"]]);
    expect(logs[1].note).toBe("Venmo received");
  });

  it("cancelling the last active booking frees the seats and resets the event to UNSOLD", async () => {
    const event = await makeEvent();
    const b = await requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "GROUP", partySize: 3 });
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).mode).toBe("OPEN");

    await transitionBooking(db, { bookingId: b.id, to: "CANCELLED", by: { id: guest.id, roles: ["GUEST"] } });
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).mode).toBe("UNSOLD");

    // A buyout is possible again.
    const buyout = await requestSeats(db, { eventId: event.id, guestUserId: stranger.id, type: "BUYOUT", partySize: 6 });
    expect(buyout.type).toBe("BUYOUT");
  });

  it("attendance can be marked after the dinner started, and is terminal", async () => {
    const past = await makeEvent(new Date(Date.now() - 3 * 3600 * 1000));
    // Create directly: requestSeats refuses started events.
    const b = await db.booking.create({ data: { eventId: past.id, guestUserId: guest.id, type: "SEAT", partySize: 1, amountCents: 5000, status: "CONFIRMED" } });
    const attended = await transitionBooking(db, { bookingId: b.id, to: "ATTENDED", by: { id: chefUser.id, roles: ["GUEST", "CHEF"] } });
    expect(attended.status).toBe("ATTENDED");
    await expect(transitionBooking(db, { bookingId: b.id, to: "CANCELLED", by: { id: chefUser.id, roles: ["GUEST", "CHEF"] } })).rejects.toMatchObject({ code: "illegal" });
  });
});
