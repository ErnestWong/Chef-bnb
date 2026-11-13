import { describe, expect, it } from "vitest";
import { getBuildInfo } from "./build-info";

describe("getBuildInfo", () => {
  it("reports a Vercel production build", () => {
    expect(
      getBuildInfo({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_SHA: "0123456789abcdef",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toEqual({ commit: "0123456", branch: "main", environment: "production" });
  });

  it("reports a preview build", () => {
    expect(getBuildInfo({ VERCEL_ENV: "preview" }).environment).toBe("preview");
  });

  it("falls back to development with no Vercel variables", () => {
    expect(getBuildInfo({})).toEqual({
      commit: null,
      branch: null,
      environment: "development",
    });
  });
});
