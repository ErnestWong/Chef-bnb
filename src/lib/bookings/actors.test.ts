import { describe, expect, it } from "vitest";
import { actorFor } from "./actors";

const booking = { guestUserId: "guest-1" };
const event = { chefUserId: "chef-1" };

describe("actorFor", () => {
  it("maps admin, chef and guest", () => {
    expect(actorFor({ id: "x", roles: ["GUEST", "ADMIN"] }, booking, event)).toBe("admin");
    expect(actorFor({ id: "chef-1", roles: ["GUEST", "CHEF"] }, booking, event)).toBe("chef");
    expect(actorFor({ id: "guest-1", roles: ["GUEST"] }, booking, event)).toBe("guest");
  });

  it("rejects strangers and a chef of a different event", () => {
    expect(actorFor({ id: "someone", roles: ["GUEST"] }, booking, event)).toBeNull();
    expect(actorFor({ id: "chef-2", roles: ["GUEST", "CHEF"] }, booking, event)).toBeNull();
  });

  it("does not treat the chef's own user as chef without the role", () => {
    expect(actorFor({ id: "chef-1", roles: ["GUEST"] }, booking, event)).toBeNull();
  });

  it("a chef booking their own event acts as guest, not chef", () => {
    expect(actorFor({ id: "chef-1", roles: ["GUEST", "CHEF"] }, { guestUserId: "chef-1" }, { chefUserId: "other" })).toBe("guest");
  });
});
