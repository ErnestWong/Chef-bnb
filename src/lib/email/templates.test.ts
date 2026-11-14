import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import * as T from "./templates";
import { appUrl } from "./templates/layout";

const startsAt = new Date("2026-12-06T00:00:00Z"); // Sat Dec 5, 7 pm New York
const base = { guestName: "Ada", chefName: "Casa Wong", eventId: "evt_1", eventTitle: "Dim Sum Brunch Table", startsAt, bookingId: "bk_1" };
const ADDRESS = "742 Evergreen Terrace, Apt 3";

const all = () => [
  T.seatRequestedEmail({ ...base, bookingType: "GROUP", partySize: 3, amountCents: 16500, dietaryNotes: "One vegetarian" }),
  T.bookingConfirmedEmail({ ...base, partySize: 2, amountCents: 11000, neighborhood: "Flushing", crossStreets: "Main St & Roosevelt Ave" }),
  T.requestExpiredEmail({ ...base, eventOver: false }),
  T.requestExpiredEmail({ ...base, eventOver: true }),
  T.eventCancelledEmail({ ...base, recipientName: "Ada", recipient: "guest", reason: "Fewer than the minimum confirmed by the cutoff.", cancelledBy: "system", paidCents: 5500 }),
  T.eventCancelledEmail({ ...base, recipientName: "Casa Wong", recipient: "chef", reason: "Fewer than the minimum confirmed by the cutoff.", cancelledBy: "system", bookingsCancelled: 2 }),
  T.addressRevealEmail({ ...base, partySize: 2, address: ADDRESS, neighborhood: "Flushing", crossStreets: "Main St & Roosevelt Ave", byobNote: null, dietaryNotes: null }),
  T.reviewRequestEmail(base),
  T.chefApplicationDecidedEmail({ chefName: "Casa Wong", decision: "APPROVED", note: null }),
  T.chefApplicationDecidedEmail({ chefName: "Casa Wong", decision: "REJECTED", note: "Send a sample menu next time." }),
  T.markAttendanceEmail({ ...base, confirmedBookings: 4 }),
];

describe("email templates", () => {
  it("every template renders to html and plain text without holes", async () => {
    for (const email of all()) {
      const html = await render(email.react);
      const text = await render(email.react, { plainText: true });
      expect(email.subject.length).toBeGreaterThan(8);
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain("Covers");
      expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
  });

  it("formats dates in New York time and money in dollars", async () => {
    const text = await render(T.bookingConfirmedEmail({ ...base, partySize: 2, amountCents: 11000, neighborhood: "Flushing", crossStreets: "Main St & Roosevelt Ave" }).react, { plainText: true });
    expect(text).toContain("Sat, Dec 5");
    expect(text).toContain("7:00 PM");
    expect(text).toContain("$110");
  });

  it("only the address-reveal email carries the street address", async () => {
    const texts = await Promise.all(all().map((e) => render(e.react, { plainText: true })));
    const withAddress = texts.filter((t) => t.includes(ADDRESS));
    expect(withAddress).toHaveLength(1);
    expect(withAddress[0]).toContain("keep the address to your party");
  });

  it("picks the subject by outcome", () => {
    expect(T.chefApplicationDecidedEmail({ chefName: "X", decision: "APPROVED", note: null }).subject).toMatch(/approved/i);
    expect(T.chefApplicationDecidedEmail({ chefName: "X", decision: "REJECTED", note: null }).subject).not.toMatch(/approved/i);
    expect(T.eventCancelledEmail({ ...base, recipientName: "Ada", recipient: "guest", reason: "r", cancelledBy: "chef" }).subject).toBe("Cancelled: Dim Sum Brunch Table");
  });

  it("builds absolute links from NEXT_PUBLIC_APP_URL", () => {
    expect(appUrl("/bookings/1", { NEXT_PUBLIC_APP_URL: "https://chef-bnb.vercel.app/" })).toBe("https://chef-bnb.vercel.app/bookings/1");
    expect(appUrl("events", { NEXT_PUBLIC_APP_URL: "https://x.test" })).toBe("https://x.test/events");
    expect(appUrl("/", {})).toBe("http://localhost:3000/");
  });
});
