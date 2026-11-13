import { describe, expect, it } from "vitest";
import {
  PRIVATE_FIELDS,
  PUBLIC_CHEF_CARD_SELECT,
  PUBLIC_CHEF_PROFILE_SELECT,
  PUBLIC_EVENT_SELECT,
  PUBLIC_REVIEW_SELECT,
  PUBLIC_VENUE_SELECT,
} from "./public-select";

function collectKeys(obj: unknown, path = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj).flatMap(([k, v]) => {
    const here = path ? `${path}.${k}` : k;
    if (k === "select" || k === "include") return collectKeys(v, path);
    return [here, ...collectKeys(v, here)];
  });
}

describe("public select lists", () => {
  const selects = {
    PUBLIC_VENUE_SELECT,
    PUBLIC_CHEF_CARD_SELECT,
    PUBLIC_CHEF_PROFILE_SELECT,
    PUBLIC_EVENT_SELECT,
    PUBLIC_REVIEW_SELECT,
  };

  for (const [name, select] of Object.entries(selects)) {
    it(`${name} selects no private column`, () => {
      const leaves = collectKeys(select).map((p) => p.split(".").pop()!);
      const leaked = leaves.filter((k) => (PRIVATE_FIELDS as readonly string[]).includes(k));
      expect(leaked, `${name} leaks ${leaked.join(", ")}`).toEqual([]);
    });
  }

  it("event select exposes a rounded location, not the street address", () => {
    expect(PUBLIC_EVENT_SELECT.venue.select).toMatchObject({ neighborhood: true, crossStreets: true, lat: true, lng: true });
    expect("address" in PUBLIC_EVENT_SELECT.venue.select).toBe(false);
  });
});
