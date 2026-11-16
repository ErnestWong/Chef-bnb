import { formatEventDateTime, pluralize } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type AddressRevealProps = {
  guestName: string;
  chefName: string;
  bookingId: string;
  eventTitle: string;
  startsAt: Date;
  partySize: number;
  /** The venue's name for a room ("Café on Fulton"); null for a home. */
  venueName: string | null;
  address: string;
  neighborhood: string;
  crossStreets: string;
  /** False when the venue's licensed bar is open instead. */
  byob: boolean;
  byobNote: string | null;
  dietaryNotes: string | null;
};

/** The street address line, with the room's name in front when there is one. */
export function addressLine(p: Pick<AddressRevealProps, "venueName" | "address" | "neighborhood" | "crossStreets">): string {
  return `${p.venueName ? `${p.venueName}, ` : ""}${p.address} (${p.neighborhood}, near ${p.crossStreets})`;
}

/** What to do about drinks, in one sentence. */
export function drinksLine(p: Pick<AddressRevealProps, "byob" | "byobNote">): string {
  if (p.byob) return p.byobNote || "It's BYOB: bring whatever you'd like to drink; nothing is sold or included.";
  return p.byobNote || "The venue's bar is open; drinks aren't part of your ticket.";
}

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
            ["Address", addressLine(p)],
            ["Your party", pluralize(p.partySize, "guest")],
            p.dietaryNotes ? ["Your dietary notes", p.dietaryNotes] : null,
          ]}
        />
        <P>{drinksLine(p)} Please keep the address to your party.</P>
        <P>If you can no longer make it, cancel from your booking page so the chef can plan; refunds inside 48 hours are at the chef&apos;s discretion.</P>
      </EmailLayout>
    ),
  };
}
