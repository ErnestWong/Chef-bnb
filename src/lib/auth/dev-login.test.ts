import { describe, expect, it } from "vitest";
import { isDevLoginEnabled } from "./dev-login";

describe("isDevLoginEnabled", () => {
  it("is on locally and under vercel dev", () => {
    expect(isDevLoginEnabled({})).toBe(true);
    expect(isDevLoginEnabled({ VERCEL_ENV: "development" })).toBe(true);
  });

  it("is off on previews and production, which share the real database", () => {
    expect(isDevLoginEnabled({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isDevLoginEnabled({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("can be forced either way", () => {
    expect(isDevLoginEnabled({ VERCEL_ENV: "preview", AUTH_DEV_LOGIN: "true" })).toBe(true);
    expect(isDevLoginEnabled({ AUTH_DEV_LOGIN: "false" })).toBe(false);
  });
});
