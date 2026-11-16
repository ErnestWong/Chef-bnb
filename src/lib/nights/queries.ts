import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { RULES } from "@/lib/bookings/rules";
import { getDb } from "@/lib/db";

/**
 * Reads for the open-nights board (approved chefs) and the admin desk. A
 * room's name, notes and terms are shown to approved chefs; its street
 * address only to the chef whose pitch was approved (on their dinner page)
 * and to admins.
 */

const HOUR = 3600 * 1000;

const BOARD_VENUE_SELECT = {
  id: true,
  name: true,
  description: true,
  kitchenNotes: true,
  hasBar: true,
  neighborhood: true,
  borough: true,
  crossStreets: true,
  capacity: true,
} satisfies Prisma.VenueSelect;

const BOARD_NIGHT_SELECT = {
  id: true,
  startsAt: true,
  durationMin: true,
  minSeats: true,
  maxSeats: true,
  venueSharePct: true,
  venueFeeCents: true,
  terms: true,
  suggestedPriceCents: true,
  crew: true,
  status: true,
  venue: { select: BOARD_VENUE_SELECT },
} satisfies Prisma.OpenNightSelect;

export type BoardNight = Prisma.OpenNightGetPayload<{ select: typeof BOARD_NIGHT_SELECT }> & {
  myPitch: { id: string; status: string } | null;
};

/** Open nights a chef can still pitch for (ahead of the go/no-go cutoff), soonest first, with their own pitch if any. */
export async function listBoardNights(userId: string, now = new Date()): Promise<BoardNight[]> {
  const nights = await getDb().openNight.findMany({
    where: { status: "OPEN", startsAt: { gt: new Date(now.getTime() + RULES.GO_NO_GO_HOURS * HOUR) } },
    select: { ...BOARD_NIGHT_SELECT, pitches: { where: { chef: { userId } }, select: { id: true, status: true } } },
    orderBy: { startsAt: "asc" },
  });
  return nights.map(({ pitches, ...n }) => ({ ...n, myPitch: pitches[0] ?? null }));
}

export async function getBoardNight(id: string, userId: string) {
  const night = await getDb().openNight.findUnique({
    where: { id },
    select: {
      ...BOARD_NIGHT_SELECT,
      pitches: { where: { chef: { userId } }, select: { id: true, status: true, title: true, pitch: true, priceCents: true, maxGuests: true, decisionNote: true } },
      event: { select: { id: true, chef: { select: { userId: true } } } },
    },
  });
  if (!night) return null;
  const { pitches, event, ...rest } = night;
  // The dinner link is only for the chef who got the night.
  return { ...rest, myPitch: pitches[0] ?? null, myEventId: event && event.chef.userId === userId ? event.id : null };
}

/** The chef's own pitches, newest first, for the dashboard. */
export async function listPitchesForChef(userId: string) {
  return getDb().nightPitch.findMany({
    where: { chef: { userId } },
    select: {
      id: true,
      title: true,
      status: true,
      decisionNote: true,
      priceCents: true,
      maxGuests: true,
      openNight: { select: { id: true, startsAt: true, venue: { select: { name: true, neighborhood: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// ---------- Admin ----------

export async function listPartnerVenues() {
  return getDb().venue.findMany({
    where: { type: "PARTNER_VENUE" },
    select: { ...BOARD_VENUE_SELECT, address: true, _count: { select: { openNights: true } } },
    orderBy: { name: "asc" },
  });
}

/** Upcoming nights in every state, with pending-pitch counts and the dinner a taken night became. */
export async function listNightsForAdmin(now = new Date()) {
  return getDb().openNight.findMany({
    where: { startsAt: { gt: new Date(now.getTime() - 24 * HOUR) } },
    select: {
      ...BOARD_NIGHT_SELECT,
      event: { select: { id: true, title: true, status: true, chef: { select: { displayName: true } } } },
      _count: { select: { pitches: { where: { status: "PENDING" } } } },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getNightForAdmin(id: string) {
  return getDb().openNight.findUnique({
    where: { id },
    select: {
      ...BOARD_NIGHT_SELECT,
      venue: { select: { ...BOARD_VENUE_SELECT, address: true } },
      event: { select: { id: true, title: true, status: true, chef: { select: { displayName: true } } } },
      pitches: {
        select: {
          id: true,
          title: true,
          pitch: true,
          priceCents: true,
          maxGuests: true,
          status: true,
          decisionNote: true,
          createdAt: true,
          chef: { select: { id: true, displayName: true, slug: true, status: true, cuisines: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function countPendingPitches() {
  return getDb().nightPitch.count({ where: { status: "PENDING", openNight: { status: "OPEN" } } });
}
