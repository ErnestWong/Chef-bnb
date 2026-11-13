import { describe, expect, it } from "vitest";
import { filterQuery, parseEventFilters } from "./event-filters";

const now = new Date("2026-11-13T12:00:00Z");

describe("parseEventFilters", () => {
  it("parses a full set", () => {
    const f = parseEventFilters(
      { from: "2026-12-01", to: "2026-12-31", borough: "BROOKLYN", cuisine: "korean", maxPrice: "90", partySize: "3", solo: "1", view: "calendar", month: "2026-12" },
      now,
    );
    expect(f.borough).toBe("BROOKLYN");
    expect(f.cuisine).toBe("korean");
    expect(f.maxPriceCents).toBe(9000);
    expect(f.partySize).toBe(3);
    expect(f.soloFriendly).toBe(true);
    expect(f.view).toBe("calendar");
    expect(f.month).toBe("2026-12");
    expect(f.from?.toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("drops only the invalid values", () => {
    const f = parseEventFilters({ borough: "PARIS", maxPrice: "lots", cuisine: "korean", partySize: "99" }, now);
    expect(f.borough).toBeUndefined();
    expect(f.maxPrice).toBeUndefined();
    expect(f.partySize).toBeUndefined();
    expect(f.cuisine).toBe("korean");
  });

  it("defaults to list view and the current month", () => {
    const f = parseEventFilters({}, now);
    expect(f.view).toBe("list");
    expect(f.month).toBe("2026-11");
    expect(f.soloFriendly).toBe(false);
  });

  it("takes the first value of repeated params", () => {
    expect(parseEventFilters({ cuisine: ["italian", "korean"] }, now).cuisine).toBe("italian");
  });
});

describe("filterQuery", () => {
  it("round-trips and applies overrides", () => {
    const f = parseEventFilters({ borough: "QUEENS", solo: "1" }, now);
    expect(filterQuery(f)).toBe("?borough=QUEENS&solo=1");
    expect(filterQuery(f, { borough: undefined, view: "calendar", month: "2026-12" })).toBe("?solo=1&view=calendar&month=2026-12");
  });

  it("is empty with no filters", () => {
    expect(filterQuery(parseEventFilters({}, now))).toBe("");
  });
});
