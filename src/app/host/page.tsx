import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
import { RULES } from "@/lib/bookings/rules";

export const metadata: Metadata = {
  title: "Host a dinner",
  description: "Cook ticketed dinner parties at home for up to ten guests. Set the menu and the price; guests pay you directly.",
};

const STEPS = [
  ["Apply", "Three short steps: who you are, what you cook, how guests pay you. About three minutes."],
  ["We review by hand", "A real person reads every application, usually within a few days. You get an email either way."],
  ["Publish a dinner", "Pick a date, write the menu, set the price per seat. Guests request seats and pay you directly."],
] as const;

const DEAL = [
  ["You set the menu and the price", "Per seat, in dollars. Solo seats, groups of 2–5, or a full buyout: you choose which you allow."],
  ["Guests pay you directly", "Venmo or Zelle. You mark a booking paid and the seat is confirmed. No platform fee for now."],
  [`${RULES.MAX_GUESTS} guests at most`, "Small tables, home kitchens. Set your own minimum; if it isn't met 72 hours out, the dinner cancels itself and everyone is told."],
  ["BYOB, always", "Nothing is sold or poured by you. Guests bring the bottle; you bring the food."],
  ["Your address stays private", "Guests see the neighborhood and cross streets. Confirmed guests get the address by email 48 hours before."],
  ["Reviews build your profile", "Guests who attended can leave an anonymous review. Dinners hosted and ratings show on your page."],
] as const;

const NEEDS = [
  "A kitchen and a table in New York City, yours or a venue you can use",
  "A NYC Food Protection Certificate, or a plan to get one (it helps approval)",
  "A sample menu and a sentence or two about how you cook",
  "A Venmo or Zelle handle for guests to pay",
] as const;

/** Public pitch for chefs; the application itself is behind sign-in at /chef/apply. */
export default function HostPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-line">
        <Container className="py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-accent">For chefs</p>
            <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">Cook for a table of ten.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Host ticketed dinner parties at home. We bring the guests and handle the bookings; you bring the food and keep the money.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <ButtonLink href="/chef/apply">Start your application</ButtonLink>
              <span className="text-sm text-muted">About three minutes. No photos needed yet.</span>
            </div>
          </div>
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
              <Link href="/events" className="text-accent underline-offset-2 hover:underline">Browse the calendar</Link>.
            </p>
          </div>
          <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <p className="font-display text-2xl">Ready when you are</p>
            <p className="text-sm text-muted">Sign in with your email, answer three screens, and you&apos;re in the queue. You can publish your first dinner the moment you&apos;re approved.</p>
            <ButtonLink href="/chef/apply">Start your application</ButtonLink>
          </aside>
        </Container>
      </section>
    </main>
  );
}
