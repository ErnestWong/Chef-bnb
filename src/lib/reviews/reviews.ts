import { z } from "zod";
import type { Db } from "@/lib/db";
import type { BookingStatus } from "@/generated/prisma/enums";
import { RULES } from "@/lib/bookings/rules";

const DAY = 24 * 3600 * 1000;

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a star rating.").max(5),
  body: z.string().trim().max(1000, "Keep it under 1000 characters.").optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export type ReviewBlock = "not_yours" | "not_attended" | "window_closed" | "already_reviewed";
export type ReviewEligibility = { ok: true; deadline: Date } | { ok: false; code: ReviewBlock; deadline: Date };

/** Reviews are open for RULES.REVIEW_WINDOW_DAYS after the dinner. */
export function reviewDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() + RULES.REVIEW_WINDOW_DAYS * DAY);
}

/**
 * Pure rule (docs/strategy.md, M8): only the guest who holds the booking,
 * only once it is marked attended, only inside the window, and only once.
 */
export function reviewEligibility(
  booking: { guestUserId: string; status: BookingStatus; event: { startsAt: Date }; review: { id: string } | null },
  userId: string,
  now: Date = new Date(),
): ReviewEligibility {
  const deadline = reviewDeadline(booking.event.startsAt);
  if (booking.guestUserId !== userId) return { ok: false, code: "not_yours", deadline };
  if (booking.review) return { ok: false, code: "already_reviewed", deadline };
  if (booking.status !== "ATTENDED") return { ok: false, code: "not_attended", deadline };
  if (now > deadline) return { ok: false, code: "window_closed", deadline };
  return { ok: true, deadline };
}

export class ReviewError extends Error {
  constructor(public readonly code: ReviewBlock | "not_found") {
    super(
      {
        not_found: "Booking not found.",
        not_yours: "You can only review your own bookings.",
        not_attended: "Reviews open once the chef marks you attended.",
        window_closed: `Reviews close ${RULES.REVIEW_WINDOW_DAYS} days after the dinner.`,
        already_reviewed: "You've already reviewed this dinner.",
      }[code],
    );
    this.name = "ReviewError";
  }
}

/** Create the one review a booking may have. The unique index on booking_id backs the rule under concurrency. */
export async function createReview(db: Db, userId: string, input: ReviewInput, now = new Date()) {
  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, guestUserId: true, status: true, event: { select: { id: true, startsAt: true, chefId: true } }, review: { select: { id: true } } },
  });
  if (!booking) throw new ReviewError("not_found");
  const eligibility = reviewEligibility(booking, userId, now);
  if (!eligibility.ok) throw new ReviewError(eligibility.code);
  try {
    return await db.review.create({
      data: { bookingId: booking.id, eventId: booking.event.id, chefId: booking.event.chefId, authorId: userId, rating: input.rating, body: input.body || null, createdAt: now },
    });
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") throw new ReviewError("already_reviewed");
    throw err;
  }
}

/** Admin takedown: the row stays (with its author) but leaves every public page and the averages. */
export async function removeReview(db: Db, reviewId: string, now = new Date()) {
  return db.review.update({ where: { id: reviewId }, data: { removedAt: now } });
}

export async function restoreReview(db: Db, reviewId: string) {
  return db.review.update({ where: { id: reviewId }, data: { removedAt: null } });
}
