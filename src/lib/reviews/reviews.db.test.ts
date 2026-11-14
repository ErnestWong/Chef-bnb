/* Postgres-backed: needs TEST_DATABASE_URL (migrated). Skipped otherwise. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/lib/db";
import { RULES } from "@/lib/bookings/rules";
import { createReview, removeReview } from "./reviews";

const url = process.env.TEST_DATABASE_URL;
const DAY = 24 * 3600 * 1000;

describe.skipIf(!url)("reviews against Postgres", () => {
  let db: Db;
  const tag = `rev-${Date.now()}`;
  let chefId: string;
  let venueId: string;
  let guest: { id: string };
  let other: { id: string };

  async function makeBooking(status: "ATTENDED" | "CONFIRMED", daysAgo: number, guestId = guest.id) {
    const startsAt = new Date(Date.now() - daysAgo * DAY);
    const event = await db.event.create({
      data: { chefId, venueId, title: `${tag} dinner`, startsAt, durationMin: 150, priceCents: 5000, minGuests: 2, maxGuests: 8, allowedBookingTypes: ["SEAT"], goNoGoAt: startsAt, status: "COMPLETED", mode: "OPEN", borough: "QUEENS" },
    });
    return db.booking.create({ data: { eventId: event.id, guestUserId: guestId, type: "SEAT", partySize: 1, amountCents: 5000, status } });
  }

  beforeAll(async () => {
    db = createPrismaClient(url);
    const chefUser = await db.user.create({ data: { email: `${tag}-chef@example.test`, roles: ["GUEST", "CHEF"] } });
    chefId = (await db.chefProfile.create({ data: { userId: chefUser.id, displayName: "Rev Chef", slug: tag, bio: "x", status: "APPROVED" } })).id;
    venueId = (await db.venue.create({ data: { ownerUserId: chefUser.id, address: "1 St", neighborhood: "N", borough: "QUEENS", crossStreets: "A & B", lat: 40.7, lng: -73.9, capacity: 10 } })).id;
    guest = await db.user.create({ data: { email: `${tag}-guest@example.test` } });
    other = await db.user.create({ data: { email: `${tag}-other@example.test` } });
  });

  afterAll(async () => {
    await db.event.deleteMany({ where: { chefId } });
    await db.user.deleteMany({ where: { email: { startsWith: `${tag}-` } } });
    await db.$disconnect();
  });

  const average = async () => (await db.review.aggregate({ where: { chefId, removedAt: null }, _avg: { rating: true }, _count: { _all: true } }));

  it("an attended guest reviews once and the chef's average moves", async () => {
    const b = await makeBooking("ATTENDED", 3);
    const review = await createReview(db, guest.id, { bookingId: b.id, rating: 4, body: "Warm host." });
    expect(review).toMatchObject({ chefId, eventId: b.eventId, authorId: guest.id, rating: 4, body: "Warm host.", removedAt: null });
    expect(await average()).toMatchObject({ _avg: { rating: 4 }, _count: { _all: 1 } });
    await expect(createReview(db, guest.id, { bookingId: b.id, rating: 5 })).rejects.toMatchObject({ code: "already_reviewed" });
    const b2 = await makeBooking("ATTENDED", 5);
    await createReview(db, guest.id, { bookingId: b2.id, rating: 2 });
    expect((await average())._avg.rating).toBe(3);
  });

  it("refuses the wrong guest, unattended bookings, and the closed window", async () => {
    const b = await makeBooking("ATTENDED", 3);
    await expect(createReview(db, other.id, { bookingId: b.id, rating: 5 })).rejects.toMatchObject({ code: "not_yours" });
    const c = await makeBooking("CONFIRMED", 3);
    await expect(createReview(db, guest.id, { bookingId: c.id, rating: 5 })).rejects.toMatchObject({ code: "not_attended" });
    const old = await makeBooking("ATTENDED", RULES.REVIEW_WINDOW_DAYS + 2);
    await expect(createReview(db, guest.id, { bookingId: old.id, rating: 5 })).rejects.toMatchObject({ code: "window_closed" });
    await expect(createReview(db, guest.id, { bookingId: "nope", rating: 5 })).rejects.toMatchObject({ code: "not_found" });
  });

  it("concurrent submissions for one booking produce one review", async () => {
    const b = await makeBooking("ATTENDED", 1);
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => createReview(db, guest.id, { bookingId: b.id, rating: 5 })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) if (r.status === "rejected") expect(r.reason).toMatchObject({ code: "already_reviewed" });
    expect(await db.review.count({ where: { bookingId: b.id } })).toBe(1);
  });

  it("a removed review leaves the average but keeps its row", async () => {
    const before = await average();
    const b = await makeBooking("ATTENDED", 2);
    const review = await createReview(db, guest.id, { bookingId: b.id, rating: 1 });
    expect((await average())._count._all).toBe(before._count._all + 1);
    await removeReview(db, review.id);
    expect((await average())._count._all).toBe(before._count._all);
    expect((await db.review.findUniqueOrThrow({ where: { id: review.id } })).removedAt).not.toBeNull();
  });
});
