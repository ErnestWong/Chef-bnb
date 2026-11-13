import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VenueMap } from "@/components/venue-map";
import { Badge, ButtonLink, Container, Monogram } from "@/components/ui";
import { formatDuration, formatEventDay, formatEventTime, formatMoney, pluralize } from "@/lib/format";
import { RULES } from "@/lib/bookings/rules";
import { getPublicEvent } from "@/lib/queries/events";

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const event = await getPublicEvent((await params).id);
  return { title: event?.title ?? "Dinner" };
}

type Course = { name?: string; description?: string; dietary?: string };

export default function EventPage({ params }: PageProps<"/events/[id]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <EventDetails params={params} />
      </Suspense>
    </main>
  );
}

async function EventDetails({ params }: { params: PageProps<"/events/[id]">["params"] }) {
  const event = await getPublicEvent((await params).id);
  if (!event) notFound();

  const past = event.status !== "PUBLISHED";
  const soldOut = event.seatsLeft === 0;
  const courses = Array.isArray(event.menu?.courses) ? (event.menu!.courses as Course[]) : [];
  const types = event.allowedBookingTypes;

  return (
    <>
      <Container className="py-12">
        <p className="text-sm text-muted">
          <Link href="/events" className="hover:text-accent">Dinners</Link> / {formatEventDay(event.startsAt)}
        </p>
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_360px]">
          <article>
            <div className="flex flex-wrap gap-1.5">
              {event.cuisines.map((c) => (
                <Badge key={c.id}>{c.name}</Badge>
              ))}
              {event.status === "CANCELLED" && <Badge tone="warn">Cancelled</Badge>}
              {event.status === "COMPLETED" && <Badge>Past dinner</Badge>}
            </div>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{event.title}</h1>
            <p className="mt-3 text-lg">
              {formatEventDay(event.startsAt)} at {formatEventTime(event.startsAt)} · {formatDuration(event.durationMin)}
            </p>
            {event.description && <p className="mt-6 max-w-prose text-base leading-relaxed">{event.description}</p>}

            <section className="mt-10">
              <h2 className="font-display text-2xl">Menu</h2>
              {courses.length > 0 ? (
                <ol className="mt-4 flex flex-col gap-4">
                  {courses.map((c, i) => (
                    <li key={i} className="border-l-2 border-accent pl-4">
                      <p className="font-medium">{c.name ?? `Course ${i + 1}`}</p>
                      {c.description && <p className="text-sm text-muted">{c.description}</p>}
                      {c.dietary && <p className="text-xs text-muted">{c.dietary}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-muted">The chef will share the menu closer to the date.</p>
              )}
              {event.menu?.pdfUrl && (
                <a href={event.menu.pdfUrl} className="mt-4 inline-block text-sm text-accent underline-offset-2 hover:underline">
                  Menu PDF
                </a>
              )}
            </section>

            <section className="mt-10 grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl">Good to know</h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  <li>
                    <span className="font-medium">BYOB.</span> {event.byobNote ?? "Bring whatever you'd like to drink; nothing is sold or included."}
                  </li>
                  <li>
                    <span className="font-medium">Table of {event.maxGuests} at most.</span> The dinner runs if at least {event.minGuests} confirm by {RULES.GO_NO_GO_HOURS} hours before.
                  </li>
                  {event.dietaryNotes && (
                    <li>
                      <span className="font-medium">Dietary.</span> {event.dietaryNotes}
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h2 className="font-display text-2xl">Where</h2>
                <div className="mt-3">
                  <VenueMap
                    neighborhood={event.venue.neighborhood}
                    borough={event.venue.borough}
                    crossStreets={event.venue.crossStreets}
                    lat={event.venue.lat}
                    lng={event.venue.lng}
                  />
                </div>
              </div>
            </section>
          </article>

          <aside className="flex h-fit flex-col gap-5 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-6">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-3xl">{formatMoney(event.priceCents)}</p>
              <p className="text-sm text-muted">per seat</p>
            </div>
            <p className="text-sm">
              {past ? (
                <span className="text-muted">This dinner is no longer taking bookings.</span>
              ) : soldOut ? (
                <span className="font-medium">{event.mode === "BOUGHT_OUT" ? "Bought out" : "Full"}</span>
              ) : (
                <>
                  <span className="font-medium">{pluralize(event.seatsLeft, "seat")} left</span>
                  <span className="text-muted"> of {event.maxGuests}</span>
                </>
              )}
            </p>
            {!past && (
              <ul className="flex flex-col gap-1.5 text-sm text-muted">
                {types.includes("SEAT") && <li>Solo seat — join the table</li>}
                {types.includes("GROUP") && <li>Group of 2–{RULES.GROUP_CAP}, seated together</li>}
                {types.includes("BUYOUT") && (
                  <li>
                    Buy out the table — {event.minGuests}–{event.maxGuests} guests, from {formatMoney(event.priceCents * event.minGuests)}
                  </li>
                )}
              </ul>
            )}
            {!past && !soldOut && (
              <ButtonLink href={`/events/${event.id}/book`}>Request seats</ButtonLink>
            )}
            <p className="text-xs text-muted">
              You pay the chef directly; a seat is confirmed once they mark it paid. Unpaid requests expire after {RULES.REQUEST_EXPIRY_HOURS} hours.
            </p>

            <div className="border-t border-line pt-5">
              <Link href={`/chefs/${event.chef.slug}`} className="group flex items-center gap-3">
                <Monogram name={event.chef.displayName} size="sm" />
                <span>
                  <span className="block text-xs text-muted">Your chef</span>
                  <span className="font-medium group-hover:text-accent">{event.chef.displayName}</span>
                </span>
              </Link>
              <p className="mt-3 line-clamp-3 text-sm text-muted">{event.chef.bio}</p>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
