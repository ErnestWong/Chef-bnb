import { describe, expect, it } from "vitest";
import { RULES } from "@/lib/bookings/rules";
import { HOUSE_RULES, HOUSE_RULES_SHORT } from "@/lib/policies";

describe("house rules", () => {
  it("state the numbers the code enforces", () => {
    const text = HOUSE_RULES.map((r) => `${r.title} ${r.body}`).join(" ");
    expect(text).toContain(`${RULES.MAX_GUESTS} guests`);
    expect(text).toContain(`${RULES.GROUP_CAP}`);
    expect(text).toContain(`${RULES.REQUEST_EXPIRY_HOURS} hours`);
    expect(text).toContain(`${RULES.ADDRESS_REVEAL_HOURS} hours`);
    expect(text).toContain(`${RULES.GO_NO_GO_HOURS} hours`);
    expect(HOUSE_RULES_SHORT).toContain(`${RULES.MAX_GUESTS} guests`);
  });

  it("always include BYOB and the guest cap", () => {
    expect(HOUSE_RULES.map((r) => r.id)).toEqual(expect.arrayContaining(["byob", "size", "pay-the-chef"]));
    expect(new Set(HOUSE_RULES.map((r) => r.id)).size).toBe(HOUSE_RULES.length);
  });
});
