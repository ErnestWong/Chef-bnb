import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, type LegalSection } from "@/components/legal";
import { RULES } from "@/lib/bookings/rules";
import { HOUSE_RULES } from "@/lib/policies";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The rules for booking and hosting dinners on ${SITE_NAME}.`,
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-accent underline-offset-2 hover:underline">{children}</Link>
);

const SECTIONS: LegalSection[] = [
  {
    id: "what-this-is",
    heading: "What this is",
    body: (
      <>
        <p>
          {SITE_NAME} is a website where independent chefs list ticketed dinner parties in New York City and guests book seats at them. We run the listings, the booking flow and the emails. The chef hosts the dinner, cooks the food and takes the payment.
        </p>
        <p>
          We are not the host, the cook, the restaurant or the seller of any meal. When you book a seat you are making an arrangement with the chef; when you host, you are making one with your guests. These terms cover how the site works and what we expect from everyone using it. By using the site you agree to them.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Your account",
    body: (
      <>
        <p>You need an account to book or host. You must be at least 18 years old, give us accurate information, and keep your sign-in to yourself. Whatever happens under your account is your responsibility, so tell us if you think someone else has used it.</p>
        <p>We can suspend or close an account that breaks these terms, mistreats a chef or guest, or is used for anything fraudulent or unlawful. You can close yours at any time; see the <A href="/privacy">privacy policy</A> for what happens to your data.</p>
      </>
    ),
  },
  {
    id: "house-rules",
    heading: "House rules for every dinner",
    body: (
      <>
        <p>These apply to every dinner on the site, whoever is hosting.</p>
        <LegalList items={HOUSE_RULES.map((r) => (
          <>
            <span className="font-medium">{r.title}.</span> {r.body}
          </>
        ))} />
        <p>Chefs may add their own house rules on a listing, such as shoes off or no photos of the apartment. Those are part of the deal too.</p>
      </>
    ),
  },
  {
    id: "booking",
    heading: "Booking and paying",
    body: (
      <>
        <p>Booking works like this:</p>
        <LegalList items={[
          <>You request a solo seat, a group of up to {RULES.GROUP_CAP}, or a buyout of the whole table, depending on what the chef allows.</>,
          <>We show you the chef&apos;s payment details (Venmo or Zelle) and hold the seats for {RULES.REQUEST_EXPIRY_HOURS} hours while you pay the chef directly.</>,
          <>The chef marks your request paid and your seats are confirmed. If you haven&apos;t paid within {RULES.REQUEST_EXPIRY_HOURS} hours the request expires and the seats go back on sale.</>,
        ]} />
        <p>
          The price is per seat and set by the chef. A buyout is charged for at least the chef&apos;s minimum number of guests, even if fewer people come. {SITE_NAME} does not charge guests or chefs any fee today; if we introduce one we will say so on the site before it applies.
        </p>
        <p>We never touch the money. Payment, receipts and any refund are between you and the chef.</p>
      </>
    ),
  },
  {
    id: "cancellations",
    heading: "Cancellations and refunds",
    body: (
      <>
        <LegalList items={[
          <><span className="font-medium">If you cancel.</span> You can cancel a request or a confirmed booking from your bookings page up until the dinner starts. Whether you get money back is up to the chef and how close to the dinner you cancel; ask them. Many chefs have already bought the food.</>,
          <><span className="font-medium">If the chef cancels.</span> We tell you by email straight away. The chef should refund you in full.</>,
          <><span className="font-medium">If the dinner doesn&apos;t fill.</span> Each chef sets a minimum. If it isn&apos;t reached {RULES.GO_NO_GO_HOURS} hours before the dinner, the dinner is cancelled automatically, everyone is emailed, and the chef should refund anyone who paid.</>,
          <><span className="font-medium">If you don&apos;t show up.</span> The chef can mark you a no-show. No-shows are not refunded and repeated no-shows may lose their account.</>,
        ]} />
        <p>Tell the chef about allergies and dietary needs when you book. The chef decides what they can accommodate and will tell you if they can&apos;t.</p>
      </>
    ),
  },
  {
    id: "chefs",
    heading: "If you host",
    body: (
      <>
        <p>Chefs on {SITE_NAME} are independent. You are not our employee, contractor or agent, and you set your own menu, price and dates. In return you agree that:</p>
        <LegalList items={[
          "You are responsible for the food, the space, the safety of your guests, and for following the laws that apply to you, including food safety rules, your lease or co-op rules, and any permits, licenses, insurance and taxes.",
          "Your listing is accurate: menu, price, date, location, how many seats, and what you can accommodate.",
          "You honor confirmed bookings, and if you have to cancel, you refund your guests in full and tell them promptly.",
          "You mark bookings paid, attended or no-show truthfully, since those records drive confirmations, address reveal and reviews.",
          "You keep guests' names, dietary notes and contact details private and use them only to host the dinner.",
          "You never sell alcohol or include it in the price, and you never seat more than the guest cap.",
        ]} />
        <p>We review every chef application by hand, but that review is not an inspection or a license. We can pause or remove a listing or a chef account at any time, and we will tell you why.</p>
      </>
    ),
  },
  {
    id: "reviews",
    heading: "Reviews and what you post",
    body: (
      <>
        <p>Guests who attended a dinner can review it for {RULES.REVIEW_WINDOW_DAYS} days afterwards, once per booking. Reviews are shown without the author&apos;s name. Write about your own experience, honestly. We remove reviews that are abusive, off-topic, written about someone else&apos;s dinner, or part of a dispute over money; the chef cannot edit or remove them.</p>
        <p>Anything you post (bios, menus, photos, reviews, notes) stays yours. You give us permission to show it on the site and in our emails so the marketplace works, and you promise you have the right to post it.</p>
      </>
    ),
  },
  {
    id: "liability",
    heading: "Our role and the limits of it",
    body: (
      <>
        <p>We provide the site as it is. We don&apos;t inspect kitchens, taste the food, or guarantee any chef, guest, dinner or payment. You attend and host dinners at your own risk, and you look to the other party, not to us, for anything that goes wrong at the table: the food, the space, injuries, allergies, lost property or money owed.</p>
        <p>To the fullest extent New York law allows, {SITE_NAME} and the people who run it are not liable for indirect or consequential losses, and our total liability to you for anything connected to the site is limited to the greater of one hundred dollars or the amount you paid to a chef through a booking made on the site in the previous twelve months. Nothing here limits liability that the law says can&apos;t be limited.</p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: (
      <p>We may update these terms as the site changes. We&apos;ll post the new version here with a new date, and for anything significant we&apos;ll email account holders. Using the site after the change means you accept it.</p>
    ),
  },
  {
    id: "law",
    heading: "Governing law and contact",
    body: (
      <p>These terms are governed by the laws of the State of New York, and any dispute will be heard in the state or federal courts in New York County. If a part of these terms turns out to be unenforceable, the rest still applies. To reach us, use the address at the bottom of this page.</p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      sibling={{ href: "/privacy", label: "privacy policy" }}
      intro={
        <p>
          The short version: chefs host, guests pay chefs directly, every dinner is BYOB with at most {RULES.MAX_GUESTS} guests, and {SITE_NAME} runs the listings and bookings in between. The long version is below, in plain language.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
