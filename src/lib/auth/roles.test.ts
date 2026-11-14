import { describe, expect, it } from "vitest";
import { hasRole, parseAdminEmails, parseAdmins, rolesForSignIn } from "./roles";

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases", () => {
    expect([...parseAdminEmails(" A@X.com, b@y.com ,, ")]).toEqual(["a@x.com", "b@y.com"]);
  });
  it("is empty when unset", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
  });
});

describe("rolesForSignIn", () => {
  const admins = parseAdmins({ ADMIN_EMAILS: "ernest@example.com", ADMIN_PHONES: "+1 212 555 1234" });

  it("gives a new user GUEST only", () => {
    expect(rolesForSignIn({ email: "someone@example.com" }, [], admins)).toEqual(["GUEST"]);
    expect(rolesForSignIn({ phone: "+19175550100" }, [], admins)).toEqual(["GUEST"]);
  });

  it("grants ADMIN from ADMIN_EMAILS, case-insensitively, and from ADMIN_PHONES", () => {
    expect(rolesForSignIn({ email: "Ernest@Example.com" }, [], admins)).toEqual(["GUEST", "ADMIN"]);
    expect(rolesForSignIn({ phone: "+12125551234" }, [], admins)).toEqual(["GUEST", "ADMIN"]);
    expect(rolesForSignIn({ email: null, phone: null }, [], admins)).toEqual(["GUEST"]);
  });

  it("keeps an existing CHEF role but never adds one", () => {
    expect(rolesForSignIn({ email: "chef@example.com" }, ["CHEF"], admins)).toEqual(["GUEST", "CHEF"]);
    expect(rolesForSignIn({ email: "chef@example.com" }, [], admins)).not.toContain("CHEF");
  });

  it("does not strip ADMIN from a user no longer listed (admin removal is manual)", () => {
    expect(rolesForSignIn({ email: "former@example.com" }, ["GUEST", "ADMIN"], admins)).toEqual(["GUEST", "ADMIN"]);
  });
});

describe("hasRole", () => {
  it("handles undefined", () => {
    expect(hasRole(undefined, "ADMIN")).toBe(false);
    expect(hasRole(["GUEST", "ADMIN"], "ADMIN")).toBe(true);
  });
});
