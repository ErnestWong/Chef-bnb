import { describe, expect, it } from "vitest";
import { ALL_STATUSES, assertTransition, canTransition, isActive, type Actor } from "./transitions";

const ACTORS: Actor[] = ["guest", "chef", "admin", "system"];

describe("booking transitions", () => {
  it("allows every legal transition", () => {
    expect(canTransition("REQUESTED", "CONFIRMED", "chef")).toBe(true);
    expect(canTransition("REQUESTED", "EXPIRED", "system")).toBe(true);
    expect(canTransition("REQUESTED", "CANCELLED", "guest")).toBe(true);
    expect(canTransition("REQUESTED", "CANCELLED", "chef")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "guest")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "system")).toBe(true);
    expect(canTransition("CONFIRMED", "ATTENDED", "chef")).toBe(true);
    expect(canTransition("CONFIRMED", "NO_SHOW", "chef")).toBe(true);
  });

  it("only the chef (or admin) confirms, and only from REQUESTED", () => {
    expect(canTransition("REQUESTED", "CONFIRMED", "guest")).toBe(false);
    expect(canTransition("REQUESTED", "CONFIRMED", "system")).toBe(false);
    expect(canTransition("CONFIRMED", "CONFIRMED", "chef")).toBe(false);
  });

  it("guests cannot mark attendance or expire", () => {
    expect(canTransition("CONFIRMED", "ATTENDED", "guest")).toBe(false);
    expect(canTransition("CONFIRMED", "NO_SHOW", "guest")).toBe(false);
    expect(canTransition("REQUESTED", "EXPIRED", "guest")).toBe(false);
  });

  it("terminal states have no exits for any actor", () => {
    for (const from of ["EXPIRED", "CANCELLED", "ATTENDED", "NO_SHOW"] as const) {
      for (const to of ALL_STATUSES) {
        for (const actor of ACTORS) {
          expect(canTransition(from, to, actor), `${from} → ${to} by ${actor}`).toBe(false);
        }
      }
    }
  });

  it("cannot skip REQUESTED → ATTENDED", () => {
    for (const actor of ACTORS) {
      expect(canTransition("REQUESTED", "ATTENDED", actor)).toBe(false);
      expect(canTransition("REQUESTED", "NO_SHOW", actor)).toBe(false);
    }
  });

  it("assertTransition throws on illegal moves", () => {
    expect(() => assertTransition("EXPIRED", "CONFIRMED", "admin")).toThrow(/Illegal/);
    expect(() => assertTransition("REQUESTED", "CONFIRMED", "chef")).not.toThrow();
  });

  it("only requested and confirmed bookings count against capacity", () => {
    expect(ALL_STATUSES.filter(isActive)).toEqual(["REQUESTED", "CONFIRMED"]);
  });
});
