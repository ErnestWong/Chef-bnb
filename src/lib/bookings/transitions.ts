import type { BookingStatus } from "@/generated/prisma/enums";

/** Who is making a booking state change. */
export type Actor = "guest" | "chef" | "admin" | "system";

/**
 * Booking state machine (docs/strategy.md, Booking states). Only the listed
 * actors can make each transition; everything else is illegal.
 */
const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, readonly Actor[]>>> = {
  REQUESTED: {
    CONFIRMED: ["chef", "admin"], // chef marks paid
    EXPIRED: ["system", "admin"], // 48 h unpaid
    CANCELLED: ["guest", "chef", "admin", "system"], // cancel, decline, or under min at cutoff
  },
  CONFIRMED: {
    CANCELLED: ["guest", "chef", "admin", "system"],
    ATTENDED: ["chef", "admin"],
    NO_SHOW: ["chef", "admin"],
  },
  EXPIRED: {},
  CANCELLED: {},
  ATTENDED: {},
  NO_SHOW: {},
};

export const ACTIVE_STATUSES: readonly BookingStatus[] = ["REQUESTED", "CONFIRMED"];

export function isActive(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Actor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

export function assertTransition(from: BookingStatus, to: BookingStatus, actor: Actor): void {
  if (!canTransition(from, to, actor)) {
    throw new Error(`Illegal booking transition ${from} → ${to} by ${actor}`);
  }
}

export const ALL_STATUSES = Object.keys(TRANSITIONS) as BookingStatus[];
