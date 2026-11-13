import type { Db } from "@/lib/db";
import { RULES } from "@/lib/bookings/rules";
import type { Mailer } from "@/lib/email/mailer";
import { notifyAddressReveal } from "@/lib/email/notify";
import { HOUR, emptyResult, errorMessage } from "./shared";
import type { JobResult } from "./types";

function dueWhere(now: Date) {
  return {
    status: "CONFIRMED" as const,
    addressSentAt: null,
    event: { status: "PUBLISHED" as const, startsAt: { gt: now, lte: new Date(now.getTime() + RULES.ADDRESS_REVEAL_HOURS * HOUR) } },
  };
}

/**
 * Send one confirmed guest the exact address if their dinner is inside the
 * reveal window. The marker (bookings.address_sent_at) is claimed first so two
 * overlapping runs can't both send; if sending fails the claim is released so
 * the next run retries. Also called right after a late confirmation.
 */
export async function revealAddressForBooking(db: Db, mailer: Mailer, bookingId: string, now = new Date()): Promise<"sent" | "skipped" | "failed"> {
  const claim = await db.booking.updateMany({ where: { id: bookingId, ...dueWhere(now) }, data: { addressSentAt: now } });
  if (claim.count === 0) return "skipped";
  const ok = await notifyAddressReveal(db, mailer, bookingId);
  if (!ok) {
    await db.booking.updateMany({ where: { id: bookingId, addressSentAt: now }, data: { addressSentAt: null } });
    return "failed";
  }
  return "sent";
}

/** 48 h before start: email the exact address to every confirmed guest who hasn't had it. */
export async function revealAddresses(db: Db, mailer: Mailer, now = new Date()): Promise<JobResult> {
  const result = emptyResult();
  const due = await db.booking.findMany({ where: dueWhere(now), select: { id: true } });
  for (const { id } of due) {
    try {
      const outcome = await revealAddressForBooking(db, mailer, id, now);
      if (outcome === "skipped") continue;
      result.processed++;
      if (outcome === "sent") result.emails++;
      else result.errors.push(`${id}: email failed; will retry`);
    } catch (err) {
      result.errors.push(`${id}: ${errorMessage(err)}`);
    }
  }
  return result;
}
