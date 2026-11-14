/** Postgres-backed; runs when TEST_DATABASE_URL is set (see request-seats.db.test.ts). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/lib/db";
import { requestSeats } from "./request-seats";
import { eventSchema, saveEvent, setEventStatus } from "@/lib/events/manage";
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
  let cuisine: { id: string };
  let otherCuisine: { id: string };

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
    cuisine = await db.cuisine.create({ data: { name: `${tag}-first`, slug: `${tag}-first` } });
    otherCuisine = await db.cuisine.create({ data: { name: `${tag}-second`, slug: `${tag}-second` } });
    guest = await db.user.create({ data: { email: `${tag}-guest@example.test` } });
    stranger = await db.user.create({ data: { email: `${tag}-stranger@example.test` } });
  });

  afterAll(async () => {
    await db.event.deleteMany({ where: { chefId } });
    await db.user.deleteMany({ where: { email: { startsWith: `${tag}-` } } });
    await db.cuisine.deleteMany({ where: { id: { in: [cuisine.id, otherCuisine.id] } } });
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

  function eventInput() {
    return eventSchema.parse({
      title: "Cuisine dinner", date: "2099-12-06", time: "19:00", durationMin: 120,
      priceDollars: 50, minGuests: 2, maxGuests: 6, venueId,
      allowedBookingTypes: ["SEAT", "GROUP", "BUYOUT"], cuisineIds: [cuisine.id], intent: "publish",
    });
  }

  it("logs a concurrent confirmation only once", async () => {
    const event = await makeEvent();
    const booking = await requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "SEAT", partySize: 1 });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => transitionBooking(db, {
      bookingId: booking.id, to: "CONFIRMED", by: { id: chefUser.id, roles: ["CHEF"] },
    })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "illegal" });
    expect(await db.bookingLog.count({ where: { bookingId: booking.id, toStatus: "CONFIRMED" } })).toBe(1);
  });

  it("cancellation racing seat requests leaves no active bookings", async () => {
    const event = await makeEvent();
    const results = await Promise.allSettled([
      ...Array.from({ length: 4 }, () => requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "SEAT", partySize: 1 })),
      setEventStatus(db, chefUser.id, event.id, "CANCELLED"),
      requestSeats(db, { eventId: event.id, guestUserId: stranger.id, type: "SEAT", partySize: 1 }),
    ]);
    expect(results[4].status).toBe("fulfilled");
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "event_not_open" });
    const bookings = await db.booking.findMany({ where: { eventId: event.id }, include: { logs: true } });
    for (const b of bookings) {
      expect(b.status).toBe("CANCELLED");
      expect(b.logs.filter((l) => l.toStatus === "CANCELLED")).toHaveLength(1);
    }
    expect(await db.event.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({ status: "CANCELLED", mode: "UNSOLD" });
  });

  it("a confirmation racing event cancellation cannot revive a cancelled booking", async () => {
    const event = await makeEvent();
    const booking = await requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "SEAT", partySize: 1 });
    const results = await Promise.allSettled([
      setEventStatus(db, chefUser.id, event.id, "CANCELLED"),
      transitionBooking(db, { bookingId: booking.id, to: "CONFIRMED", by: { id: chefUser.id, roles: ["CHEF"] } }),
    ]);
    expect(results[0].status).toBe("fulfilled");
    if (results[1].status === "rejected") expect(results[1].reason).toMatchObject({ code: "illegal" });
    expect(await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).toMatchObject({ status: "CANCELLED" });
    const cancellation = await db.bookingLog.findMany({ where: { bookingId: booking.id, toStatus: "CANCELLED" } });
    expect(cancellation).toHaveLength(1);
    expect(cancellation[0].fromStatus).toBe(results[1].status === "fulfilled" ? "CONFIRMED" : "REQUESTED");
  });

  it("capacity edits racing requests cannot oversell", async () => {
    const input = eventInput();
    const event = await saveEvent(db, chefUser.id, input);
    const results = await Promise.allSettled([
      requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "GROUP", partySize: 5 }),
      saveEvent(db, chefUser.id, { ...input, maxGuests: 2 }, event.id),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const after = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    const held = await db.booking.aggregate({ where: { eventId: event.id, status: { in: ["REQUESTED", "CONFIRMED"] } }, _sum: { partySize: true } });
    expect(held._sum.partySize ?? 0).toBeLessThanOrEqual(after.maxGuests);
    for (const r of results) if (r.status === "rejected") expect(["locked", "not_enough_seats"]).toContain(r.reason.code);
  });

  it("unpublishing racing requests cannot hide a held booking", async () => {
    const event = await makeEvent();
    const results = await Promise.allSettled([
      requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "SEAT", partySize: 1 }),
      setEventStatus(db, chefUser.id, event.id, "DRAFT"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) if (r.status === "rejected") expect(["locked", "event_not_open"]).toContain(r.reason.code);
  });

  it("persists cuisine tags for discovery and replaces them on edit", async () => {
    const input = eventInput();
    const event = await saveEvent(db, chefUser.id, input);
    expect(await db.event.count({ where: { id: event.id, status: "PUBLISHED", cuisines: { some: { id: cuisine.id } } } })).toBe(1);
    await saveEvent(db, chefUser.id, { ...input, cuisineIds: [otherCuisine.id] }, event.id);
    const after = await db.event.findUniqueOrThrow({ where: { id: event.id }, include: { cuisines: true } });
    expect(after.cuisines.map((c) => c.id)).toEqual([otherCuisine.id]);
  });

  it("locks minimum headcount once seats are held", async () => {
    const input = eventInput();
    const event = await saveEvent(db, chefUser.id, input);
    await requestSeats(db, { eventId: event.id, guestUserId: guest.id, type: "SEAT", partySize: 1 });
    await expect(saveEvent(db, chefUser.id, { ...input, minGuests: 5 }, event.id)).rejects.toMatchObject({ code: "locked" });
  });

  it("does not reopen cancelled events or publish a past draft", async () => {
    const input = eventInput();
    const event = await saveEvent(db, chefUser.id, input);
    await setEventStatus(db, chefUser.id, event.id, "CANCELLED");
    await expect(setEventStatus(db, chefUser.id, event.id, "PUBLISHED")).rejects.toMatchObject({ code: "closed" });
    await expect(saveEvent(db, chefUser.id, input, event.id)).rejects.toMatchObject({ code: "closed" });
    const past = await makeEvent(new Date(Date.now() - 3600_000));
    await db.event.update({ where: { id: past.id }, data: { status: "DRAFT" } });
    await expect(setEventStatus(db, chefUser.id, past.id, "PUBLISHED")).rejects.toMatchObject({ code: "in_past" });
  });

});
