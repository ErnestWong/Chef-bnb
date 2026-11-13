import Link from "next/link";
import { BOROUGH_LABELS } from "@/lib/format";
import { BOROUGHS, filterQuery, type EventFilters } from "@/lib/queries/event-filters";

type Cuisine = { id: string; name: string; slug: string };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-sm";

/** Plain GET form: server-rendered, works without JavaScript, shareable URLs. */
export function EventFiltersForm({ filters, cuisines }: { filters: EventFilters; cuisines: Cuisine[] }) {
  const active = Boolean(
    filters.from || filters.to || filters.borough || filters.cuisine || filters.maxPrice || filters.partySize || filters.soloFriendly,
  );
  return (
    <form method="get" action="/events" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      {filters.view === "calendar" && <input type="hidden" name="view" value="calendar" />}
      {filters.view === "calendar" && <input type="hidden" name="month" value={filters.month} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs text-muted">
          From
          <input type="date" name="from" defaultValue={filters.from?.toISOString().slice(0, 10)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          To
          <input type="date" name="to" defaultValue={filters.to?.toISOString().slice(0, 10)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Borough
          <select name="borough" defaultValue={filters.borough ?? ""} className={field}>
            <option value="">Anywhere</option>
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>
                {BOROUGH_LABELS[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Cuisine
          <select name="cuisine" defaultValue={filters.cuisine ?? ""} className={field}>
            <option value="">Any</option>
            {cuisines.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Max price / seat
          <input type="number" name="maxPrice" min={1} step={5} placeholder="$" defaultValue={filters.maxPrice ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Party size
          <input type="number" name="partySize" min={1} max={10} defaultValue={filters.partySize ?? ""} className={field} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="solo" value="1" defaultChecked={filters.soloFriendly} className="accent-accent" />
          Solo-friendly only
        </label>
        <button type="submit" className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white">
          Filter
        </button>
        {active && (
          <Link href={`/events${filterQuery({ ...filters, from: undefined, to: undefined, borough: undefined, cuisine: undefined, maxPrice: undefined, partySize: undefined, soloFriendly: false })}`} className="text-sm text-muted underline-offset-2 hover:underline">
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
