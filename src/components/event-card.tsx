import Link from "next/link";
import type { PublicEvent } from "@/lib/queries/events";
import { BOROUGH_LABELS, formatEventDateTime, formatMoney, pluralize } from "@/lib/format";
import { Badge } from "./ui";

export function EventCard({ event }: { event: PublicEvent }) {
  const soldOut = event.seatsLeft === 0;
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-accent">{formatEventDateTime(event.startsAt)}</p>
        <p className="text-sm font-semibold">{formatMoney(event.priceCents)}<span className="font-normal text-muted"> / seat</span></p>
      </div>
      <h3 className="font-display text-2xl leading-tight group-hover:text-accent">{event.title}</h3>
      <p className="text-sm text-muted">
        {event.chef.displayName} · {event.venue.neighborhood}, {BOROUGH_LABELS[event.borough]}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {event.cuisines.map((c) => (
          <Badge key={c.id}>{c.name}</Badge>
        ))}
        {event.soloFriendly && !soldOut && <Badge tone="accent">Solo-friendly</Badge>}
        {soldOut ? (
          <Badge tone="warn">{event.mode === "BOUGHT_OUT" ? "Bought out" : "Full"}</Badge>
        ) : (
          <Badge>{pluralize(event.seatsLeft, "seat")} left</Badge>
        )}
      </div>
    </Link>
  );
}
