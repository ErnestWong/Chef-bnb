/**
 * Open nights against a real Postgres: pitching, approval under the night's
 * row lock, the draft dinner it creates, and the database CHECKs that keep
 * the 10-guest cap and BYOB on HOME dinners only. Runs when TEST_DATABASE_URL
 * points at a migrated database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/lib/db";
import { EventError, saveEvent, type EventInput } from "@/lib/events/manage";
import {
  ANOTHER_CHEF_NOTE,
  NIGHT_CANCELLED_NOTE,
  NightError,
  approvePitch,
  cancelOpenNight,
  createOpenNight,
  createPartnerVenue,
  submitPitch,
  withdrawPitch,
} from "./nights";

const url = process.env.TEST_DATABASE_URL;
const DAY = 24 * 3600 * 1000;
const nyDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);

describe.skipIf(!url)("open nights against Postgres", () => {
  let db: Db;
  const tag = `n${Date.now().toString(36)}`;
  const users: Record<"a" | "b" | "c", string> = { a: "", b: "", c: "" };
  let cuisineId: string;
  let venueId: string;
  let nightId: string;
  const pitchInput = (over: Partial<Parameters<typeof submitPitch>[2]> = {}) => ({
    nightId,
    title: `${tag} Lunar New Year at the café`,
    pitch: "Eight dishes for a lucky year: whole fish, longevity noodles, a clay-pot rice for the table, and tangerines.",
    priceDollars: 95,
    maxGuests: 18,
    ...over,
  });

  beforeAll(async () => {
    db = createPrismaClient(url);
    cuisineId = (await db.cuisine.create({ data: { name: `${tag} Cantonese`, slug: `${tag}-cantonese` } })).id;
    for (const [key, status] of [["a", "APPROVED"], ["b", "APPROVED"], ["c", "APPLIED"]] as const) {
      const user = await db.user.create({ data: { email: `${tag}-${key}@example.test`, name: `Chef ${key}`, roles: ["GUEST", "CHEF"] } });
      await db.chefProfile.create({
        data: { userId: user.id, displayName: `${tag} Chef ${key}`, slug: `${tag}-${key}`, bio: "test", status, cuisines: { connect: [{ id: cuisineId }] } },
      });
      users[key] = user.id;
    }
    venueId = (
      await createPartnerVenue(db, {
        name: `${tag} Café on Fulton`,
        description: "A café after close",
        kitchenNotes: "6 burners · 2 ovens",
        hasBar: false,
        address: "1 Fulton St",
        neighborhood: "Bedford-Stuyvesant",
        crossStreets: "Fulton & Nostrand",
        capacity: 24,
        lat: Number.NaN,
        lng: Number.NaN,
      })
    ).id;
    nightId = (
      await createOpenNight(db, {
        venueId,
        date: nyDate(new Date(Date.now() + 14 * DAY)),
        time: "19:30",
        durationMin: 180,
        minSeats: 12,
        maxSeats: 20,
        venueSharePct: 25,
        venueFeeDollars: 0,
        terms: "keeps the bar",
        suggestedPriceDollars: 95,
        crew: "Hosted by Ana · Table by Rosa",
      })
    ).id;
  });

  afterAll(async () => {
    if (!db) return;
    const chefIds = (await db.chefProfile.findMany({ where: { slug: { startsWith: tag } }, select: { id: true } })).map((c) => c.id);
    await db.event.deleteMany({ where: { chefId: { in: chefIds } } });
    await db.venue.deleteMany({ where: { OR: [{ name: { startsWith: tag } }, { owner: { email: { startsWith: tag } } }] } });
    await db.user.deleteMany({ where: { email: { startsWith: tag } } });
    await db.cuisine.deleteMany({ where: { slug: { startsWith: tag } } });
    await db.$disconnect();
  });

  it("a partner venue has no owner; its night starts in New York time", async () => {
    const venue = await db.venue.findUniqueOrThrow({ where: { id: venueId } });
    expect(venue).toMatchObject({ type: "PARTNER_VENUE", ownerUserId: null, borough: "BROOKLYN", neighborhood: "Bedford-Stuyvesant" });
    const night = await db.openNight.findUniqueOrThrow({ where: { id: nightId } });
    expect(night).toMatchObject({ status: "OPEN", minSeats: 12, maxSeats: 20, venueSharePct: 25, suggestedPriceCents: 9500 });
  });

  it("only approved chefs pitch, inside the night's seat range, once each", async () => {
    await expect(submitPitch(db, users.c, pitchInput())).rejects.toMatchObject({ code: "not_chef" });
    await expect(submitPitch(db, users.a, pitchInput({ maxGuests: 21 }))).rejects.toMatchObject({ code: "seats_out_of_range" });
    await expect(submitPitch(db, users.a, pitchInput({ maxGuests: 10 }))).rejects.toMatchObject({ code: "seats_out_of_range" });
    await submitPitch(db, users.a, pitchInput());
    await expect(submitPitch(db, users.a, pitchInput())).rejects.toMatchObject({ code: "already_pitched" });
    const b = await submitPitch(db, users.b, pitchInput({ title: `${tag} Dumplings`, priceDollars: 70, maxGuests: 16 }));
    // Withdraw and pitch again: the same row goes back to pending.
    await withdrawPitch(db, users.b, b.id);
    await expect(withdrawPitch(db, users.b, b.id)).rejects.toBeInstanceOf(NightError);
    const again = await submitPitch(db, users.b, pitchInput({ title: `${tag} Dumplings`, priceDollars: 70, maxGuests: 16 }));
    expect(again.id).toBe(b.id);
    expect(again.status).toBe("PENDING");
  });

  it("approving one pitch takes the night, creates the chef's draft dinner in the room, and declines the rest", async () => {
    const a = await db.nightPitch.findFirstOrThrow({ where: { openNightId: nightId, chef: { userId: users.a } } });
    const night = await db.openNight.findUniqueOrThrow({ where: { id: nightId } });
    const { eventId, declinedPitchIds } = await approvePitch(db, a.id, "Welcome aboard");
    expect(declinedPitchIds).toHaveLength(1);

    const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { cuisines: true } });
    expect(event).toMatchObject({
      format: "ROOM",
      status: "DRAFT",
      venueId,
      openNightId: nightId,
      startsAt: night.startsAt,
      durationMin: 180,
      priceCents: 9500,
      minGuests: 12,
      maxGuests: 18,
      byob: true,
      credits: "Hosted by Ana · Table by Rosa",
      borough: "BROOKLYN",
    });
    expect(event.cuisines.map((c) => c.id)).toEqual([cuisineId]);
    expect((await db.openNight.findUniqueOrThrow({ where: { id: nightId } })).status).toBe("TAKEN");
    const pitches = await db.nightPitch.findMany({ where: { openNightId: nightId }, orderBy: { createdAt: "asc" } });
    expect(pitches.map((p) => p.status)).toEqual(["APPROVED", "DECLINED"]);
    expect(pitches[1].decisionNote).toBe(ANOTHER_CHEF_NOTE);

    // Nothing can be approved twice, and the taken night takes no new pitches.
    await expect(approvePitch(db, a.id)).rejects.toMatchObject({ code: "not_pending" });
    await expect(approvePitch(db, pitches[1].id)).rejects.toMatchObject({ code: "not_pending" });
    await expect(submitPitch(db, users.c, pitchInput())).rejects.toBeInstanceOf(NightError);
  });

  it("the chef edits the dinner but keeps the night's room, date and time, inside its seats", async () => {
    const event = await db.event.findFirstOrThrow({ where: { openNightId: nightId } });
    const base: EventInput = {
      title: event.title,
      description: "Eight lucky dishes.",
      date: "2030-01-01",
      time: "12:00",
      durationMin: 150,
      priceDollars: 95,
      minGuests: 12,
      maxGuests: 20,
      allowedBookingTypes: ["SEAT", "GROUP"],
      cuisineIds: [cuisineId],
      drinks: "BYOB",
      venueKind: "HOME",
      venueHasBar: false,
      venueId: "not-a-real-venue",
      intent: "publish",
    };
    const saved = await saveEvent(db, users.a, base, event.id);
    expect(saved).toMatchObject({ status: "PUBLISHED", startsAt: event.startsAt, venueId, maxGuests: 20, format: "ROOM" });
    await expect(saveEvent(db, users.a, { ...base, maxGuests: 22 }, event.id)).rejects.toMatchObject({ code: "shape", field: "maxGuests" });
    await expect(saveEvent(db, users.a, { ...base, minGuests: 6 }, event.id)).rejects.toMatchObject({ code: "shape", field: "minGuests" });
    await expect(saveEvent(db, users.a, { ...base, drinks: "BAR" }, event.id)).rejects.toMatchObject({ code: "shape", field: "drinks" });
    await expect(saveEvent(db, users.a, { ...base, durationMin: 240 }, event.id)).rejects.toMatchObject({ code: "shape", field: "durationMin" });
    // Another chef can't touch it.
    await expect(saveEvent(db, users.b, base, event.id)).rejects.toBeInstanceOf(EventError);
  });

  it("a chef's own space seats what it holds and may pour from its bar; a home stays at ten and BYOB", async () => {
    const common = {
      title: `${tag} pop-up`,
      date: nyDate(new Date(Date.now() + 20 * DAY)),
      time: "19:00",
      durationMin: 150,
      priceDollars: 80,
      minGuests: 8,
      allowedBookingTypes: ["SEAT", "GROUP"] as ("SEAT" | "GROUP")[],
      cuisineIds: [cuisineId],
      venueAddress: "9 Test St",
      venueNeighborhood: "Bushwick",
      venueCrossStreets: "Knickerbocker & Troutman",
      venueHasBar: true,
      intent: "draft" as const,
    };
    const room = await saveEvent(db, users.b, { ...common, venueKind: "SPACE", venueName: `${tag} back room`, venueCapacity: 24, maxGuests: 22, drinks: "BAR" });
    expect(room).toMatchObject({ format: "ROOM", byob: false, maxGuests: 22 });
    await expect(saveEvent(db, users.b, { ...common, venueKind: "HOME", maxGuests: 11, drinks: "BYOB" })).rejects.toMatchObject({ code: "shape", field: "maxGuests" });
    await expect(saveEvent(db, users.b, { ...common, venueKind: "HOME", maxGuests: 10, drinks: "BAR" })).rejects.toMatchObject({ code: "shape", field: "drinks" });
    const home = await saveEvent(db, users.b, { ...common, venueKind: "HOME", maxGuests: 10, drinks: "BYOB" });
    expect(home).toMatchObject({ format: "HOME", byob: true });
  });

  it("nights inside the cutoff, in the past, or over the room's capacity are refused", async () => {
    const soon = await db.openNight.create({ data: { venueId, startsAt: new Date(Date.now() + DAY), minSeats: 10, maxSeats: 20 } });
    await expect(submitPitch(db, users.a, pitchInput({ nightId: soon.id }))).rejects.toMatchObject({ code: "too_late" });
    const night = { venueId, time: "19:00", durationMin: 180, minSeats: 10, maxSeats: 20, venueSharePct: 0, venueFeeDollars: 0, terms: "", crew: "" };
    await expect(createOpenNight(db, { ...night, date: nyDate(new Date(Date.now() - 2 * DAY)) })).rejects.toMatchObject({ code: "in_past" });
    await expect(createOpenNight(db, { ...night, date: nyDate(new Date(Date.now() + 9 * DAY)), maxSeats: 30 })).rejects.toMatchObject({ code: "over_capacity" });
  });

  it("cancelling an open night declines its pending pitches; a taken night can't be cancelled here", async () => {
    const extra = await createOpenNight(db, {
      venueId, date: nyDate(new Date(Date.now() + 21 * DAY)), time: "19:00", durationMin: 180, minSeats: 10, maxSeats: 20, venueSharePct: 20, venueFeeDollars: 100, terms: "", crew: "",
    });
    const p = await submitPitch(db, users.b, pitchInput({ nightId: extra.id, maxGuests: 14 }));
    const { declinedPitchIds } = await cancelOpenNight(db, extra.id);
    expect(declinedPitchIds).toEqual([p.id]);
    expect(await db.nightPitch.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ status: "DECLINED", decisionNote: NIGHT_CANCELLED_NOTE });
    await expect(cancelOpenNight(db, nightId)).rejects.toMatchObject({ code: "night_closed" });
  });

  it("the database itself keeps HOME dinners at ten and BYOB, and only partner rooms ownerless", async () => {
    const chef = await db.chefProfile.findFirstOrThrow({ where: { userId: users.a } });
    const startsAt = new Date(Date.now() + 30 * DAY);
    const event = (over: Record<string, unknown>) =>
      db.event.create({
        data: {
          chefId: chef.id, venueId, title: `${tag} check`, startsAt, durationMin: 120, priceCents: 5000, minGuests: 2, maxGuests: 10,
          allowedBookingTypes: ["SEAT"], goNoGoAt: startsAt, borough: "BROOKLYN", ...over,
        },
      });
    await expect(event({ format: "HOME", maxGuests: 11 })).rejects.toThrow(/events_home_guest_cap/);
    await expect(event({ format: "HOME", byob: false })).rejects.toThrow(/events_home_byob/);
    await expect(event({ format: "ROOM", maxGuests: 40, byob: false })).resolves.toMatchObject({ maxGuests: 40 });
    await expect(
      db.venue.create({ data: { type: "CHEF_HOME", address: "x", neighborhood: "Bushwick", borough: "BROOKLYN", crossStreets: "x", lat: 40.7, lng: -73.9, capacity: 10, name: `${tag} orphan` } }),
    ).rejects.toThrow(/venues_owner_unless_partner/);
  });
});
