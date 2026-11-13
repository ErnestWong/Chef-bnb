import { describe, expect, it } from "vitest";
import { dateKey, formatDuration, formatEventDateTime, formatMoney, pluralize } from "./format";

describe("format", () => {
  it("formats cents as whole dollars when possible", () => {
    expect(formatMoney(8500)).toBe("$85");
    expect(formatMoney(8550)).toBe("$85.50");
    expect(formatMoney(0)).toBe("$0");
  });

  it("formats event times in New York time", () => {
    // 2026-12-06T00:00Z is Dec 5, 7:00 PM in New York (EST).
    expect(formatEventDateTime(new Date("2026-12-06T00:00:00Z"))).toBe("Sat, Dec 5 · 7:00 PM");
    expect(dateKey(new Date("2026-12-06T00:00:00Z"))).toBe("2026-12-05");
  });

  it("formats durations", () => {
    expect(formatDuration(150)).toBe("2h 30m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(45)).toBe("45m");
  });

  it("pluralizes", () => {
    expect(pluralize(1, "seat")).toBe("1 seat");
    expect(pluralize(3, "seat")).toBe("3 seats");
  });
});
