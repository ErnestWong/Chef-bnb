import { describe, expect, it } from "vitest";
import { describeVenueTake, netAtFullTable } from "./terms";

describe("what a chef nets on an open night", () => {
  it("takes the venue's share and flat fee off a full table, before food costs", () => {
    // 18 seats at $95 = $1,710; 25% = $427.50 → $428 (rounded to the cent: 42750); + $150 fee.
    expect(netAtFullTable({ venueSharePct: 25, venueFeeCents: 15000 }, 9500, 18)).toBe(171000 - 42750 - 15000);
    expect(netAtFullTable({ venueSharePct: 0, venueFeeCents: 0 }, 8500, 12)).toBe(102000);
  });

  it("never goes negative", () => {
    expect(netAtFullTable({ venueSharePct: 100, venueFeeCents: 50000 }, 5000, 10)).toBe(0);
    expect(netAtFullTable({ venueSharePct: 10, venueFeeCents: 0 }, -100, 10)).toBe(0);
  });

  it("describes the venue's take in one line", () => {
    expect(describeVenueTake({ venueSharePct: 25, venueFeeCents: 15000, terms: "keeps the bar" })).toBe("25% of tickets + $150 · keeps the bar");
    expect(describeVenueTake({ venueSharePct: 0, venueFeeCents: 0, terms: null })).toBe("No cut of tickets");
    expect(describeVenueTake({ venueSharePct: 0, venueFeeCents: 20000 })).toBe("$200");
  });
});
