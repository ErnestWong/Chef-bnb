import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./headers";

const prod = { nodeEnv: "production", vercelEnv: "production" };

describe("securityHeaders", () => {
  it("locks the page down in production", () => {
    const h = Object.fromEntries(securityHeaders(prod).map((x) => [x.key, x.value]));
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d+; includeSubDomains; preload/);
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
    const csp = h["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("vercel.live");
  });

  it("allows React refresh in development and skips HSTS on plain http", () => {
    const csp = contentSecurityPolicy({ nodeEnv: "development" });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(securityHeaders({ nodeEnv: "development" }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
  });

  it("lets Vercel's preview toolbar load only on previews", () => {
    const csp = contentSecurityPolicy({ nodeEnv: "production", vercelEnv: "preview" });
    expect(csp).toMatch(/script-src [^;]*https:\/\/vercel\.live/);
    expect(csp).toMatch(/frame-src https:\/\/vercel\.live/);
    expect(csp).not.toContain("unsafe-eval");
  });

  it("keeps room for Mapbox and avatars", () => {
    const csp = contentSecurityPolicy(prod);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/api\.mapbox\.com/);
    expect(csp).toMatch(/worker-src 'self' blob:/);
    expect(csp).toMatch(/img-src 'self' data: blob: https:/);
  });
});
