import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron-auth";

describe("isCronAuthorized", () => {
  it("accepts exactly the bearer token", () => {
    expect(isCronAuthorized("Bearer s3cret", "s3cret")).toBe(true);
  });
  it("rejects wrong, missing, or differently shaped headers", () => {
    expect(isCronAuthorized("Bearer s3cre", "s3cret")).toBe(false);
    expect(isCronAuthorized("Bearer s3cret ", "s3cret")).toBe(false);
    expect(isCronAuthorized("s3cret", "s3cret")).toBe(false);
    expect(isCronAuthorized(null, "s3cret")).toBe(false);
    expect(isCronAuthorized(undefined, "s3cret")).toBe(false);
  });
  it("rejects everything when the secret is unset", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
