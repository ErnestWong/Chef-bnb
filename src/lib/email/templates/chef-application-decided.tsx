import { EmailLayout, P, appUrl } from "./layout";

export type ChefApplicationDecidedProps = {
  chefName: string;
  decision: "APPROVED" | "REJECTED";
  note: string | null;
};

/** To the applicant when an admin approves or rejects their chef application. */
export function chefApplicationDecidedEmail(p: ChefApplicationDecidedProps) {
  if (p.decision === "APPROVED") {
    return {
      subject: "You're approved to host on Chef-bnb",
      react: (
        <EmailLayout preview="Your chef profile is live; post your first dinner" heading="Welcome aboard" cta={{ label: "Create your first dinner", href: appUrl("/chef/events/new") }}>
          <P>Hi {p.chefName}, your application has been approved. Your profile is live and you can publish dinners from your chef dashboard.</P>
          {p.note && <P>A note from the team: {p.note}</P>}
          <P>Guests pay you directly with the handle on your profile; mark each booking paid as the money lands. Every dinner is BYOB and seats ten at most.</P>
        </EmailLayout>
      ),
    };
  }
  return {
    subject: "About your Chef-bnb application",
    react: (
      <EmailLayout preview="We can't approve your chef application right now" heading="About your application" cta={{ label: "View your account", href: appUrl("/account") }}>
        <P>Hi {p.chefName}, thanks for applying to host. We aren&apos;t able to approve your application right now.</P>
        {p.note && <P>From the team: {p.note}</P>}
        <P>You&apos;re welcome to apply again later; reply to this email if you have questions.</P>
      </EmailLayout>
    ),
  };
}
