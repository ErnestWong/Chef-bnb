import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { RULES } from "@/lib/bookings/rules";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type BookingConfirmedProps = {
  guestName: string;
  chefName: string;
  bookingId: string;
  eventTitle: string;
  startsAt: Date;
  partySize: number;
  amountCents: number;
  neighborhood: string;
  crossStreets: string;
};

/** To the guest when the chef marks their booking paid. */
export function bookingConfirmedEmail(p: BookingConfirmedProps) {
  return {
    subject: `You're in: ${p.eventTitle}`,
    react: (
      <EmailLayout preview={`${p.chefName} confirmed your ${pluralize(p.partySize, "seat")} for ${formatEventDateTime(p.startsAt)}`} heading="You're in" cta={{ label: "View your booking", href: appUrl(`/bookings/${p.bookingId}`) }}>
        <P>Hi {p.guestName}, {p.chefName} has confirmed your payment and your seats are locked in.</P>
        <Facts
          items={[
            ["Dinner", p.eventTitle],
            ["When", formatEventDateTime(p.startsAt)],
            ["Where", `${p.neighborhood}, near ${p.crossStreets}`],
            ["Seats", pluralize(p.partySize, "guest")],
            ["Paid", formatMoney(p.amountCents)],
          ]}
        />
        <P>The exact address arrives by email {RULES.ADDRESS_REVEAL_HOURS} hours before the dinner. It&apos;s BYOB, so bring whatever you&apos;d like to drink.</P>
      </EmailLayout>
    ),
  };
}
