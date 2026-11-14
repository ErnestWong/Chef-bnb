import type { Db } from "@/lib/db";
import type { Mailer } from "@/lib/email/mailer";
import { notifyEventCancelled } from "@/lib/email/notify";
import { cancelEventTx, type CancelledBooking } from "@/lib/events/manage";
import { emptyResult, errorMessage } from "./shared";
import type { JobResult } from "./types";

export const UNDER_MINIMUM_REASON = "Fewer than the minimum confirmed by the cutoff.";

/**
 * Once an event's go/no-go time has passed: confirmed seats below the chef's
 * minimum → cancel the event and every active booking, email everyone.
 * Decided exactly once per event (events.go_no_go_checked_at), under the
 * event row lock so a payment being marked at the same moment is counted or
 * cleanly cancelled, never lost.
 */
export async function goNoGo(db: Db, mailer: Mailer, now = new Date()): Promise<JobResult> {
  const result = emptyResult();
  const due = await db.event.findMany({
    where: { status: "PUBLISHED", goNoGoCheckedAt: null, goNoGoAt: { lte: now }, startsAt: { gt: now } },
    select: { id: true },
  });
  for (const { id } of due) {
    try {
      const outcome = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${id} FOR UPDATE`;
        const e = await tx.event.findUnique({ where: { id }, select: { status: true, goNoGoCheckedAt: true, minGuests: true, startsAt: true } });
        if (!e || e.status !== "PUBLISHED" || e.goNoGoCheckedAt || e.startsAt <= now) return null;
        const confirmed = await tx.booking.aggregate({ where: { eventId: id, status: "CONFIRMED" }, _sum: { partySize: true } });
        const seats = confirmed._sum.partySize ?? 0;
        let cancelled: CancelledBooking[] | null = null;
        if (seats < e.minGuests) {
          cancelled = await cancelEventTx(tx, id, { actorUserId: null, reason: UNDER_MINIMUM_REASON, now });
        }
        await tx.event.update({ where: { id }, data: { goNoGoCheckedAt: now } });
        return { cancelled };
      });
      if (!outcome) continue;
      result.processed++;
      if (outcome.cancelled) {
        result.emails += await notifyEventCancelled(db, mailer, id, outcome.cancelled, { reason: UNDER_MINIMUM_REASON, cancelledBy: "system" });
      }
    } catch (err) {
      result.errors.push(`${id}: ${errorMessage(err)}`);
    }
  }
  return result;
}
