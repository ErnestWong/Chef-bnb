import type { BookingType } from "@/generated/prisma/enums";
import { BOOKING_TYPE_LABELS } from "@/components/booking-status";
import { formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type SeatRequestedProps = {
  chefName: string;
  guestName: string;
  bookingType: BookingType;
  partySize: number;
  amountCents: number;
  dietaryNotes: string | null;
  eventId: string;
  eventTitle: string;
  startsAt: Date;
};

/** To the chef when a guest requests seats. */
export function seatRequestedEmail(p: SeatRequestedProps) {
  const url = appUrl(`/chef/events/${p.eventId}`);
  return {
    subject: `New seat request: ${p.eventTitle}`,
    react: (
      <EmailLayout preview={`${p.guestName} wants ${pluralize(p.partySize, "seat")} at ${p.eventTitle}`} heading="You have a seat request" cta={{ label: "Open the guest list", href: url }}>
        <P>Hi {p.chefName}, {p.guestName} just requested seats at your dinner. The seats are held while they pay you directly; mark the booking paid once the money arrives to confirm it.</P>
        <Facts
          items={[
            ["Dinner", `${p.eventTitle} · ${formatEventDateTime(p.startsAt)}`],
            ["Request", `${BOOKING_TYPE_LABELS[p.bookingType]}, ${pluralize(p.partySize, "guest")}`],
            ["Amount due to you", formatMoney(p.amountCents)],
            p.dietaryNotes ? ["Dietary notes", p.dietaryNotes] : null,
          ]}
        />
        <P>Unpaid requests expire on their own after 48 hours and the seats go back on sale.</P>
      </EmailLayout>
    ),
  };
}
