import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("keeps paths on this site, with their query and hash", () => {
    expect(safeRedirectPath("/account", "/")).toBe("/account");
    expect(safeRedirectPath("/events?where=BROOKLYN&solo=1#list", "/")).toBe("/events?where=BROOKLYN&solo=1#list");
    expect(safeRedirectPath("/chef/events/abc", null)).toBe("/chef/events/abc");
  });

  it("refuses anything that leaves the site", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\\/evil.example",
      "\\\\evil.example",
      "/\tevil.example",
      "/\nevil.example",
      "javascript:alert(1)",
      "",
      "account",
    ]) {
      expect(safeRedirectPath(bad, "/account"), bad).toBe("/account");
    }
    expect(safeRedirectPath(undefined, "/account")).toBe("/account");
    expect(safeRedirectPath(42, null)).toBeNull();
  });

  it("returns what the browser would actually open, never a host", () => {
    // Encoded backslashes stay encoded in the path, so they can't switch hosts.
    expect(safeRedirectPath("/%5Cevil.example", "/")).toBe("/%5Cevil.example");
    expect(safeRedirectPath("/a/../b", "/")).toBe("/b");
  });
});
