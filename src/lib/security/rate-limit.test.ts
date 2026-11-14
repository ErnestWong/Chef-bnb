import { describe, expect, it } from "vitest";
import { RateLimitError, retryMessage } from "./rate-limit";
import { LIMITS, RATE_LIMIT_RETENTION_SECONDS } from "./limits";

describe("rate limit rules", () => {
  it("phrases the wait for people", () => {
    expect(retryMessage(30)).toBe("Too many attempts. Try again in a minute.");
    expect(retryMessage(89)).toBe("Too many attempts. Try again in a minute.");
    expect(retryMessage(600)).toBe("Too many attempts. Try again in 10 minutes.");
    expect(new RateLimitError(120).message).toBe("Too many attempts. Try again in 2 minutes.");
  });
  it("prunes nothing a live window still needs", () => {
    for (const rule of Object.values(LIMITS)) expect(rule.windowSeconds).toBeLessThanOrEqual(RATE_LIMIT_RETENTION_SECONDS);
  });
});
