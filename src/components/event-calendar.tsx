import Link from "next/link";
import type { PublicEvent } from "@/lib/queries/events";
import { BOROUGH_LABELS, dateKey, formatEventDay, formatEventTime, formatMoney, formatMonth, pluralize } from "@/lib/format";
import { filterQuery, type EventFilters } from "@/lib/queries/event-filters";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "YYYY-MM" → first day as a Date (UTC noon avoids DST edge cases). */
function monthStart(month: string): Date {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12));
}

function shiftMonth(month: string, delta: number): string {
  const d = monthStart(month);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/** Server-rendered month grid of events; navigation is plain links. */
export function EventCalendar({ events, filters }: { events: PublicEvent[]; filters: EventFilters }) {
  const start = monthStart(filters.month);
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();

  const byDay = new Map<string, PublicEvent[]>();
  for (const e of events) {
    const k = dateKey(e.startsAt);
    if (!k.startsWith(filters.month)) continue;
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  // Where to send people when this month is empty: the next month with a dinner.
  const monthEnd = `${filters.month}-${String(daysInMonth).padStart(2, "0")}`;
  const nextWithEvent = events.find((e) => dateKey(e.startsAt) > monthEnd);
  const today = dateKey(new Date());

  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <section aria-label="Calendar">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/events${filterQuery(filters, { month: shiftMonth(filters.month, -1) })}`} className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent" rel="nofollow">
          ← Previous
        </Link>
        <h2 className="font-display text-2xl">{formatMonth(start)}</h2>
        <Link href={`/events${filterQuery(filters, { month: shiftMonth(filters.month, 1) })}`} className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent" rel="nofollow">
          Next →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-surface px-2 py-2 text-center text-xs font-medium text-muted">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const key = day ? `${filters.month}-${String(day).padStart(2, "0")}` : "";
          const dayEvents = day ? byDay.get(key) ?? [] : [];
          const isToday = key === today;
          return (
            <div key={i} className={`min-h-24 bg-surface p-2 ${day ? "" : "opacity-40"} ${isToday ? "ring-2 ring-inset ring-accent" : ""}`}>
              {day && (
                <p className={`text-xs ${isToday ? "font-semibold text-accent" : "text-muted"}`}>
                  {day}
                  {isToday && <span className="sr-only"> (today)</span>}
                </p>
              )}
              <ul className="mt-1 hidden flex-col gap-1 sm:flex">
                {dayEvents.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="block truncate rounded-md bg-accent-soft px-1.5 py-1 text-xs text-accent hover:underline" title={e.title}>
                      {formatEventTime(e.startsAt)} {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {dayEvents.length > 0 && (
                <a href={`#day-${key}`} className="mt-1 flex flex-wrap gap-1 sm:hidden" aria-label={`${pluralize(dayEvents.length, "dinner")} on ${formatEventDay(dayEvents[0].startsAt)}`}>
                  {dayEvents.map((e) => (
                    <span key={e.id} className="h-2 w-2 rounded-full bg-accent" />
                  ))}
                </a>
              )}
            </div>
          );
        })}
      </div>
      {byDay.size > 0 && (
        <ol className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {[...byDay.entries()].map(([key, dayEvents]) => (
            <li key={key} id={`day-${key}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:gap-6">
              <p className="w-28 shrink-0 text-sm font-medium text-accent">{formatEventDay(dayEvents[0].startsAt)}</p>
              <ul className="flex flex-1 flex-col gap-3">
                {dayEvents.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="min-w-0">
                        <span className="font-display text-lg leading-tight group-hover:text-accent">{e.title}</span>
                        <span className="block text-sm text-muted">
                          {formatEventTime(e.startsAt)} · {e.chef.displayName} · {e.venue.neighborhood}, {BOROUGH_LABELS[e.borough]}
                        </span>
                      </span>
                      <span className="text-sm">
                        <span className="font-semibold">{formatMoney(e.priceCents)}</span>
                        <span className="text-muted"> / seat · {e.seatsLeft === 0 ? (e.mode === "BOUGHT_OUT" ? "bought out" : "full") : `${pluralize(e.seatsLeft, "seat")} left`}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {byDay.size === 0 && (
        <p className="mt-4 text-sm text-muted">
          No dinners in {formatMonth(start)}
          {filters.from || filters.to || filters.borough || filters.cuisine || filters.maxPrice || filters.partySize || filters.soloFriendly ? " match those filters" : ""}.{" "}
          {nextWithEvent ? (
            <Link href={`/events${filterQuery(filters, { month: dateKey(nextWithEvent.startsAt).slice(0, 7) })}`} className="text-accent underline-offset-2 hover:underline">
              Jump to {formatMonth(nextWithEvent.startsAt)} →
            </Link>
          ) : (
            <Link href={`/events${filterQuery(filters, { view: undefined, month: undefined })}`} className="text-accent underline-offset-2 hover:underline">
              See the full list
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
