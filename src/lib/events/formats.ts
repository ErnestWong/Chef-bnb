import type { EventFormat, VenueType } from "@/generated/prisma/enums";
import { RULES } from "@/lib/bookings/rules";

/**
 * Dinner formats (docs/strategy.md, "Shared spaces and open nights"). Guests
 * see two labels: HOME, a chef's own home (ten seats at most, BYOB), and ROOM,
 * the chef's own space or a room Covers has booked (seats what the venue
 * holds, the venue's bar if it has one). Every format is one table, one seating.
 */
export const FORMAT_LABELS: Record<EventFormat, string> = { HOME: "Home", ROOM: "Room" };


export function formatForVenue(type: VenueType): EventFormat {
  return type === "CHEF_HOME" ? "HOME" : "ROOM";
}

export type Drinks = "BYOB" | "BAR";

export type DinnerLimits = {
  format: EventFormat;
  minSeats: number;
  maxSeats: number;
  /** A ROOM whose venue has a licensed bar may use it instead of BYOB. */
  barAllowed: boolean;
};

/** What a dinner at this venue may offer. An open night narrows the seats to the range the venue agreed for that night. */
export function dinnerLimits(
  venue: { type: VenueType; capacity: number; hasBar: boolean },
  night?: { minSeats: number; maxSeats: number } | null,
): DinnerLimits {
  const format = formatForVenue(venue.type);
  if (format === "HOME") return { format, minSeats: 1, maxSeats: Math.min(RULES.MAX_HOME_GUESTS, venue.capacity), barAllowed: false };
  return {
    format,
    minSeats: night?.minSeats ?? 1,
    maxSeats: Math.min(venue.capacity, night?.maxSeats ?? venue.capacity),
    barAllowed: venue.hasBar,
  };
}

/** The seat and drinks rules for one dinner. Returns what's wrong, in words a chef can act on, or null. */
export function checkDinnerShape(limits: DinnerLimits, dinner: { minGuests: number; maxGuests: number; drinks: Drinks }): { field: "maxGuests" | "minGuests" | "drinks"; message: string } | null {
  if (dinner.maxGuests > limits.maxSeats) {
    return {
      field: "maxGuests",
      message: limits.format === "HOME" ? `A dinner at home seats at most ${limits.maxSeats} guests.` : `This room seats at most ${limits.maxSeats}.`,
    };
  }
  if (dinner.minGuests < limits.minSeats) {
    return { field: "minGuests", message: `The venue needs at least ${limits.minSeats} guests for this night.` };
  }
  if (dinner.drinks === "BAR" && !limits.barAllowed) {
    return {
      field: "drinks",
      message: limits.format === "HOME" ? "Dinners at home are BYOB." : "This venue has no bar on file, so it's BYOB.",
    };
  }
  return null;
}

/** "BYOB" or "Bar open": the drinks half of the card label. */
export function drinksLabel(byob: boolean): string {
  return byob ? "BYOB" : "Bar open";
}
