import { z } from "zod";

export const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN_ISLAND"] as const;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.object({
  from: isoDay.optional(),
  to: isoDay.optional(),
  borough: z.enum(BOROUGHS).optional(),
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
  cuisine?: string;
  /** Dollars, as typed by the user. */
  maxPrice?: number;
  maxPriceCents?: number;
  partySize?: number;
  soloFriendly: boolean;
  view: "list" | "calendar";
  /** "YYYY-MM" the calendar shows; defaults to the current month. */
  month: string;
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

  const month = data.month ?? now.toISOString().slice(0, 7);
  return {
    from: data.from ? new Date(`${data.from}T00:00:00-05:00`) : undefined,
    to: data.to ? new Date(`${data.to}T23:59:59-05:00`) : undefined,
    borough: data.borough,
    cuisine: data.cuisine,
    maxPrice: data.maxPrice,
    maxPriceCents: data.maxPrice ? data.maxPrice * 100 : undefined,
    partySize: data.partySize,
    soloFriendly: data.solo === "1",
    view: data.view ?? "list",
    month,
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
    borough: filters.borough,
    cuisine: filters.cuisine,
    maxPrice: filters.maxPrice?.toString(),
    partySize: filters.partySize?.toString(),
    solo: filters.soloFriendly ? "1" : undefined,
    view: filters.view === "calendar" ? "calendar" : undefined,
    month: filters.view === "calendar" ? filters.month : undefined,
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : "";
}
