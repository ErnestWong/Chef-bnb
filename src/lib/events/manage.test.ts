import { describe, expect, it } from "vitest";
import { eventSchema, parseCourses, roundCoord, zonedToUtc } from "./manage";

describe("zonedToUtc", () => {
  it("converts New York local time to UTC across DST", () => {
    expect(zonedToUtc("2026-12-06", "19:00").toISOString()).toBe("2026-12-07T00:00:00.000Z"); // EST, UTC-5
    expect(zonedToUtc("2026-07-04", "19:00").toISOString()).toBe("2026-07-04T23:00:00.000Z"); // EDT, UTC-4
  });
});

describe("roundCoord", () => {
  it("rounds to three decimals", () => {
    expect(roundCoord(40.71837)).toBe(40.718);
    expect(roundCoord(-73.9567)).toBe(-73.957);
  });
});

describe("parseCourses", () => {
  it("splits lines into name and description", () => {
    expect(parseCourses("Welcome bites — small things\nMains - family style\nDessert")).toEqual([
      { name: "Welcome bites", description: "small things" },
      { name: "Mains", description: "family style" },
      { name: "Dessert" },
    ]);
    expect(parseCourses(undefined)).toEqual([]);
  });
});

describe("eventSchema", () => {
  const valid = {
    title: "Dim Sum Brunch",
    date: "2026-12-06",
    time: "11:00",
    durationMin: "150",
    priceDollars: "55",
    minGuests: "4",
    maxGuests: "10",
    allowedBookingTypes: ["SEAT", "GROUP"],
    venueId: "v1",
  };

  it("accepts a valid event with an existing venue", () => {
    const r = eventSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.intent).toBe("draft");
  });

  it("caps max guests at 10 and keeps min <= max", () => {
    expect(eventSchema.safeParse({ ...valid, maxGuests: "11" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...valid, minGuests: "8", maxGuests: "6" }).success).toBe(false);
  });

  it("requires a venue, existing or new", () => {
    const { venueId: _omit, ...noVenue } = valid;
    void _omit;
    expect(eventSchema.safeParse(noVenue).success).toBe(false);
    expect(
      eventSchema.safeParse({ ...noVenue, venueAddress: "12 Orchard St, Apt 3", venueNeighborhood: "Lower East Side", venueBorough: "MANHATTAN", venueCrossStreets: "Orchard & Rivington" }).success,
    ).toBe(true);
  });

  it("requires at least one booking type", () => {
    expect(eventSchema.safeParse({ ...valid, allowedBookingTypes: [] }).success).toBe(false);
  });
});
