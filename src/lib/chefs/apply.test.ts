import { describe, expect, it } from "vitest";
import { applySchema, slugify } from "./apply";

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Casa Wong")).toBe("casa-wong");
    expect(slugify("  Tomás Villanueva! ")).toBe("tomas-villanueva");
    expect(slugify("???")).toBe("chef");
  });
});

describe("applySchema", () => {
  const valid = {
    displayName: "Casa Wong",
    bio: "Cantonese home cooking the way it tastes in the family kitchen, with far too much food for everyone.",
    cuisineIds: ["c1"],
    hosting: "HOME",
    paymentHandle: "@casa-wong",
  };

  it("accepts a minimal application and defaults flags", () => {
    const r = applySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.needsFoh).toBe(false);
  });

  it("requires a bio of substance, a cuisine and a payment handle", () => {
    expect(applySchema.safeParse({ ...valid, bio: "Hi" }).success).toBe(false);
    expect(applySchema.safeParse({ ...valid, cuisineIds: [] }).success).toBe(false);
    expect(applySchema.safeParse({ ...valid, paymentHandle: "" }).success).toBe(false);
  });

  it("validates website and instagram but allows them blank", () => {
    expect(applySchema.safeParse({ ...valid, website: "" , instagram: "" }).success).toBe(true);
    expect(applySchema.safeParse({ ...valid, website: "not a url" }).success).toBe(false);
    expect(applySchema.safeParse({ ...valid, instagram: "@casa.wong" }).success).toBe(true);
    expect(applySchema.safeParse({ ...valid, instagram: "has spaces" }).success).toBe(false);
  });
});
