import { formatEventDateTime, pluralize } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type MarkAttendanceProps = {
  chefName: string;
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  confirmedBookings: number;
};

/** To the chef once a dinner has ended: mark who came so guests get their review request. */
export function markAttendanceEmail(p: MarkAttendanceProps) {
  return {
    subject: `Who came to ${p.eventTitle}?`,
    react: (
      <EmailLayout preview="Mark attendance so your guests can leave reviews" heading="How did it go?" cta={{ label: "Mark attendance", href: appUrl(`/chef/events/${p.eventId}`) }}>
        <P>Hi {p.chefName}, {p.eventTitle} is wrapped. Mark each confirmed booking attended or no-show on the guest list; attended guests are then invited to leave you a review.</P>
        <Facts items={[["Dinner", `${p.eventTitle} · ${formatEventDateTime(p.startsAt)}`], ["Confirmed bookings", pluralize(p.confirmedBookings, "booking")]]} />
      </EmailLayout>
    ),
  };
}
