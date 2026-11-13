import type { Prisma } from "@/generated/prisma/client";

/**
 * Select lists for anything rendered to the public. These are the ONLY shapes
 * public pages may query with. Private columns (exact address, payment handle,
 * guest emails, reviewer identity) must never appear here — see the test next
 * to this file, and the "Who can see what" table in docs/strategy.md.
 */

export const PUBLIC_VENUE_SELECT = {
  id: true,
  type: true,
  neighborhood: true,
  borough: true,
  crossStreets: true,
  lat: true,
  lng: true,
} satisfies Prisma.VenueSelect;

export const PUBLIC_CHEF_CARD_SELECT = {
  id: true,
  slug: true,
  displayName: true,
  bio: true,
  homeBorough: true,
  photoUrls: true,
  cuisines: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ChefProfileSelect;

export const PUBLIC_CHEF_PROFILE_SELECT = {
  ...PUBLIC_CHEF_CARD_SELECT,
  credentials: true,
  website: true,
  instagram: true,
  insuranceOnFile: true,
  createdAt: true,
} satisfies Prisma.ChefProfileSelect;

export const PUBLIC_EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  durationMin: true,
  priceCents: true,
  minGuests: true,
  maxGuests: true,
  allowedBookingTypes: true,
  mode: true,
  status: true,
  borough: true,
  byob: true,
  byobNote: true,
  dietaryNotes: true,
  cuisines: { select: { id: true, name: true, slug: true } },
  venue: { select: PUBLIC_VENUE_SELECT },
  chef: { select: PUBLIC_CHEF_CARD_SELECT },
  menu: { select: { id: true, title: true, courses: true, pdfUrl: true } },
} satisfies Prisma.EventSelect;

/** Reviews are shown anonymously: no author, no booking link. */
export const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  body: true,
  createdAt: true,
  event: { select: { id: true, title: true, startsAt: true } },
} satisfies Prisma.ReviewSelect;

/** Column names that must never be selected for the public. */
export const PRIVATE_FIELDS = [
  "address",
  "paymentHandle",
  "paymentNote",
  "foodCertNumber",
  "email",
  "phone",
  "authorId",
  "author",
  "bookingId",
  "booking",
  "bookings",
  "guestUserId",
  "guest",
  "ownerUserId",
  "owner",
  "userId",
  "user",
  "reviewNote",
] as const;
