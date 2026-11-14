import type { Db } from "@/lib/db";
import { RULES } from "@/lib/bookings/rules";
import { systemTransition } from "@/lib/bookings/transition";
import type { Mailer } from "@/lib/email/mailer";
import { notifyRequestExpired } from "@/lib/email/notify";
import { HOUR, emptyResult, errorMessage } from "./shared";
import type { JobResult } from "./types";

export const EXPIRY_NOTE = `Unpaid after ${RULES.REQUEST_EXPIRY_HOURS} hours`;
export const STARTED_UNPAID_NOTE = "Unpaid when the dinner started";

/**
 * Requested > 48 h, or still unpaid when the dinner starts → expired, seats
 * freed, guest emailed (see requestExpiresAt). Idempotent through the booking
 * status: a booking that is no longer REQUESTED is skipped.
 */
export async function expireRequests(db: Db, mailer: Mailer, now = new Date()): Promise<JobResult> {
  const result = emptyResult();
  const cutoff = new Date(now.getTime() - RULES.REQUEST_EXPIRY_HOURS * HOUR);
  const due = await db.booking.findMany({
    where: { status: "REQUESTED", OR: [{ createdAt: { lt: cutoff } }, { event: { startsAt: { lte: now } } }] },
    select: { id: true, createdAt: true },
  });
  for (const { id, createdAt } of due) {
    try {
      const note = createdAt < cutoff ? EXPIRY_NOTE : STARTED_UNPAID_NOTE;
      const moved = await systemTransition(db, { bookingId: id, to: "EXPIRED", note }, now);
      if (!moved) continue;
      result.processed++;
      if (await notifyRequestExpired(db, mailer, id, now)) result.emails++;
    } catch (err) {
      result.errors.push(`${id}: ${errorMessage(err)}`);
    }
  }
  return result;
}
