import type { Db } from "@/lib/db";
import type { Mailer } from "@/lib/email/mailer";
import { notifyReviewRequest } from "@/lib/email/notify";
import { emptyResult, errorMessage } from "./shared";
import type { JobResult } from "./types";

/**
 * Booking marked attended → one review-request email. The marker
 * (bookings.review_requested_at) is claimed before sending and released if
 * the send fails, so re-runs never double-send and failures retry.
 */
export async function requestReviews(db: Db, mailer: Mailer, now = new Date()): Promise<JobResult> {
  const result = emptyResult();
  const due = await db.booking.findMany({ where: { status: "ATTENDED", reviewRequestedAt: null }, select: { id: true } });
  for (const { id } of due) {
    try {
      const claim = await db.booking.updateMany({ where: { id, status: "ATTENDED", reviewRequestedAt: null }, data: { reviewRequestedAt: now } });
      if (claim.count === 0) continue;
      result.processed++;
      if (await notifyReviewRequest(db, mailer, id)) {
        result.emails++;
      } else {
        await db.booking.updateMany({ where: { id, reviewRequestedAt: now }, data: { reviewRequestedAt: null } });
        result.errors.push(`${id}: email failed; will retry`);
      }
    } catch (err) {
      result.errors.push(`${id}: ${errorMessage(err)}`);
    }
  }
  return result;
}
