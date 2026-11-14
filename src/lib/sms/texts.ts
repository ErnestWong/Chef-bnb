import type { AddressRevealProps } from "@/lib/email/templates/address-reveal";
import type { BookingCancelledProps } from "@/lib/email/templates/booking-cancelled";
import type { BookingConfirmedProps } from "@/lib/email/templates/booking-confirmed";
import type { ChefApplicationDecidedProps } from "@/lib/email/templates/chef-application-decided";
import type { EventCancelledProps } from "@/lib/email/templates/event-cancelled";
import { appUrl } from "@/lib/email/templates/layout";
import type { MarkAttendanceProps } from "@/lib/email/templates/mark-attendance";
import type { RequestExpiredProps } from "@/lib/email/templates/request-expired";
import type { RequestReceivedProps } from "@/lib/email/templates/request-received";
import type { ReviewRequestProps } from "@/lib/email/templates/review-request";
import type { SeatRequestedProps } from "@/lib/email/templates/seat-requested";
import { RULES } from "@/lib/bookings/rules";
import { formatEventDateTime, formatEventDay, formatMoney, pluralize } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";

/**
 * Text versions of every notification, built from the same props as the
 * email templates so the two channels can't say different things. Each is one
 * short message with a link; carriers split anything past 160 characters, so
 * these stay brief and put the link last.
 */

const sign = (body: string) => `${SITE_NAME}: ${body}`;

export function seatRequestedText(p: SeatRequestedProps) {
  const what = p.bookingType === "BUYOUT" ? `a buyout for ${p.partySize}` : pluralize(p.partySize, "seat");
  return sign(`${p.guestName} requested ${what} at ${p.eventTitle} (${formatEventDay(p.startsAt)}), ${formatMoney(p.amountCents)}. Mark it paid once the money lands: ${appUrl(`/chef/events/${p.eventId}`)}`);
}

/** Carries the chef's payment handle: only to the guest who holds the request. */
export function requestReceivedText(p: RequestReceivedProps) {
  const to = p.paymentHandle ? `${p.paymentHandle}${p.paymentNote ? ` (${p.paymentNote})` : ""}` : `${p.chefName} (they'll send payment details)`;
  const what = p.bookingType === "BUYOUT" ? "the table" : pluralize(p.partySize, "seat");
  return sign(`Pay ${formatMoney(p.amountCents)} to ${to} by ${formatEventDateTime(p.expiresAt)} to hold ${what} at ${p.eventTitle}. Put your name and the dinner in the memo. ${appUrl(`/bookings/${p.bookingId}`)}`);
}

export function bookingCancelledText(p: BookingCancelledProps) {
  return p.recipient === "chef"
    ? sign(`${p.guestName} cancelled their confirmed ${pluralize(p.partySize, "seat")} at ${p.eventTitle} (${formatEventDay(p.startsAt)}); refund ${formatMoney(p.amountCents)} if paid. The seats are back on sale: ${appUrl(`/chef/events/${p.eventId}`)}`)
    : sign(`${p.chefName} declined your request for ${p.eventTitle} (${formatEventDay(p.startsAt)}). Nothing is held or owed. Find another dinner: ${appUrl("/events")}`);
}

export function bookingConfirmedText(p: BookingConfirmedProps) {
  return sign(`You're in. ${p.chefName} confirmed your ${pluralize(p.partySize, "seat")} for ${p.eventTitle}, ${formatEventDateTime(p.startsAt)}, ${p.neighborhood}. Address arrives ${RULES.ADDRESS_REVEAL_HOURS}h before. BYOB. ${appUrl(`/bookings/${p.bookingId}`)}`);
}

export function requestExpiredText(p: RequestExpiredProps) {
  return p.eventOver
    ? sign(`Your request for ${p.eventTitle} expired unpaid and the dinner has passed. Find another: ${appUrl("/events")}`)
    : sign(`Your request for ${p.eventTitle} (${formatEventDay(p.startsAt)}) expired unpaid and the seats were released. Request again: ${appUrl(`/events/${p.eventId}`)}`);
}

export function eventCancelledText(p: EventCancelledProps) {
  if (p.recipient === "chef") {
    return sign(`${p.eventTitle} (${formatEventDay(p.startsAt)}) was cancelled: ${p.reason} ${pluralize(p.bookingsCancelled ?? 0, "booking")} released. ${appUrl("/chef")}`);
  }
  const refund = p.paidCents ? ` ${p.chefName} will refund your ${formatMoney(p.paidCents)}.` : "";
  return sign(`${p.eventTitle} on ${formatEventDay(p.startsAt)} is cancelled. ${p.reason}${refund} Find another dinner: ${appUrl("/events")}`);
}

/** Carries the exact address: PRIVATE. Only ever sent to a confirmed guest inside the reveal window. */
export function addressRevealText(p: AddressRevealProps) {
  const byob = p.byobNote ? ` BYOB: ${p.byobNote}` : " BYOB.";
  return sign(`${p.eventTitle} with ${p.chefName}, ${formatEventDateTime(p.startsAt)}. Address: ${p.address} (${p.neighborhood}, near ${p.crossStreets}).${byob} ${appUrl(`/bookings/${p.bookingId}`)}`);
}

export function reviewRequestText(p: ReviewRequestProps) {
  return sign(`How was ${p.eventTitle}? Leave ${p.chefName} an anonymous review (takes a minute): ${appUrl(`/bookings/${p.bookingId}`)}`);
}

export function chefApplicationDecidedText(p: ChefApplicationDecidedProps) {
  const note = p.note ? ` Note: ${p.note}` : "";
  return p.decision === "APPROVED"
    ? sign(`You're approved to host, ${p.chefName}. Publish your first dinner: ${appUrl("/chef/events/new")}${note}`)
    : sign(`Thanks for applying, ${p.chefName}. We can't approve your application right now.${note} You can apply again from ${appUrl("/chef")}`);
}

export function markAttendanceText(p: MarkAttendanceProps) {
  return sign(`${p.eventTitle} is wrapped. Mark who came (${pluralize(p.confirmedBookings, "confirmed booking")}) so guests can review you: ${appUrl(`/chef/events/${p.eventId}`)}`);
}
