import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type BookingCancelledProps = {
  /** "guest": the chef declined their unpaid request. "chef": a confirmed guest cancelled. */
  recipient: "guest" | "chef";
  guestName: string;
  chefName: string;
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  partySize: number;
  amountCents: number;
};

/** One booking released by the other party: the guest hears about a decline, the chef about a paid guest cancelling. */
export function bookingCancelledEmail(p: BookingCancelledProps) {
  const toChef = p.recipient === "chef";
  return {
    subject: toChef ? `${p.guestName} cancelled: ${p.eventTitle}` : `Your request for ${p.eventTitle} was declined`,
    react: (
      <EmailLayout
        preview={toChef ? `${pluralize(p.partySize, "seat")} freed at ${p.eventTitle}` : `${p.chefName} couldn't take your request`}
        heading={toChef ? "A guest cancelled" : "The chef declined your request"}
        cta={toChef ? { label: "Open the guest list", href: appUrl(`/chef/events/${p.eventId}`) } : { label: "Find another dinner", href: appUrl("/events") }}
      >
        <P>
          {toChef
            ? `Hi ${p.chefName}, ${p.guestName} cancelled their confirmed booking, so those seats are back on sale.`
            : `Hi ${p.guestName}, ${p.chefName} declined your seat request, so nothing is held and nothing is owed.`}
        </P>
        <Facts
          items={[
            ["Dinner", `${p.eventTitle} · ${formatEventDateTime(p.startsAt)}`],
            ["Seats", pluralize(p.partySize, "guest")],
            [toChef ? "They had paid" : "Amount", formatMoney(p.amountCents)],
          ]}
        />
        {toChef ? (
          <P>Please refund them the same way they paid. Cancellations more than 7 days out are refunded in full; inside that window the refund is at your discretion.</P>
        ) : (
          <P>Chefs usually decline when the table is spoken for or the group doesn&apos;t fit. If you already sent money, reply to this email and we&apos;ll sort it out with the chef.</P>
        )}
      </EmailLayout>
    ),
  };
}
