import { describe, expect, it } from "vitest";
import { hasRole, parseAdminEmails, rolesForSignIn } from "./roles";

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases", () => {
    expect([...parseAdminEmails(" A@X.com, b@y.com ,, ")]).toEqual(["a@x.com", "b@y.com"]);
  });
  it("is empty when unset", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
  });
});

describe("rolesForSignIn", () => {
  const admins = parseAdminEmails("ernest@example.com");

  it("gives a new user GUEST only", () => {
    expect(rolesForSignIn("someone@example.com", [], admins)).toEqual(["GUEST"]);
  });

  it("grants ADMIN from ADMIN_EMAILS, case-insensitively", () => {
    expect(rolesForSignIn("Ernest@Example.com", [], admins)).toEqual(["GUEST", "ADMIN"]);
  });

  it("keeps an existing CHEF role but never adds one", () => {
    expect(rolesForSignIn("chef@example.com", ["CHEF"], admins)).toEqual(["GUEST", "CHEF"]);
    expect(rolesForSignIn("chef@example.com", [], admins)).not.toContain("CHEF");
  });

  it("does not strip ADMIN from a user no longer listed (admin removal is manual)", () => {
    expect(rolesForSignIn("former@example.com", ["GUEST", "ADMIN"], admins)).toEqual(["GUEST", "ADMIN"]);
  });
});

describe("hasRole", () => {
  it("handles undefined", () => {
    expect(hasRole(undefined, "ADMIN")).toBe(false);
    expect(hasRole(["GUEST", "ADMIN"], "ADMIN")).toBe(true);
  });
});
