import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, type LegalSection } from "@/components/legal";
import { RULES } from "@/lib/bookings/rules";
import { RATE_LIMIT_RETENTION_SECONDS } from "@/lib/security/limits";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${SITE_NAME} collects, who sees it, and how to get it removed.`,
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-accent underline-offset-2 hover:underline">{children}</Link>
);

const RATE_LIMIT_RETENTION_DAYS = Math.round(RATE_LIMIT_RETENTION_SECONDS / 86_400);

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    heading: "What we collect",
    body: (
      <>
        <p>Only what the marketplace needs to work.</p>
        <LegalList items={[
          <><span className="font-medium">Account.</span> Your mobile number, which is how you sign in, and the name you give us. An email address if you add one, which chefs must.</>,
          <><span className="font-medium">Chef applications and profiles.</span> Display name, bio, credentials, cuisines, Instagram and website if you give them, the borough you host in, whether you need a venue or front-of-house help, your Venmo or Zelle handle, your NYC Food Protection Certificate number, and the address of each venue you host at.</>,
          <><span className="font-medium">Bookings.</span> Which dinner, how many seats, the booking type, dietary notes you write for the chef, and the status history of each booking (requested, paid, confirmed, cancelled, attended, no-show) with who changed it and when.</>,
          <><span className="font-medium">Reviews.</span> Your rating, your words, and which booking they belong to.</>,
          <><span className="font-medium">Technical.</span> Your IP address and the time of certain requests, used to limit abuse (for example too many sign-in attempts). Our hosting provider also keeps ordinary server logs.</>,
        ]} />
      </>
    ),
  },
  {
    id: "how-we-use-it",
    heading: "How we use it",
    body: (
      <LegalList items={[
        "To run the marketplace: show listings, take seat requests, let chefs confirm them, and keep track of who is coming.",
        "To send the texts and emails the site depends on: your sign-in code, seat requested, confirmed or cancelled, the address reveal before a dinner, a request to review afterwards, and the decision on a chef application. These are transactional; we don't send marketing messages.",
        "To keep the site safe: rate limits, spotting abuse, resolving disputes between a chef and a guest, and keeping the booking record straight.",
        "To meet legal obligations if they arise.",
      ]} />
    ),
  },
  {
    id: "who-sees-what",
    heading: "Who sees what",
    body: (
      <>
        <p>Most of your information is only visible to the people who need it for a specific dinner.</p>
        <LegalList items={[
          <><span className="font-medium">Everyone.</span> A chef&apos;s public profile: display name, bio, credentials, cuisines, the neighborhood they host in, dinners hosted, and reviews. Reviews appear without the author&apos;s name. Dinner pages show the neighborhood and nearby cross streets, never the address.</>,
          <><span className="font-medium">The chef hosting your dinner.</span> Your name, your mobile number (and email if you have one), your party size and your dietary notes, from the moment you request seats, so they can confirm payment, reach you on the day and cook for you. Chefs agree in the <A href="/terms">terms</A> to use this only to host the dinner.</>,
          <><span className="font-medium">Guests at a dinner.</span> The chef&apos;s payment handle once you request seats, and the exact address by email {RULES.ADDRESS_REVEAL_HOURS} hours before the dinner, only if your booking is confirmed. Guests don&apos;t see each other&apos;s details.</>,
          <><span className="font-medium">{SITE_NAME} administrators.</span> All of the above, including who wrote each review, so we can approve chefs, act on abuse and sort out disputes.</>,
        ]} />
        <p>We don&apos;t sell personal information and we don&apos;t show ads.</p>
      </>
    ),
  },
  {
    id: "providers",
    heading: "Services we rely on",
    body: (
      <>
        <p>These companies process data on our behalf to run the site. Each only gets what its job needs.</p>
        <LegalList items={[
          <><span className="font-medium">Vercel</span> hosts the site and keeps server logs.</>,
          <><span className="font-medium">Neon</span> stores the database.</>,
          <><span className="font-medium">Twilio</span> sends the sign-in codes and our texts.</>,
          <><span className="font-medium">Resend</span> delivers our email.</>,
          <><span className="font-medium">Mapbox</span> draws the neighborhood map on dinner pages, when enabled; your browser fetches the map tiles from them.</>,
          <><span className="font-medium">Google</span> may offer sign-in later; if so it would share your name, email and profile picture with us.</>,
        ]} />
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies",
    body: (
      <p>We set the cookies needed to keep you signed in and to protect forms against forgery, and nothing else. There are no advertising or cross-site tracking cookies. If we add privacy-respecting analytics later, we&apos;ll say so here.</p>
    ),
  },
  {
    id: "retention",
    heading: "How long we keep it",
    body: (
      <LegalList items={[
        "Your account and profile: until you ask us to delete it.",
        "Bookings and their history: for as long as the chef and guest accounts exist, since they are the record of who paid for and attended what.",
        `Rate-limit counters: deleted after ${RATE_LIMIT_RETENTION_DAYS} days.`,
        "Reviews we remove for abuse: hidden from the site but kept, so the removal can be reviewed.",
        "Email: our email provider keeps delivery logs for a limited time under its own policy.",
      ]} />
    ),
  },
  {
    id: "your-choices",
    heading: "Your choices",
    body: (
      <>
        <p>You can see and change most of your details from your <A href="/account">account page</A> and, for chefs, your profile. To get a copy of everything we hold about you, or to delete your account, write to the address at the bottom of this page; we&apos;ll handle it within thirty days.</p>
        <p>Deleting your account removes your name, number and email. Bookings and reviews you took part in are kept in an anonymized form so the chef&apos;s record stays accurate.</p>
        <p>Every text and email we send is one the site needs to function, so there is no marketing list to unsubscribe from. Reply STOP to any text to stop texts; you can still sign in with a code.</p>
      </>
    ),
  },
  {
    id: "children",
    heading: "Age",
    body: <p>{SITE_NAME} is for adults. We don&apos;t knowingly collect information from anyone under 18; if you think we have, tell us and we&apos;ll delete it.</p>,
  },
  {
    id: "changes",
    heading: "Changes and contact",
    body: (
      <p>When this policy changes we&apos;ll post the new version here with a new date, and email account holders about anything significant. Questions, requests and complaints go to the address below.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      sibling={{ href: "/terms", label: "terms of service" }}
      intro={
        <p>
          We collect what it takes to seat you at a chef&apos;s table and nothing more. Chefs see the guests at their own dinners, guests see a chef&apos;s address only once confirmed and only shortly before, and reviews are anonymous to everyone but us.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
