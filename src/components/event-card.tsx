import Image from "next/image";
import Link from "next/link";
import type { PastEvent, PublicEvent } from "@/lib/queries/events";
import { formatEventDateTime, formatEventDay, formatMoney, pluralize } from "@/lib/format";
import { Badge, Stars } from "./ui";

/**
 * The atom of the brand system: photo, chef and neighborhood in mono, the
 * title in the serif, date and price in mono, seats left, one button.
 */
export function EventCard({ event }: { event: PublicEvent }) {
  const soldOut = event.seatsLeft === 0;
  const photo = event.photoUrls[0];
  return (
    <Link href={`/events/${event.id}`} className="group flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent">
      {photo ? (
        <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-paper-2">
          <Image src={photo} alt="" fill sizes="96px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-xl bg-paper-2 font-display text-3xl text-muted">10</div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate font-mono text-xs uppercase tracking-wide text-muted">
          {event.chef.displayName} · {event.venue.neighborhood}
        </p>
        <h3 className="font-display text-2xl leading-tight group-hover:text-accent">{event.title}</h3>
        <p className="font-mono text-sm">
          {formatEventDateTime(event.startsAt)} · {formatMoney(event.priceCents)}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {event.cuisines.slice(0, 2).map((c) => (
            <Badge key={c.id}>{c.name}</Badge>
          ))}
          {soldOut ? (
            <Badge tone="warn">{event.mode === "BOUGHT_OUT" ? "Bought out" : "Full"}</Badge>
          ) : (
            <span className="font-mono text-xs text-muted">
              {event.seatsLeft} of {event.maxGuests} left{event.soloFriendly ? " · solo welcome" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** A finished dinner: what it looked like and what the table said. */
export function PastEventCard({ event }: { event: PastEvent }) {
  const photo = event.photoUrls[0];
  const quote = event.reviews.find((r) => r.body)?.body ?? null;
  return (
    <Link href={`/events/${event.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent">
      {photo ? (
        <div className="relative aspect-[3/2] w-full bg-paper-2">
          <Image src={photo} alt="" fill sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[3/2] w-full items-center justify-center bg-paper-2 font-display text-5xl text-muted">10</div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {event.chef.displayName} · {event.venue.neighborhood} · {formatEventDay(event.startsAt)}
        </p>
        <h3 className="font-display text-2xl leading-tight group-hover:text-accent">{event.title}</h3>
        <Stars rating={event.averageRating} count={event.reviewCount || undefined} />
        {quote && <p className="text-sm leading-relaxed text-muted">&ldquo;{quote}&rdquo;</p>}
        <p className="mt-auto pt-2 font-mono text-xs text-muted">{pluralize(event.maxGuests, "seat")} · {formatMoney(event.priceCents)}</p>
      </div>
    </Link>
  );
}
