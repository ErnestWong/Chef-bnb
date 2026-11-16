import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
import { RULES } from "@/lib/bookings/rules";
import { BRAND_PHOTOS } from "@/lib/brand-photos";

export const metadata: Metadata = {
  title: "Host a dinner",
  description: "Cook ticketed dinner parties at your place, in your own space, or in a room we've booked. Set the menu and the price; guests pay you directly.",
};

/** "Where will you cook?": the three paths a chef picks at onboarding (brand guide, "Where dinner happens"). */
const PATHS = [
  ["At your place", "Home", `Your kitchen, your table. ${RULES.MAX_HOME_GUESTS} guests at most and BYOB. The address stays private until 48 hours before.`],
  ["In your own space", "Room", "A restaurant, studio or standing pop-up you run or can use. One table that seats what the room holds, and its own licensed bar if it has one."],
  ["On one of our nights", "Room", "No room? Pick from nights we've booked with venues: restaurants on their slow nights, cafés after close. Pitch a menu; we say yes or no."],
] as const;

const STEPS = [
  ["Apply", "Three short steps: who you are, what you cook, how guests pay you. About three minutes."],
  ["We review by hand", "A real person reads every application, usually within a few days. You get an email either way."],
  ["Publish a dinner", "Pick a date, write the menu, set the price per seat, or pitch for an open night. Guests request seats and pay you directly."],
] as const;

const DEAL = [
  ["You set the menu and the price", "Per seat, in dollars. Solo seats, groups of 2–5, or a full buyout: you choose which you allow."],
  ["Guests pay you directly", "Venmo or Zelle. You mark a booking paid and the seat is confirmed. No platform fee for now."],
  ["One table, one seating", `Everyone sits together and starts together. ${RULES.MAX_HOME_GUESTS} at most at home; a room seats what it holds. Set your own minimum; if it isn't met 72 hours out, the dinner cancels itself and everyone is told.`],
  ["You never sell drinks", "At home it's BYOB. In a room, the venue's own licensed bar may pour; that's the venue's, never part of your ticket."],
  ["Your address stays private", "Guests see the neighborhood and cross streets. Confirmed guests get the address by text 48 hours before."],
  ["Reviews build your profile", "Guests who attended can leave an anonymous review. Dinners hosted and ratings show on your page."],
] as const;

const NEEDS = [
  "Somewhere to cook in New York City: your place, a space you run, or one of our open nights",
  "A sample menu and a sentence or two about how you cook",
  "A Venmo or Zelle handle for guests to pay",
] as const;

/** Public pitch for chefs; the application itself is behind sign-in at /chef/apply. */
export default function HostPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-line">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.25em] text-accent">For chefs</p>
            <h1 className="font-display text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">Cook for a full table.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Your menu, your price. Cook at your place, in your own space, or on a night we&apos;ve already booked a room for. We fill the seats and handle the bookings; you cook and keep the money.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <ButtonLink href="/chef/apply">Start your application</ButtonLink>
              <span className="font-mono text-xs uppercase tracking-wide text-muted">About three minutes</span>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper-2 sm:aspect-[3/2] lg:aspect-[4/5]">
            <Image src={BRAND_PHOTOS.host.src} alt={BRAND_PHOTOS.host.alt} fill priority sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          </div>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Where will you cook?</p>
          <h2 className="font-display mt-2 text-3xl">Same table, three kinds of room.</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {PATHS.map(([title, format, body]) => (
              <li key={title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
                <p className="font-mono text-xs uppercase tracking-wide text-muted">{format}</p>
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="text-sm text-muted">{body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-prose text-sm text-muted">
            Wherever it is, a dinner on Covers is one table and one seating: everyone starts together, you come out to the room, and guests sit with people they haven&apos;t met.
          </p>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16">
          <h2 className="font-display text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span aria-hidden className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg text-accent">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-2xl">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="border-b border-line">
        <Container className="py-16">
          <h2 className="font-display text-3xl">The deal</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {DEAL.map(([title, body]) => (
              <div key={title}>
                <dt className="font-medium">{title}</dt>
                <dd className="mt-1.5 text-sm text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section>
        <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_380px]">
          <div>
            <h2 className="font-display text-3xl">What you need</h2>
            <ul className="mt-6 flex flex-col gap-3 text-sm">
              {NEEDS.map((n) => (
                <li key={n} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 text-accent">✓</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-prose text-sm text-muted">
              Not sure you qualify? Apply anyway and say so in the credentials box; we read every one. Want to see what a dinner looks like first?{" "}
              <Link href="/events" className="text-accent underline-offset-2 hover:underline">Browse the calendar</Link>. The full rules for hosts are in the{" "}
              <Link href="/terms#chefs" className="text-accent underline-offset-2 hover:underline">terms</Link>.
            </p>
          </div>
          <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <p className="font-display text-2xl">Ready when you are</p>
            <p className="text-sm text-muted">Sign in with your phone, answer three screens, and you&apos;re in the queue. You can publish your first dinner the moment you&apos;re approved.</p>
            <ButtonLink href="/chef/apply">Start your application</ButtonLink>
          </aside>
        </Container>
      </section>
    </main>
  );
}
