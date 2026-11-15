import { z } from "zod";
import { boroughOf, canonicalNeighborhood } from "@/lib/nyc/neighborhoods";

export const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN_ISLAND"] as const;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.object({
  from: isoDay.optional(),
  to: isoDay.optional(),
  borough: z.enum(BOROUGHS).optional(),
  /** A borough code or a listed neighborhood name; the one "Where" dropdown. */
  where: z.string().trim().max(80).optional(),
  cuisine: z.string().regex(/^[a-z0-9-]+$/).optional(),
  maxPrice: z.coerce.number().int().positive().max(10_000).optional(),
  partySize: z.coerce.number().int().min(1).max(10).optional(),
  solo: z.literal("1").optional(),
  view: z.enum(["list", "calendar"]).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export type EventFilters = {
  from?: Date;
  to?: Date;
  borough?: (typeof BOROUGHS)[number];
  /** Canonical neighborhood name; implies `borough`. */
  neighborhood?: string;
  cuisine?: string;
  /** Dollars, as typed by the user. */
  maxPrice?: number;
  maxPriceCents?: number;
  partySize?: number;
  soloFriendly: boolean;
  view: "list" | "calendar";
  /** "YYYY-MM" the calendar shows; defaults to the current month. */
  month: string;
  /** The current month at parse time, so links can leave the default out of the URL. */
  defaultMonth: string;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Tolerant parser: invalid values are dropped rather than erroring. */
export function parseEventFilters(raw: RawParams, now = new Date()): EventFilters {
  const input = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, first(v) || undefined]),
  );
  const parsed = schema.safeParse(input);
  const data = parsed.success ? parsed.data : fallbackParse(input);

  let borough = data.borough;
  let neighborhood: string | undefined;
  if (data.where) {
    if ((BOROUGHS as readonly string[]).includes(data.where)) {
      borough = data.where as (typeof BOROUGHS)[number];
    } else {
      const n = canonicalNeighborhood(data.where);
      if (n) {
        neighborhood = n;
        borough = boroughOf(n) ?? undefined;
      }
    }
  }
  const defaultMonth = now.toISOString().slice(0, 7);
  const month = data.month ?? defaultMonth;
  return {
    from: data.from ? new Date(`${data.from}T00:00:00-05:00`) : undefined,
    to: data.to ? new Date(`${data.to}T23:59:59-05:00`) : undefined,
    borough,
    neighborhood,
    cuisine: data.cuisine,
    maxPrice: data.maxPrice,
    maxPriceCents: data.maxPrice ? data.maxPrice * 100 : undefined,
    partySize: data.partySize,
    soloFriendly: data.solo === "1",
    // Calendar is the default: a dinner calendar is the product. ?view=list is the other way.
    view: data.view ?? "calendar",
    month,
    defaultMonth,
  };
}

/** Parse each field independently so one bad value doesn't drop the rest. */
function fallbackParse(input: Record<string, string | undefined>): z.infer<typeof schema> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.shape)) {
    const r = (field as z.ZodTypeAny).safeParse(input[key]);
    if (r.success && r.data !== undefined) out[key] = r.data;
  }
  return out as z.infer<typeof schema>;
}

/** Build a query string for the current filters, overriding some. */
export function filterQuery(filters: EventFilters, overrides: Partial<Record<string, string | undefined>> = {}): string {
  const params = new URLSearchParams();
  const base: Record<string, string | undefined> = {
    from: filters.from?.toISOString().slice(0, 10),
    to: filters.to?.toISOString().slice(0, 10),
    where: filters.neighborhood ?? filters.borough,
    cuisine: filters.cuisine,
    maxPrice: filters.maxPrice?.toString(),
    partySize: filters.partySize?.toString(),
    solo: filters.soloFriendly ? "1" : undefined,
    view: filters.view === "list" ? "list" : undefined,
    month: filters.view === "calendar" && filters.month !== filters.defaultMonth ? filters.month : undefined,
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : "";
}
