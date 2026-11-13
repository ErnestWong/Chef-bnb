/**
 * Concurrency test against a real Postgres (not mocks). Runs only when
 * TEST_DATABASE_URL is set and migrated:
 *
 *   DATABASE_URL=$TEST_DATABASE_URL pnpm db:deploy
 *   TEST_DATABASE_URL=postgresql://... pnpm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/lib/db";
import { BookingError, requestSeats } from "./request-seats";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("requestSeats against Postgres", () => {
  let db: Db;
  const tag = `t${Date.now().toString(36)}`;
  let chefUserId: string;
  let chefId: string;
  let venueId: string;
  const guestIds: string[] = [];

  async function makeEvent(maxGuests: number, minGuests = 2) {
    const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    return db.event.create({
      data: {
        chefId,
        venueId,
        title: `${tag} dinner`,
        startsAt,
        durationMin: 150,
        priceCents: 7500,
        minGuests,
        maxGuests,
        allowedBookingTypes: ["SEAT", "GROUP", "BUYOUT"],
        goNoGoAt: new Date(startsAt.getTime() - 72 * 3600 * 1000),
        status: "PUBLISHED",
        borough: "BROOKLYN",
      },
    });
  }

  beforeAll(async () => {
    db = createPrismaClient(url);
    const chefUser = await db.user.create({
      data: { email: `${tag}-chef@example.test`, name: "Test Chef", roles: ["GUEST", "CHEF"] },
    });
    chefUserId = chefUser.id;
    const chef = await db.chefProfile.create({
      data: { userId: chefUserId, displayName: "Test Chef", slug: `${tag}-chef`, bio: "test", status: "APPROVED" },
    });
    chefId = chef.id;
    const venue = await db.venue.create({
      data: {
        ownerUserId: chefUserId,
        address: "1 Test St",
        neighborhood: "Testville",
        borough: "BROOKLYN",
        crossStreets: "A & B",
        lat: 40.7,
        lng: -73.95,
        capacity: 10,
      },
    });
    venueId = venue.id;
    for (let i = 0; i < 8; i++) {
      const g = await db.user.create({ data: { email: `${tag}-guest${i}@example.test`, name: `Guest ${i}` } });
      guestIds.push(g.id);
    }
  });

  afterAll(async () => {
    // Events cascade to bookings and logs; guests can't be deleted while they
    // hold bookings (no cascade on bookings.guest_user_id, by design).
    await db.event.deleteMany({ where: { chefId } });
    await db.user.deleteMany({ where: { email: { startsWith: `${tag}-` } } });
    await db.$disconnect();
  });

  it("lets exactly the right number of parallel requests win the last seats", async () => {
    const event = await makeEvent(4);
    const results = await Promise.allSettled(
      guestIds.map((guestUserId) =>
        requestSeats(db, { eventId: event.id, guestUserId, type: "GROUP", partySize: 2 }),
      ),
    );
    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");
    expect(won).toHaveLength(2);
    expect(lost).toHaveLength(6);
    for (const r of lost) {
      expect(r.status === "rejected" && r.reason).toBeInstanceOf(BookingError);
      expect(r.status === "rejected" && r.reason.code).toBe("not_enough_seats");
    }

    const held = await db.booking.aggregate({
      where: { eventId: event.id, status: "REQUESTED" },
      _sum: { partySize: true },
    });
    expect(held._sum.partySize).toBe(4);

    const logs = await db.bookingLog.count({ where: { booking: { eventId: event.id } } });
    expect(logs).toBe(2);

    const after = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.mode).toBe("OPEN");
  });

  it("allows only one buyout and blocks seats afterwards", async () => {
    const event = await makeEvent(6, 4);
    const results = await Promise.allSettled([
      requestSeats(db, { eventId: event.id, guestUserId: guestIds[0], type: "BUYOUT", partySize: 6 }),
      requestSeats(db, { eventId: event.id, guestUserId: guestIds[1], type: "BUYOUT", partySize: 5 }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    await expect(
      requestSeats(db, { eventId: event.id, guestUserId: guestIds[2], type: "SEAT", partySize: 1 }),
    ).rejects.toMatchObject({ code: "event_bought_out" });

    const after = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.mode).toBe("BOUGHT_OUT");
  });

  it("the database rejects max_guests above 10 even if the app doesn't", async () => {
    await expect(makeEvent(11)).rejects.toThrow(/events_max_guests_cap|check constraint/i);
  });
});
