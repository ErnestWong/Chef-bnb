import { RULES } from "@/lib/bookings/rules";
import { formatEventDay } from "@/lib/format";
import { EmailLayout, P, appUrl } from "./layout";

export type ReviewRequestProps = {
  guestName: string;
  chefName: string;
  bookingId: string;
  eventTitle: string;
  startsAt: Date;
};

/** To the guest once the chef marks them attended. */
export function reviewRequestEmail(p: ReviewRequestProps) {
  return {
    subject: `How was ${p.eventTitle}?`,
    react: (
      <EmailLayout preview={`Leave ${p.chefName} a review for ${p.eventTitle}`} heading={`How was ${p.eventTitle}?`} cta={{ label: "Leave a review", href: appUrl(`/bookings/${p.bookingId}`) }}>
        <P>Hi {p.guestName}, thanks for coming to {p.chefName}&apos;s table on {formatEventDay(p.startsAt)}. Reviews are anonymous and help the next guest pick a dinner, and they help {p.chefName} fill the next one.</P>
        <P>You have {RULES.REVIEW_WINDOW_DAYS} days to leave one, from your booking page.</P>
      </EmailLayout>
    ),
  };
}
