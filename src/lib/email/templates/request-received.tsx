import { BOOKING_TYPE_LABELS } from "@/components/booking-status";
import type { BookingType } from "@/generated/prisma/enums";
import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type RequestReceivedProps = {
  guestName: string;
  chefName: string;
  bookingId: string;
  eventTitle: string;
  startsAt: Date;
  bookingType: BookingType;
  partySize: number;
  amountCents: number;
  /** PRIVATE until a seat is requested; this guest has just requested one. */
  paymentHandle: string | null;
  paymentNote: string | null;
  expiresAt: Date;
};

/** To the guest right after they request seats: how much, to whom, by when. */
export function requestReceivedEmail(p: RequestReceivedProps) {
  const url = appUrl(`/bookings/${p.bookingId}`);
  return {
    subject: `Pay ${formatMoney(p.amountCents)} to hold your seats: ${p.eventTitle}`,
    react: (
      <EmailLayout preview={`Send ${formatMoney(p.amountCents)} to ${p.chefName} by ${formatEventDateTime(p.expiresAt)}`} heading="One more step: pay the chef" cta={{ label: "Open your booking", href: url }}>
        <P>
          Hi {p.guestName}, your seats at {p.eventTitle} are held while you pay {p.chefName} directly. Once they mark the money received, your booking is confirmed and you get an email.
        </P>
        <Facts
          items={[
            ["Dinner", `${p.eventTitle} · ${formatEventDateTime(p.startsAt)}`],
            ["Seats", `${BOOKING_TYPE_LABELS[p.bookingType]}, ${pluralize(p.partySize, "guest")}`],
            ["Send", formatMoney(p.amountCents)],
            ["To", p.paymentHandle ?? `${p.chefName} (they'll send payment details)`],
            p.paymentNote ? ["Note from the chef", p.paymentNote] : null,
            ["Pay by", formatEventDateTime(p.expiresAt)],
          ]}
        />
        <P>If nothing arrives by then the seats go back on sale. Put your name and the dinner in the payment memo so the chef can match it.</P>
      </EmailLayout>
    ),
  };
}
