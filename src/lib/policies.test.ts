import { describe, expect, it } from "vitest";
import { RULES } from "@/lib/bookings/rules";
import { HOUSE_RULES, HOUSE_RULES_SHORT } from "@/lib/policies";

describe("house rules", () => {
  it("state the numbers the code enforces", () => {
    const text = HOUSE_RULES.map((r) => `${r.title} ${r.body}`).join(" ");
    expect(text).toContain(`${RULES.MAX_HOME_GUESTS} guests`);
    expect(text).toContain(`${RULES.GROUP_CAP}`);
    expect(text).toContain(`${RULES.REQUEST_EXPIRY_HOURS} hours`);
    expect(text).toContain(`${RULES.ADDRESS_REVEAL_HOURS} hours`);
    expect(text).toContain(`${RULES.GO_NO_GO_HOURS} hours`);
  });

  it("always include the one-table rule, drinks and paying the chef", () => {
    expect(HOUSE_RULES.map((r) => r.id)).toEqual(expect.arrayContaining(["table", "byob", "pay-the-chef"]));
    expect(new Set(HOUSE_RULES.map((r) => r.id)).size).toBe(HOUSE_RULES.length);
    expect(HOUSE_RULES_SHORT).toMatch(/one table/i);
    expect(HOUSE_RULES_SHORT).toContain("BYOB");
  });
});
