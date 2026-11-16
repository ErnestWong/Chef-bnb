import { describe, expect, it } from "vitest";
import { RULES } from "@/lib/bookings/rules";
import { checkDinnerShape, dinnerLimits, drinksLabel, formatForVenue } from "./formats";

const home = { type: "CHEF_HOME" as const, capacity: 10, hasBar: false };
const space = { type: "CHEF_SPACE" as const, capacity: 24, hasBar: true };
const partner = { type: "PARTNER_VENUE" as const, capacity: 30, hasBar: false };

describe("dinner formats", () => {
  it("a chef's home is HOME; their own space and a booked room are ROOM", () => {
    expect(formatForVenue("CHEF_HOME")).toBe("HOME");
    expect(formatForVenue("CHEF_SPACE")).toBe("ROOM");
    expect(formatForVenue("PARTNER_VENUE")).toBe("ROOM");
  });

  it("caps a home at ten and BYOB; a room seats what it holds and may use its bar", () => {
    expect(dinnerLimits(home)).toEqual({ format: "HOME", minSeats: 1, maxSeats: RULES.MAX_HOME_GUESTS, barAllowed: false });
    // A home venue claiming more seats still caps at ten.
    expect(dinnerLimits({ ...home, capacity: 40 }).maxSeats).toBe(RULES.MAX_HOME_GUESTS);
    expect(dinnerLimits(space)).toEqual({ format: "ROOM", minSeats: 1, maxSeats: 24, barAllowed: true });
    expect(dinnerLimits(partner).barAllowed).toBe(false);
  });

  it("an open night narrows the room to the seat range the venue agreed", () => {
    expect(dinnerLimits(partner, { minSeats: 12, maxSeats: 20 })).toEqual({ format: "ROOM", minSeats: 12, maxSeats: 20, barAllowed: false });
    // Never above the room itself.
    expect(dinnerLimits(partner, { minSeats: 12, maxSeats: 50 }).maxSeats).toBe(30);
  });

  it("explains what's wrong with a dinner's seats or drinks", () => {
    expect(checkDinnerShape(dinnerLimits(home), { minGuests: 4, maxGuests: 10, drinks: "BYOB" })).toBeNull();
    expect(checkDinnerShape(dinnerLimits(home), { minGuests: 4, maxGuests: 11, drinks: "BYOB" })).toMatchObject({ field: "maxGuests", message: expect.stringMatching(/at home seats at most 10/) });
    expect(checkDinnerShape(dinnerLimits(home), { minGuests: 4, maxGuests: 8, drinks: "BAR" })).toMatchObject({ field: "drinks", message: "Dinners at home are BYOB." });
    expect(checkDinnerShape(dinnerLimits(space), { minGuests: 8, maxGuests: 24, drinks: "BAR" })).toBeNull();
    expect(checkDinnerShape(dinnerLimits(space), { minGuests: 8, maxGuests: 25, drinks: "BYOB" })).toMatchObject({ field: "maxGuests", message: "This room seats at most 24." });
    expect(checkDinnerShape(dinnerLimits(partner), { minGuests: 8, maxGuests: 20, drinks: "BAR" })).toMatchObject({ field: "drinks" });
    expect(checkDinnerShape(dinnerLimits(partner, { minSeats: 12, maxSeats: 20 }), { minGuests: 6, maxGuests: 20, drinks: "BYOB" })).toMatchObject({ field: "minGuests" });
  });

  it("labels the drinks for the card", () => {
    expect(drinksLabel(true)).toBe("BYOB");
    expect(drinksLabel(false)).toBe("Bar open");
  });
});
