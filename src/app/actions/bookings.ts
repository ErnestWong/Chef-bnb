"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { BookingError, requestSeats } from "@/lib/bookings/request-seats";
import { RULES } from "@/lib/bookings/rules";
import { transitionBooking, TransitionError } from "@/lib/bookings/transition";
import { getMessenger } from "@/lib/messaging";
import { notifyBookingCancelledByOther, notifyBookingConfirmed, notifyRequestReceived, notifySeatRequested } from "@/lib/email/notify";
import { revealAddressForBooking } from "@/lib/jobs/reveal-addresses";
import { LIMITS } from "@/lib/security/limits";
import { rateLimitMessage } from "@/lib/security/rate-limit";

const requestSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(["SEAT", "GROUP", "BUYOUT"]),
  partySize: z.coerce.number().int().min(1).max(RULES.MAX_GUESTS),
  dietaryNotes: z.string().trim().max(500).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Guest requests seats. Redirects to the confirmation page on success. */
export async function requestSeatsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = requestSchema.safeParse({
    eventId: formData.get("eventId"),
    type: formData.get("type"),
    partySize: formData.get("partySize"),
    dietaryNotes: formData.get("dietaryNotes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Check the booking type and party size." };
  const user = await requireUser(`/events/${parsed.data.eventId}/book`);
  const limited = await rateLimitMessage(getDb(), `book:user:${user.id}`, LIMITS.bookingActionsPerUser);
  if (limited) return { ok: false, error: limited };

  let bookingId: string;
  try {
    const booking = await requestSeats(getDb(), {
      eventId: parsed.data.eventId,
      guestUserId: user.id,
      type: parsed.data.type,
      partySize: parsed.data.partySize,
      dietaryNotes: parsed.data.dietaryNotes ?? null,
    });
    bookingId = booking.id;
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    throw err;
  }
  await notifySeatRequested(getDb(), getMessenger(), bookingId);
  await notifyRequestReceived(getDb(), getMessenger(), bookingId);
  revalidatePath(`/events/${parsed.data.eventId}`);
  redirect(`/bookings/${bookingId}?new=1`);
}

const transitionSchema = z.object({
  bookingId: z.string().min(1),
  to: z.enum(["CONFIRMED", "CANCELLED", "ATTENDED", "NO_SHOW"]),
  note: z.string().trim().max(300).optional(),
  returnTo: z.string().optional(),
});

/** Guest cancel, chef mark paid / decline / attended / no-show. Authorization is inside transitionBooking. */
export async function transitionBookingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = transitionSchema.safeParse({
    bookingId: formData.get("bookingId"),
    to: formData.get("to"),
    note: formData.get("note") || undefined,
    returnTo: formData.get("returnTo") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const user = await requireUser();
  const limited = await rateLimitMessage(getDb(), `book:user:${user.id}`, LIMITS.bookingActionsPerUser);
  if (limited) return { ok: false, error: limited };

  // Who is cancelling what: read before the transition so the right party can be told after it.
  const before = await getDb().booking.findUnique({
    where: { id: parsed.data.bookingId },
    select: { status: true, guestUserId: true, event: { select: { chef: { select: { userId: true } } } } },
  });
  try {
    await transitionBooking(getDb(), {
      bookingId: parsed.data.bookingId,
      to: parsed.data.to,
      by: { id: user.id, roles: user.roles },
      note: parsed.data.note,
    });
  } catch (err) {
    if (err instanceof TransitionError) return { ok: false, error: err.message };
    throw err;
  }
  const db = getDb();
  const messenger = getMessenger();
  if (parsed.data.to === "CONFIRMED") {
    // Tell the guest; if the dinner is already inside the reveal window, send the address too.
    await notifyBookingConfirmed(db, messenger, parsed.data.bookingId);
    await revealAddressForBooking(db, messenger, parsed.data.bookingId);
  }
  if (parsed.data.to === "CANCELLED" && before) {
    const byChef = user.id === before.event.chef.userId && user.id !== before.guestUserId;
    const byGuest = user.id === before.guestUserId;
    if (before.status === "REQUESTED" && byChef) await notifyBookingCancelledByOther(db, messenger, parsed.data.bookingId, "guest");
    if (before.status === "CONFIRMED" && byGuest) await notifyBookingCancelledByOther(db, messenger, parsed.data.bookingId, "chef");
  }
  const returnTo = parsed.data.returnTo;
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    revalidatePath(returnTo);
    redirect(returnTo);
  }
  return { ok: true };
}
