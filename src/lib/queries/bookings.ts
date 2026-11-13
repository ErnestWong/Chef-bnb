import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";
import { PUBLIC_CHEF_CARD_SELECT } from "./public-select";

/**
 * Role-checked reads that include private columns. Each function verifies the
 * caller's relationship to the data before returning it (docs/strategy.md,
 * "Who can see what").
 */

const GUEST_BOOKING_SELECT = {
  id: true,
  type: true,
  partySize: true,
  amountCents: true,
  status: true,
  dietaryNotes: true,
  createdAt: true,
  paidMarkedAt: true,
  cancelledAt: true,
  event: {
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMin: true,
      status: true,
      borough: true,
      venue: { select: { neighborhood: true, crossStreets: true } },
      chef: {
        select: {
          ...PUBLIC_CHEF_CARD_SELECT,
          // Private: shown to this guest only because they hold a request/booking on the event.
          paymentHandle: true,
          paymentNote: true,
        },
      },
    },
  },
} satisfies Prisma.BookingSelect;

export type GuestBooking = Prisma.BookingGetPayload<{ select: typeof GUEST_BOOKING_SELECT }>;

export async function listBookingsForGuest(user: CurrentUser): Promise<GuestBooking[]> {
  return getDb().booking.findMany({
    where: { guestUserId: user.id },
    select: GUEST_BOOKING_SELECT,
    orderBy: [{ event: { startsAt: "desc" } }, { createdAt: "desc" }],
  });
}

/** The guest's own booking, or null when it isn't theirs (admins may read any). */
export async function getBookingForGuest(id: string, user: CurrentUser): Promise<GuestBooking | null> {
  return getDb().booking.findFirst({
    where: { id, ...(hasRole(user.roles, "ADMIN") ? {} : { guestUserId: user.id }) },
    select: GUEST_BOOKING_SELECT,
  });
}

const CHEF_EVENT_SELECT = {
  id: true,
  title: true,
  startsAt: true,
  durationMin: true,
  status: true,
  mode: true,
  priceCents: true,
  minGuests: true,
  maxGuests: true,
  goNoGoAt: true,
  bookings: {
    select: {
      id: true,
      type: true,
      partySize: true,
      amountCents: true,
      status: true,
      dietaryNotes: true,
      createdAt: true,
      paidMarkedAt: true,
      // Private to the chef of this event (and admin).
      guest: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.EventSelect;

export type ChefEvent = Prisma.EventGetPayload<{ select: typeof CHEF_EVENT_SELECT }>;

/** All events for the signed-in chef, with their guest lists. */
export async function listEventsForChef(user: CurrentUser): Promise<ChefEvent[]> {
  return getDb().event.findMany({
    where: { chef: { userId: user.id } },
    select: CHEF_EVENT_SELECT,
    orderBy: { startsAt: "desc" },
  });
}

/** One event with its guest list, only for its chef (or admin). */
export async function getEventForChef(id: string, user: CurrentUser): Promise<ChefEvent | null> {
  return getDb().event.findFirst({
    where: { id, ...(hasRole(user.roles, "ADMIN") ? {} : { chef: { userId: user.id } }) },
    select: CHEF_EVENT_SELECT,
  });
}

export function confirmedSeats(event: Pick<ChefEvent, "bookings">): number {
  return event.bookings.filter((b) => b.status === "CONFIRMED" || b.status === "ATTENDED" || b.status === "NO_SHOW").reduce((n, b) => n + b.partySize, 0);
}

export function heldSeats(event: Pick<ChefEvent, "bookings">): number {
  return event.bookings.filter((b) => b.status === "REQUESTED" || b.status === "CONFIRMED").reduce((n, b) => n + b.partySize, 0);
}
