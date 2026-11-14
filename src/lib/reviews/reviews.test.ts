import { describe, expect, it } from "vitest";
import { RULES } from "@/lib/bookings/rules";
import { reviewDeadline, reviewEligibility, reviewSchema } from "./reviews";

const DAY = 24 * 3600 * 1000;
const startsAt = new Date("2026-11-01T00:00:00Z");
const base = { guestUserId: "g1", status: "ATTENDED" as const, event: { startsAt }, review: null };
const now = new Date(startsAt.getTime() + 2 * DAY);

describe("reviewEligibility", () => {
  it("opens for the attending guest inside the window", () => {
    expect(reviewEligibility(base, "g1", now)).toEqual({ ok: true, deadline: reviewDeadline(startsAt) });
  });
  it("is closed to anyone but the guest", () => {
    expect(reviewEligibility(base, "g2", now)).toMatchObject({ ok: false, code: "not_yours" });
  });
  it("waits for the chef to mark attendance", () => {
    for (const status of ["REQUESTED", "CONFIRMED", "NO_SHOW", "CANCELLED", "EXPIRED"] as const) {
      expect(reviewEligibility({ ...base, status }, "g1", now)).toMatchObject({ ok: false, code: "not_attended" });
    }
  });
  it("closes after the review window", () => {
    const late = new Date(startsAt.getTime() + (RULES.REVIEW_WINDOW_DAYS + 1) * DAY);
    expect(reviewEligibility(base, "g1", late)).toMatchObject({ ok: false, code: "window_closed" });
    const lastMinute = new Date(reviewDeadline(startsAt).getTime());
    expect(reviewEligibility(base, "g1", lastMinute).ok).toBe(true);
  });
  it("allows one review per booking", () => {
    expect(reviewEligibility({ ...base, review: { id: "r1" } }, "g1", now)).toMatchObject({ ok: false, code: "already_reviewed" });
  });
});

describe("reviewSchema", () => {
  it("accepts 1 to 5 stars and an optional body", () => {
    expect(reviewSchema.safeParse({ bookingId: "b", rating: "4" }).success).toBe(true);
    expect(reviewSchema.safeParse({ bookingId: "b", rating: "4", body: "  Lovely.  " }).data?.body).toBe("Lovely.");
  });
  it("rejects missing or out-of-range ratings", () => {
    expect(reviewSchema.safeParse({ bookingId: "b", rating: "0" }).success).toBe(false);
    expect(reviewSchema.safeParse({ bookingId: "b", rating: "6" }).success).toBe(false);
    expect(reviewSchema.safeParse({ bookingId: "b", rating: "3.5" }).success).toBe(false);
    expect(reviewSchema.safeParse({ bookingId: "b" }).success).toBe(false);
  });
});
