import { describe, expect, it } from "vitest";
import { decideSeatRequest, type EventSnapshot, RULES } from "./rules";

const now = new Date("2026-12-01T00:00:00Z");

const event = (overrides: Partial<EventSnapshot> = {}): EventSnapshot => ({
  status: "PUBLISHED",
  mode: "UNSOLD",
  startsAt: new Date("2026-12-10T00:00:00Z"),
  minGuests: 4,
  maxGuests: 8,
  priceCents: 8500,
  allowedBookingTypes: ["SEAT", "GROUP", "BUYOUT"],
  ...overrides,
});

const empty = { activeSeats: 0, activeBookings: 0 };

describe("decideSeatRequest", () => {
  it("accepts a solo seat on an unsold event and opens it", () => {
    const d = decideSeatRequest(event(), empty, { type: "SEAT", partySize: 1 }, now);
    expect(d).toEqual({ ok: true, amountCents: 8500, nextMode: "OPEN" });
  });

  it("prices a group at price × party size", () => {
    const d = decideSeatRequest(event(), empty, { type: "GROUP", partySize: 3 }, now);
    expect(d).toEqual({ ok: true, amountCents: 25500, nextMode: "OPEN" });
  });

  it("never sells past max_guests, counting requested + confirmed seats", () => {
    const d = decideSeatRequest(
      event(),
      { activeSeats: 6, activeBookings: 3 },
      { type: "GROUP", partySize: 3 },
      now,
    );
    expect(d).toMatchObject({ ok: false, code: "not_enough_seats", message: "Only 2 seats left." });
  });

  it("fills the exact last seats", () => {
    const d = decideSeatRequest(
      event(),
      { activeSeats: 6, activeBookings: 3 },
      { type: "GROUP", partySize: 2 },
      now,
    );
    expect(d.ok).toBe(true);
  });

  it("reports a full event", () => {
    const d = decideSeatRequest(
      event(),
      { activeSeats: 8, activeBookings: 4 },
      { type: "SEAT", partySize: 1 },
      now,
    );
    expect(d).toMatchObject({ ok: false, code: "not_enough_seats", message: "This dinner is full." });
  });

  it("rejects wrong party sizes per type", () => {
    expect(decideSeatRequest(event(), empty, { type: "SEAT", partySize: 2 }, now)).toMatchObject({
      code: "invalid_party_size",
    });
    expect(decideSeatRequest(event(), empty, { type: "GROUP", partySize: 1 }, now)).toMatchObject({
      code: "invalid_party_size",
    });
    expect(
      decideSeatRequest(event(), empty, { type: "GROUP", partySize: RULES.GROUP_CAP + 1 }, now),
    ).toMatchObject({ code: "invalid_party_size" });
    expect(decideSeatRequest(event(), empty, { type: "SEAT", partySize: 0 }, now)).toMatchObject({
      code: "invalid_party_size",
    });
    expect(decideSeatRequest(event(), empty, { type: "SEAT", partySize: 1.5 }, now)).toMatchObject({
      code: "invalid_party_size",
    });
  });

  describe("buyout", () => {
    it("closes the event and charges at least price × min", () => {
      const d = decideSeatRequest(event(), empty, { type: "BUYOUT", partySize: 4 }, now);
      expect(d).toEqual({ ok: true, amountCents: 34000, nextMode: "BOUGHT_OUT" });
    });

    it("charges price × party size above the minimum", () => {
      const d = decideSeatRequest(event(), empty, { type: "BUYOUT", partySize: 7 }, now);
      expect(d).toMatchObject({ ok: true, amountCents: 59500 });
    });

    it("must be within the chef's min..max", () => {
      expect(decideSeatRequest(event(), empty, { type: "BUYOUT", partySize: 3 }, now)).toMatchObject({
        code: "invalid_party_size",
      });
      expect(decideSeatRequest(event(), empty, { type: "BUYOUT", partySize: 9 }, now)).toMatchObject({
        code: "invalid_party_size",
      });
    });

    it("is unavailable once anyone holds a seat", () => {
      const d = decideSeatRequest(
        event({ mode: "OPEN" }),
        { activeSeats: 1, activeBookings: 1 },
        { type: "BUYOUT", partySize: 6 },
        now,
      );
      expect(d).toMatchObject({ code: "buyout_unavailable" });
    });

    it("blocks seats once bought out", () => {
      const d = decideSeatRequest(
        event({ mode: "BOUGHT_OUT" }),
        { activeSeats: 6, activeBookings: 1 },
        { type: "SEAT", partySize: 1 },
        now,
      );
      expect(d).toMatchObject({ code: "event_bought_out" });
    });
  });

  it("rejects events that aren't published or have started", () => {
    expect(decideSeatRequest(event({ status: "DRAFT" }), empty, { type: "SEAT", partySize: 1 }, now)).toMatchObject({
      code: "event_not_open",
    });
    expect(decideSeatRequest(event({ status: "CANCELLED" }), empty, { type: "SEAT", partySize: 1 }, now)).toMatchObject({
      code: "event_not_open",
    });
    expect(
      decideSeatRequest(event({ startsAt: now }), empty, { type: "SEAT", partySize: 1 }, now),
    ).toMatchObject({ code: "event_started" });
  });

  it("respects the chef's allowed booking types", () => {
    const d = decideSeatRequest(
      event({ allowedBookingTypes: ["GROUP", "BUYOUT"] }),
      empty,
      { type: "SEAT", partySize: 1 },
      now,
    );
    expect(d).toMatchObject({ code: "type_not_allowed" });
  });
});
