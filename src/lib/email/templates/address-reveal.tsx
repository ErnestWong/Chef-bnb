import { formatEventDateTime, pluralize } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type AddressRevealProps = {
  guestName: string;
  chefName: string;
  bookingId: string;
  eventTitle: string;
  startsAt: Date;
  partySize: number;
  address: string;
  neighborhood: string;
  crossStreets: string;
  byobNote: string | null;
  dietaryNotes: string | null;
};

/** To each confirmed guest 48 h before the dinner. Carries the exact address: PRIVATE. */
export function addressRevealEmail(p: AddressRevealProps) {
  return {
    subject: `Where to go: ${p.eventTitle}`,
    react: (
      <EmailLayout preview={`${p.eventTitle} is ${formatEventDateTime(p.startsAt)} at ${p.address}`} heading="Here's the address" cta={{ label: "View your booking", href: appUrl(`/bookings/${p.bookingId}`) }}>
        <P>Hi {p.guestName}, {p.chefName}&apos;s dinner is coming up. Here is where to go.</P>
        <Facts
          items={[
            ["Dinner", p.eventTitle],
            ["When", formatEventDateTime(p.startsAt)],
            ["Address", `${p.address} (${p.neighborhood}, near ${p.crossStreets})`],
            ["Your party", pluralize(p.partySize, "guest")],
            p.dietaryNotes ? ["Your dietary notes", p.dietaryNotes] : null,
          ]}
        />
        <P>{p.byobNote || "It's BYOB: bring whatever you'd like to drink; nothing is sold or included."} Please keep the address to your party.</P>
        <P>If you can no longer make it, cancel from your booking page so the chef can plan; refunds inside 48 hours are at the chef&apos;s discretion.</P>
      </EmailLayout>
    ),
  };
}
