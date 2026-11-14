import { formatEventDateTime, formatMoney } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type EventCancelledProps = {
  recipientName: string;
  recipient: "guest" | "chef";
  chefName: string;
  eventTitle: string;
  startsAt: Date;
  /** Why: the chef's reason, or the under-minimum notice. */
  reason: string;
  cancelledBy: "chef" | "system";
  /** Guest only: what they had paid (0 when the request was still unpaid). */
  paidCents?: number;
  /** Chef only: how many bookings were released. */
  bookingsCancelled?: number;
};

/** To every guest with an active booking, and to the chef, when a dinner is cancelled. */
export function eventCancelledEmail(p: EventCancelledProps) {
  const toChef = p.recipient === "chef";
  return {
    subject: `Cancelled: ${p.eventTitle}`,
    react: (
      <EmailLayout
        preview={`${p.eventTitle} on ${formatEventDateTime(p.startsAt)} is cancelled`}
        heading={toChef ? "Your dinner was cancelled" : "This dinner is cancelled"}
        cta={toChef ? { label: "Open your dashboard", href: appUrl("/chef") } : { label: "Find another dinner", href: appUrl("/events") }}
      >
        <P>
          Hi {p.recipientName},{" "}
          {toChef
            ? p.cancelledBy === "system"
              ? `fewer than your minimum number of guests had confirmed by the cutoff, so ${p.eventTitle} has been cancelled and its bookings released.`
              : `${p.eventTitle} has been cancelled and its bookings released.`
            : `${p.chefName} won't be hosting ${p.eventTitle} after all.`}
        </P>
        <Facts
          items={[
            ["Dinner", p.eventTitle],
            ["Was", formatEventDateTime(p.startsAt)],
            ["Reason", p.reason],
            toChef && p.bookingsCancelled !== undefined ? ["Bookings released", String(p.bookingsCancelled)] : null,
            !toChef && p.paidCents ? ["You paid", formatMoney(p.paidCents)] : null,
          ]}
        />
        {toChef ? (
          <P>{p.bookingsCancelled ? "Please refund anyone who already paid you. Guests have been told the dinner is off." : "No guests had booked, so there is nothing to refund."}</P>
        ) : p.paidCents ? (
          <P>{p.chefName} will refund you in full, the same way you paid. If it hasn&apos;t arrived in a few days, reply to this email.</P>
        ) : (
          <P>You hadn&apos;t paid yet, so there is nothing to refund.</P>
        )}
      </EmailLayout>
    ),
  };
}
