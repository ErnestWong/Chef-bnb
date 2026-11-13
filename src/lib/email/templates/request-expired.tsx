import { formatEventDateTime } from "@/lib/format";
import { EmailLayout, Facts, P, appUrl } from "./layout";

export type RequestExpiredProps = {
  guestName: string;
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  /** True when the dinner ended before payment was marked (no point re-requesting). */
  eventOver: boolean;
};

/** To the guest when an unpaid request expires. */
export function requestExpiredEmail(p: RequestExpiredProps) {
  return {
    subject: `Your request for ${p.eventTitle} expired`,
    react: (
      <EmailLayout preview={`The seats you requested at ${p.eventTitle} were released`} heading="Your seat request expired" cta={p.eventOver ? { label: "Find another dinner", href: appUrl("/events") } : { label: "Request again", href: appUrl(`/events/${p.eventId}`) }}>
        <P>Hi {p.guestName}, the chef hadn&apos;t marked your request paid in time, so the seats have been released.</P>
        <Facts items={[["Dinner", p.eventTitle], ["When", formatEventDateTime(p.startsAt)]]} />
        {p.eventOver ? (
          <P>This dinner has already happened. If you did pay the chef, reply to this email and we&apos;ll sort it out with them.</P>
        ) : (
          <P>If seats are still open you can request again. If you already paid, request again and let the chef know; they can confirm you right away.</P>
        )}
      </EmailLayout>
    ),
  };
}
