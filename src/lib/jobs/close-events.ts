import type { Db } from "@/lib/db";
import { applyTransition } from "@/lib/bookings/transition";
import type { Mailer } from "@/lib/email/mailer";
import { notifyMarkAttendance, notifyRequestExpired } from "@/lib/email/notify";
import { emptyResult, errorMessage } from "./shared";
import type { JobResult } from "./types";

export const ENDED_UNPAID_NOTE = "Unpaid when the dinner ended";

/**
 * Start + duration passed → event completed; any request still unpaid is
 * expired (the seat was never confirmed); the chef is asked to mark
 * attendance. Idempotent through the event status.
 */
export async function closeEvents(db: Db, mailer: Mailer, now = new Date()): Promise<JobResult> {
  const result = emptyResult();
  const started = await db.event.findMany({ where: { status: "PUBLISHED", startsAt: { lte: now } }, select: { id: true, startsAt: true, durationMin: true } });
  const due = started.filter((e) => e.startsAt.getTime() + e.durationMin * 60_000 <= now.getTime());
  for (const { id } of due) {
    try {
      const outcome = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM events WHERE id = ${id} FOR UPDATE`;
        const e = await tx.event.findUnique({ where: { id }, select: { status: true } });
        if (!e || e.status !== "PUBLISHED") return null;
        const unpaid = await tx.booking.findMany({ where: { eventId: id, status: "REQUESTED" }, select: { id: true, status: true, eventId: true } });
        for (const b of unpaid) await applyTransition(tx, b, "EXPIRED", { actorUserId: null, note: ENDED_UNPAID_NOTE, now });
        await tx.event.update({ where: { id }, data: { status: "COMPLETED", completedAt: now } });
        return { expired: unpaid.map((b) => b.id) };
      });
      if (!outcome) continue;
      result.processed++;
      if (await notifyMarkAttendance(db, mailer, id)) result.emails++;
      for (const bookingId of outcome.expired) {
        if (await notifyRequestExpired(db, mailer, bookingId, now)) result.emails++;
      }
    } catch (err) {
      result.errors.push(`${id}: ${errorMessage(err)}`);
    }
  }
  return result;
}
