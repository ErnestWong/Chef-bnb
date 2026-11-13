import Link from "next/link";
import type { PublicEvent } from "@/lib/queries/events";
import { dateKey, formatEventTime, formatMonth } from "@/lib/format";
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
          return (
            <div key={i} className={`min-h-24 bg-surface p-2 ${day ? "" : "opacity-40"}`}>
              {day && <p className="text-xs text-muted">{day}</p>}
              <ul className="mt-1 flex flex-col gap-1">
                {dayEvents.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="block truncate rounded-md bg-accent-soft px-1.5 py-1 text-xs text-accent hover:underline" title={e.title}>
                      <span className="hidden sm:inline">{formatEventTime(e.startsAt)} </span>
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
