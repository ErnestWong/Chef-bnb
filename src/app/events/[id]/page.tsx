import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingStatusBadge } from "@/components/booking-status";
import { VenueMap } from "@/components/venue-map";
import { Badge, ButtonLink, Container, Monogram, Stars } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDuration, formatEventDateTime, formatEventDay, formatEventTime, formatMoney, pluralize, stripByobLabel } from "@/lib/format";
import { RULES } from "@/lib/bookings/rules";
import { getActiveBookingForViewer } from "@/lib/queries/bookings";
import { getEventPreviewForOwner, getPublicEvent, listReviewsForEvent } from "@/lib/queries/events";

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const event = await getPublicEvent((await params).id);
  return { title: event?.title ?? "Dinner" };
}

type Course = { name?: string; description?: string; dietary?: string };

const HOUR = 3600 * 1000;

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
  const { id } = await params;
  const user = await getCurrentUser();
  let event = await getPublicEvent(id);
  // A draft (or an unpublished dinner) is visible to its chef as a preview, never to the public.
  const preview = !event && user ? await getEventPreviewForOwner(id, user) : null;
  if (preview) event = preview;
  if (!event) notFound();

  const now = new Date();
  const cancelled = event.status === "CANCELLED";
  const completed = event.status === "COMPLETED";
  const past = cancelled || completed;
  const open = event.status === "PUBLISHED" && !preview;
  const soldOut = event.seatsLeft === 0;
  const mine = open && user ? await getActiveBookingForViewer(event.id, user.id) : null;
  const bookable = open && !soldOut && !mine;
  const soon = event.startsAt.getTime() - now.getTime() < RULES.ADDRESS_REVEAL_HOURS * HOUR;
  const reviews = completed ? await listReviewsForEvent(event.id) : [];
  const courses = Array.isArray(event.menu?.courses) ? (event.menu!.courses as Course[]) : [];
  const types = event.allowedBookingTypes;
  const byob = stripByobLabel(event.byobNote) || "Bring whatever you'd like to drink; nothing is sold or included.";
  const minimum =
    event.minGuests <= 1
      ? "No minimum headcount: it runs once a single seat is confirmed."
      : event.goNoGoCheckedAt && event.status === "PUBLISHED"
        ? `Confirmed to run: the minimum of ${event.minGuests} guests was met.`
        : event.goNoGoAt <= now
          ? `It needs at least ${event.minGuests} confirmed guests to run; the final call is made shortly.`
          : `It runs if at least ${event.minGuests} guests confirm by ${formatEventDateTime(event.goNoGoAt)}; otherwise it's cancelled and everyone is emailed.`;
  const moreByChef = (
    <Link href={`/chefs/${event.chef.slug}`} className="text-accent underline-offset-2 hover:underline">
      More dinners by {event.chef.displayName}
    </Link>
  );

  return (
    <>
      <Container className="py-12 pb-28 lg:pb-12">
        <p className="text-sm text-muted">
          <Link href="/events" className="hover:text-accent">Dinners</Link> / {formatEventDay(event.startsAt)}
        </p>
        {preview && (
          <p role="status" className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">
            Preview: this dinner is {event.status === "DRAFT" ? "not published yet" : event.status.toLowerCase()}, so only you can see this page.{" "}
            <Link href={`/chef/events/${event.id}`} className="text-accent underline-offset-2 hover:underline">Back to the guest list</Link>
          </p>
        )}
        {cancelled && (
          <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <p className="font-medium">This dinner was cancelled.</p>
            {event.cancelReason && <p className="mt-0.5 text-muted">{event.cancelReason}</p>}
            <p className="mt-1">{moreByChef}</p>
          </div>
        )}
        {completed && (
          <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <p className="font-medium">This dinner has already happened.</p>
            <p className="mt-1">{moreByChef}</p>
          </div>
        )}
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_360px]">
          <article>
            <div className="flex flex-wrap gap-1.5">
              {event.cuisines.map((c) => (
                <Badge key={c.id}>{c.name}</Badge>
              ))}
              {cancelled && <Badge tone="warn">Cancelled</Badge>}
              {completed && <Badge>Past dinner</Badge>}
              {open && soon && <Badge tone="accent">{event.startsAt.getTime() - now.getTime() < 24 * HOUR ? "Today" : "Tomorrow"}</Badge>}
            </div>
            <h1 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{event.title}</h1>
            <p className="mt-3 text-lg">
              {formatEventDay(event.startsAt)} at {formatEventTime(event.startsAt)} · {formatDuration(event.durationMin)}
            </p>
            {event.description && <p className="mt-6 max-w-prose text-base leading-relaxed">{event.description}</p>}

            {(courses.length > 0 || !soon) && (
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
            )}

            <section className="mt-10 grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl">Good to know</h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  <li>
                    <span className="font-medium">BYOB.</span> {byob}
                  </li>
                  {!past && (
                    <li>
                      <span className="font-medium">Table of {event.maxGuests} at most.</span> {minimum}
                    </li>
                  )}
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

            {reviews.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-2xl">What guests said</h2>
                <p className="mt-1 text-xs text-muted">From guests who attended this dinner. Shown anonymously.</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                      <Stars rating={r.rating} />
                      {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside className="flex h-fit flex-col gap-5 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-6">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-3xl">{formatMoney(event.priceCents)}</p>
              <p className="text-sm text-muted">per seat</p>
            </div>
            {past ? (
              <p className="text-sm text-muted">This dinner is no longer taking bookings.</p>
            ) : preview ? (
              <p className="text-sm text-muted">
                {pluralize(event.maxGuests, "seat")} at the table. Guests can request them once you publish.
              </p>
            ) : mine ? (
              <div className="rounded-xl bg-accent-soft p-3 text-sm">
                <p className="font-medium">You have {pluralize(mine.partySize, "seat")} here</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <BookingStatusBadge status={mine.status} />
                  <Link href={`/bookings/${mine.id}`} className="text-accent underline-offset-2 hover:underline">
                    {mine.status === "REQUESTED" ? "Pay the chef to confirm" : "View your booking"}
                  </Link>
                </div>
              </div>
            ) : soldOut ? (
              <div className="text-sm">
                <p className="font-medium">{event.mode === "BOUGHT_OUT" ? "This table has been bought out." : "This dinner is full."}</p>
                <p className="mt-1">{moreByChef}</p>
              </div>
            ) : (
              <p className="text-sm">
                <span className="font-medium">{pluralize(event.seatsLeft, "seat")} left</span>
                <span className="text-muted"> of {event.maxGuests}</span>
              </p>
            )}
            {bookable && (
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
            {bookable && <ButtonLink href={`/events/${event.id}/book`}>Request seats</ButtonLink>}
            {bookable && (
              <p className="text-xs text-muted">
                You pay the chef directly; a seat is confirmed once they mark it paid.{" "}
                {soon ? "This dinner is soon, so pay right after you request." : `Unpaid requests expire after ${RULES.REQUEST_EXPIRY_HOURS} hours.`}
              </p>
            )}

            <div className="border-t border-line pt-5">
              <Link href={`/chefs/${event.chef.slug}`} className="group flex items-center gap-3">
                <Monogram name={event.chef.displayName} size="sm" />
                <span>
                  <span className="block text-xs text-muted">{past ? "Chef" : "Your chef"}</span>
                  <span className="font-medium group-hover:text-accent">{event.chef.displayName}</span>
                </span>
              </Link>
              <p className="mt-3 line-clamp-3 text-sm text-muted">{event.chef.bio}</p>
            </div>
          </aside>
        </div>
      </Container>
      {(bookable || mine) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl">
                {formatMoney(event.priceCents)} <span className="font-sans text-sm text-muted">/ seat</span>
              </p>
              <p className="text-xs text-muted">{mine ? `You have ${pluralize(mine.partySize, "seat")} here` : `${formatEventDay(event.startsAt)} · ${pluralize(event.seatsLeft, "seat")} left`}</p>
            </div>
            {mine ? (
              <ButtonLink href={`/bookings/${mine.id}`} variant="secondary">{mine.status === "REQUESTED" ? "Pay to confirm" : "Your booking"}</ButtonLink>
            ) : (
              <ButtonLink href={`/events/${event.id}/book`}>Request seats</ButtonLink>
            )}
          </div>
        </div>
      )}
    </>
  );
}
