import { describe, expect, it } from "vitest";
import { isDevLoginEnabled } from "./dev-login";

describe("isDevLoginEnabled", () => {
  it("is on locally and on previews by default", () => {
    expect(isDevLoginEnabled({})).toBe(true);
    expect(isDevLoginEnabled({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isDevLoginEnabled({ VERCEL_ENV: "development" })).toBe(true);
  });

  it("is off in production unless explicitly enabled", () => {
    expect(isDevLoginEnabled({ VERCEL_ENV: "production" })).toBe(false);
    expect(isDevLoginEnabled({ VERCEL_ENV: "production", AUTH_DEV_LOGIN: "true" })).toBe(true);
  });

  it("can be forced off anywhere", () => {
    expect(isDevLoginEnabled({ AUTH_DEV_LOGIN: "false" })).toBe(false);
  });
});
