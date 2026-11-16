import { EmailLayout, P, appUrl } from "./layout";

export type PitchDecidedProps = {
  chefName: string;
  decision: "APPROVED" | "DECLINED";
  /** "Tue, Feb 3 · Bed-Stuy": the night, the way the board shows it. */
  nightLabel: string;
  title: string;
  note: string | null;
  /** The draft dinner an approval created. */
  eventId: string | null;
};

/** To the chef when an admin approves or declines their pitch for an open night. */
export function pitchDecidedEmail(p: PitchDecidedProps) {
  if (p.decision === "APPROVED" && p.eventId) {
    return {
      subject: "Your night is booked",
      react: (
        <EmailLayout preview={`${p.title}, ${p.nightLabel}: the room is yours`} heading="The room is yours" cta={{ label: "Review and publish", href: appUrl(`/chef/events/${p.eventId}/edit`) }}>
          <P>Hi {p.chefName}, your pitch for {p.nightLabel} is approved. {p.title} is saved as a draft with the room, the date and the time filled in.</P>
          {p.note && <P>A note from the team: {p.note}</P>}
          <P>Check the menu, the price and the seats, then publish it. Guests can book once it&apos;s live.</P>
        </EmailLayout>
      ),
    };
  }
  return {
    subject: "About your open-night pitch",
    react: (
      <EmailLayout preview={`We went another way for ${p.nightLabel}`} heading="Not this night" cta={{ label: "See open nights", href: appUrl("/chef/nights") }}>
        <P>Hi {p.chefName}, thanks for pitching {p.title}. We went another way for {p.nightLabel}.</P>
        {p.note && <P>From the team: {p.note}</P>}
        <P>There are more nights on the board; pitch another one any time.</P>
      </EmailLayout>
    ),
  };
}
