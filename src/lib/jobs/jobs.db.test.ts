/* Postgres-backed: needs TEST_DATABASE_URL (migrated). Skipped otherwise. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BookingStatus, EventStatus } from "@/generated/prisma/enums";
import { createPrismaClient, type Db } from "@/lib/db";
import { MemoryTransport, createMailer, type Mailer } from "@/lib/email/mailer";
import { RULES } from "@/lib/bookings/rules";
import { runJobs } from "./run-jobs";
import { UNDER_MINIMUM_REASON } from "./go-no-go";
import { EXPIRY_NOTE } from "./expire-requests";
import { ENDED_UNPAID_NOTE } from "./close-events";

const url = process.env.TEST_DATABASE_URL;
const HOUR = 3600 * 1000;
const ADDRESS = "742 Evergreen Terrace, Apt 3";

describe.skipIf(!url)("scheduled jobs against Postgres", () => {
  let db: Db;
  let mailer: Mailer;
  let transport: MemoryTransport;
  const tag = `jobs-${Date.now()}`;
  const now = new Date();
  const at = (hours: number) => new Date(now.getTime() + hours * HOUR);
  const chefEmail = `${tag}-chef@example.test`;
  const guestEmail = (n: number) => `${tag}-guest${n}@example.test`;
  let chefId: string;
  let venueId: string;
  const guests: Record<number, string> = {};
  const events: Record<string, string> = {};
  const bookings: Record<string, string> = {};

  async function makeEvent(key: string, o: { startsAt: Date; status?: EventStatus; min?: number; max?: number; goNoGoAt?: Date; goNoGoCheckedAt?: Date | null }) {
    const e = await db.event.create({
      data: {
        chefId, venueId, title: `${key} dinner`, startsAt: o.startsAt, durationMin: 150, priceCents: 5500,
        minGuests: o.min ?? 4, maxGuests: o.max ?? 8, allowedBookingTypes: ["SEAT", "GROUP"],
        goNoGoAt: o.goNoGoAt ?? new Date(o.startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR), goNoGoCheckedAt: o.goNoGoCheckedAt ?? null,
        status: o.status ?? "PUBLISHED", mode: "OPEN", borough: "QUEENS",
      },
    });
    events[key] = e.id;
    return e;
  }
  async function makeBooking(key: string, eventKey: string, guest: number, status: BookingStatus, o: { createdAt?: Date; size?: number; reviewRequestedAt?: Date } = {}) {
    const b = await db.booking.create({
      data: {
        eventId: events[eventKey], guestUserId: guests[guest], type: (o.size ?? 1) > 1 ? "GROUP" : "SEAT", partySize: o.size ?? 1,
        amountCents: 5500 * (o.size ?? 1), status, createdAt: o.createdAt ?? at(-1), reviewRequestedAt: o.reviewRequestedAt ?? null,
        paidMarkedAt: status === "CONFIRMED" || status === "ATTENDED" ? at(-1) : null,
      },
    });
    bookings[key] = b.id;
    return b;
  }

  beforeAll(async () => {
    db = createPrismaClient(url);
    transport = new MemoryTransport();
    mailer = createMailer(transport, "Chef-bnb <test@example.test>");
    const chefUser = await db.user.create({ data: { email: chefEmail, name: "Casa Wong", roles: ["GUEST", "CHEF"] } });
    chefId = (await db.chefProfile.create({ data: { userId: chefUser.id, displayName: "Casa Wong", slug: tag, bio: "x", status: "APPROVED", paymentHandle: "@casa" } })).id;
    venueId = (await db.venue.create({ data: { ownerUserId: chefUser.id, address: ADDRESS, neighborhood: "Flushing", borough: "QUEENS", crossStreets: "Main St & Roosevelt Ave", lat: 40.76, lng: -73.83, capacity: 10 } })).id;
    for (let n = 1; n <= 10; n++) guests[n] = (await db.user.create({ data: { email: guestEmail(n), name: `Guest ${n}` } })).id;

    // Expiry: one stale request, one fresh.
    await makeEvent("expire", { startsAt: at(24 * 7) });
    await makeBooking("stale", "expire", 1, "REQUESTED", { createdAt: at(-(RULES.REQUEST_EXPIRY_HOURS + 1)) });
    await makeBooking("fresh", "expire", 2, "REQUESTED", { createdAt: at(-1) });
    // Go/no-go: cutoff passed, 2 confirmed of min 4 → cancel (one paid, one unpaid booking).
    await makeEvent("under", { startsAt: at(48), goNoGoAt: at(-1), min: 4 });
    await makeBooking("under-paid", "under", 3, "CONFIRMED", { size: 2 });
    await makeBooking("under-unpaid", "under", 4, "REQUESTED");
    // Go/no-go: cutoff passed, 2 confirmed of min 2 → runs; and it's inside the 48 h window, so the address goes out.
    await makeEvent("ok", { startsAt: at(40), goNoGoAt: at(-1), min: 2 });
    await makeBooking("ok-paid", "ok", 5, "CONFIRMED", { size: 2 });
    // Far out: nothing is due.
    await makeEvent("far", { startsAt: at(24 * 5) });
    await makeBooking("far-paid", "far", 6, "CONFIRMED");
    // Finished 4 h ago: close it, expire the unpaid request, ask the chef to mark attendance.
    await makeEvent("done", { startsAt: at(-4), goNoGoCheckedAt: at(-76) });
    await makeBooking("done-paid", "done", 7, "CONFIRMED");
    await makeBooking("done-unpaid", "done", 8, "REQUESTED", { createdAt: at(-2) });
    // Attended guests: one still to be asked for a review, one already asked.
    await makeEvent("reviewed", { startsAt: at(-72), status: "COMPLETED", goNoGoCheckedAt: at(-150) });
    await makeBooking("ask", "reviewed", 9, "ATTENDED");
    await makeBooking("asked", "reviewed", 10, "ATTENDED", { reviewRequestedAt: at(-60) });
  });

  afterAll(async () => {
    await db.event.deleteMany({ where: { chefId } });
    await db.user.deleteMany({ where: { email: { startsWith: `${tag}-` } } });
    await db.$disconnect();
  });

  const booking = (key: string) => db.booking.findUniqueOrThrow({ where: { id: bookings[key] }, include: { logs: true } });
  const event = (key: string) => db.event.findUniqueOrThrow({ where: { id: events[key] } });

  it("one run does every due thing exactly once", async () => {
    const report = await runJobs(db, mailer, now);
    expect(report.jobs.expireRequests).toEqual({ processed: 1, emails: 1, errors: [] });
    expect(report.jobs.goNoGo).toEqual({ processed: 2, emails: 3, errors: [] });
    expect(report.jobs.revealAddresses).toEqual({ processed: 1, emails: 1, errors: [] });
    expect(report.jobs.closeEvents).toEqual({ processed: 1, emails: 2, errors: [] });
    expect(report.jobs.requestReviews).toEqual({ processed: 1, emails: 1, errors: [] });
    expect(transport.sent).toHaveLength(8);
  });

  it("expired the stale request only, by the system, with a log row", async () => {
    const stale = await booking("stale");
    expect(stale.status).toBe("EXPIRED");
    const log = stale.logs.filter((l) => l.toStatus === "EXPIRED");
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ fromStatus: "REQUESTED", actorUserId: null, note: EXPIRY_NOTE });
    expect((await booking("fresh")).status).toBe("REQUESTED");
    expect(transport.to(guestEmail(1)).map((e) => e.subject)).toEqual([expect.stringMatching(/expired/)]);
    expect(transport.to(guestEmail(2))).toHaveLength(0);
  });

  it("cancelled the under-minimum dinner and its bookings, and told everyone", async () => {
    const under = await event("under");
    expect(under).toMatchObject({ status: "CANCELLED", mode: "UNSOLD", cancelReason: UNDER_MINIMUM_REASON });
    expect(under.goNoGoCheckedAt).toEqual(now);
    for (const key of ["under-paid", "under-unpaid"]) {
      const b = await booking(key);
      expect(b.status).toBe("CANCELLED");
      expect(b.logs.filter((l) => l.toStatus === "CANCELLED")).toHaveLength(1);
    }
    expect(transport.to(guestEmail(3))[0].text).toMatch(/refund you in full/);
    expect(transport.to(guestEmail(4))[0].text).toMatch(/hadn.t paid yet/);
    const chef = transport.to(chefEmail);
    expect(chef.map((e) => e.subject)).toEqual([expect.stringMatching(/^Cancelled: under dinner/), expect.stringMatching(/^Who came to done dinner/)]);
  });

  it("let the dinner that met its minimum run, and sent its guest the address", async () => {
    const ok = await event("ok");
    expect(ok.status).toBe("PUBLISHED");
    expect(ok.goNoGoCheckedAt).toEqual(now);
    expect((await booking("ok-paid")).addressSentAt).toEqual(now);
    const [email] = transport.to(guestEmail(5));
    expect(email.subject).toMatch(/^Where to go/);
    expect(email.text).toContain(ADDRESS);
  });

  it("left the far-off dinner alone and kept its address private", async () => {
    expect((await event("far")).goNoGoCheckedAt).toBeNull();
    expect((await booking("far-paid")).addressSentAt).toBeNull();
    expect(transport.to(guestEmail(6))).toHaveLength(0);
    const leaked = transport.sent.filter((e) => e.text.includes(ADDRESS) || e.html.includes(ADDRESS));
    expect(leaked.map((e) => e.to)).toEqual([guestEmail(5)]);
  });

  it("closed the finished dinner, expired its unpaid request, and asked the chef to mark attendance", async () => {
    const done = await event("done");
    expect(done.status).toBe("COMPLETED");
    expect(done.completedAt).toEqual(now);
    expect((await booking("done-paid")).status).toBe("CONFIRMED");
    const unpaid = await booking("done-unpaid");
    expect(unpaid.status).toBe("EXPIRED");
    expect(unpaid.logs.find((l) => l.toStatus === "EXPIRED")).toMatchObject({ actorUserId: null, note: ENDED_UNPAID_NOTE });
    expect(transport.to(guestEmail(8))[0].text).toMatch(/already happened/);
  });

  it("asked the attended guest for a review once", async () => {
    expect((await booking("ask")).reviewRequestedAt).toEqual(now);
    expect(transport.to(guestEmail(9)).map((e) => e.subject)).toEqual(["How was reviewed dinner?"]);
    expect(transport.to(guestEmail(10))).toHaveLength(0);
  });

  it("a second run changes nothing and sends nothing", async () => {
    const before = transport.sent.length;
    const report = await runJobs(db, mailer, new Date(now.getTime() + 60_000));
    for (const [name, r] of Object.entries(report.jobs)) if (name !== "pruneRateLimits") expect(r).toEqual({ processed: 0, emails: 0, errors: [] });
    expect(report.jobs.pruneRateLimits.errors).toEqual([]);
    expect(transport.sent).toHaveLength(before);
    const logs = await db.bookingLog.count({ where: { booking: { eventId: { in: Object.values(events) } } } });
    expect(logs).toBe(4); // stale→expired, 2× under→cancelled, done-unpaid→expired; none from the second pass
  });
});
