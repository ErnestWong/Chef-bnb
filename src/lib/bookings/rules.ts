import type { BookingType, EventMode, EventStatus } from "@/generated/prisma/enums";

/** Product defaults from the strategy. Checklist item 8 may change these. */
export const RULES = {
  /** Hard cap per event; also a DB CHECK constraint. */
  MAX_GUESTS: 10,
  /** Largest non-buyout group. */
  GROUP_CAP: 5,
  /** Unpaid requests expire after this long. */
  REQUEST_EXPIRY_HOURS: 48,
  /** Go/no-go cutoff before start. */
  GO_NO_GO_HOURS: 72,
  /** Exact address is revealed this long before start. */
  ADDRESS_REVEAL_HOURS: 48,
  /** Reviews allowed this long after attendance. */
  REVIEW_WINDOW_DAYS: 30,
  /** Abuse guard: unpaid requests one guest may open in 24 h. */
  MAX_OPEN_REQUESTS_PER_DAY: 5,
} as const;

/** The slice of an event the capacity rules need; read under a row lock. */
export type EventSnapshot = {
  status: EventStatus;
  mode: EventMode;
  startsAt: Date;
  minGuests: number;
  maxGuests: number;
  priceCents: number;
  allowedBookingTypes: BookingType[];
};

/** Seats currently held: bookings in REQUESTED or CONFIRMED. */
export type Occupancy = {
  activeSeats: number;
  activeBookings: number;
};

export type SeatRequest = {
  type: BookingType;
  partySize: number;
};

export type DeclineCode =
  | "event_not_open"
  | "event_started"
  | "type_not_allowed"
  | "invalid_party_size"
  | "event_bought_out"
  | "buyout_unavailable"
  | "not_enough_seats";

export type Decision =
  | { ok: true; amountCents: number; nextMode: EventMode }
  | { ok: false; code: DeclineCode; message: string };

const decline = (code: DeclineCode, message: string): Decision => ({ ok: false, code, message });

/**
 * Pure capacity rule (docs/strategy.md, Booking model). Callers must read
 * `event` and `occupancy` under `SELECT ... FOR UPDATE` on the event so two
 * requests can't both see the last seat.
 */
export function decideSeatRequest(
  event: EventSnapshot,
  occupancy: Occupancy,
  request: SeatRequest,
  now: Date = new Date(),
): Decision {
  if (event.status !== "PUBLISHED") {
    return decline("event_not_open", "This dinner isn't open for booking.");
  }
  if (event.startsAt <= now) {
    return decline("event_started", "This dinner has already started.");
  }
  if (!event.allowedBookingTypes.includes(request.type)) {
    return decline("type_not_allowed", "The chef doesn't offer that booking type for this dinner.");
  }
  const size = request.partySize;
  if (!Number.isInteger(size) || size < 1) {
    return decline("invalid_party_size", "Party size must be a whole number of at least 1.");
  }

  if (request.type === "BUYOUT") {
    if (size < event.minGuests || size > event.maxGuests) {
      return decline(
        "invalid_party_size",
        `A buyout seats between ${event.minGuests} and ${event.maxGuests} guests.`,
      );
    }
    if (occupancy.activeBookings > 0 || event.mode === "BOUGHT_OUT") {
      return decline("buyout_unavailable", "Seats have already been booked, so the table can't be bought out.");
    }
    return {
      ok: true,
      // Never below price × min: the chef's minimum is guaranteed.
      amountCents: event.priceCents * Math.max(size, event.minGuests),
      nextMode: "BOUGHT_OUT",
    };
  }

  if (request.type === "SEAT" && size !== 1) {
    return decline("invalid_party_size", "A solo seat is for one guest.");
  }
  if (request.type === "GROUP" && (size < 2 || size > RULES.GROUP_CAP)) {
    return decline("invalid_party_size", `Groups are 2 to ${RULES.GROUP_CAP} guests.`);
  }
  if (event.mode === "BOUGHT_OUT") {
    return decline("event_bought_out", "This dinner has been bought out.");
  }
  if (occupancy.activeSeats + size > event.maxGuests) {
    const left = Math.max(0, event.maxGuests - occupancy.activeSeats);
    return decline("not_enough_seats", left === 0 ? "This dinner is full." : `Only ${left} seat${left === 1 ? "" : "s"} left.`);
  }
  return { ok: true, amountCents: event.priceCents * size, nextMode: "OPEN" };
}
