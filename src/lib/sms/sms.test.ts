import { describe, expect, it, vi } from "vitest";
import { ConsoleSmsTransport, MemorySmsTransport, TwilioSmsTransport, createSmsSender, smsTransportFromEnv } from "./sender";
import * as S from "./texts";
import { ConsoleVerifier, DEV_PHONE_CODE, MemoryVerifier, TwilioVerifier, isPhoneSignInEnabled, twilioConfigFromEnv, verifierFromEnv } from "./verify";

const fakeFetch = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

describe("TwilioVerifier", () => {
  const cfg = { accountSid: "ACxxx", authToken: "secret", verifyServiceSid: "VAxxx" };

  it("starts a verification with basic auth and form encoding", async () => {
    const f = fakeFetch(201, { status: "pending" });
    await new TwilioVerifier({ ...cfg, fetch: f }).start("+12125551234");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://verify.twilio.com/v2/Services/VAxxx/Verifications");
    expect((init.headers as Record<string, string>).authorization).toBe("Basic " + Buffer.from("ACxxx:secret").toString("base64"));
    expect(String(init.body)).toBe("To=%2B12125551234&Channel=sms");
  });

  it("approves only when Twilio says approved, and treats a missing verification as wrong", async () => {
    expect(await new TwilioVerifier({ ...cfg, fetch: fakeFetch(200, { status: "approved" }) }).check("+12125551234", "123456")).toBe(true);
    expect(await new TwilioVerifier({ ...cfg, fetch: fakeFetch(200, { status: "pending" }) }).check("+12125551234", "000000")).toBe(false);
    expect(await new TwilioVerifier({ ...cfg, fetch: fakeFetch(404, { message: "not found" }) }).check("+12125551234", "000000")).toBe(false);
  });

  it("throws on provider errors so the caller can show 'try again'", async () => {
    await expect(new TwilioVerifier({ ...cfg, fetch: fakeFetch(429, { message: "Max send attempts reached" }) }).start("+12125551234")).rejects.toThrow(/429/);
    await expect(new TwilioVerifier({ ...cfg, fetch: fakeFetch(500, {}) }).check("+12125551234", "123456")).rejects.toThrow(/500/);
  });
});

describe("dev and test verifiers", () => {
  it("console verifier accepts the fixed dev code", async () => {
    const v = new ConsoleVerifier();
    vi.spyOn(console, "info").mockImplementation(() => {});
    await v.start("+12125551234");
    expect(await v.check("+12125551234", DEV_PHONE_CODE)).toBe(true);
    expect(await v.check("+12125551234", "123456")).toBe(false);
  });
  it("memory verifier only accepts numbers it sent a code to", async () => {
    const v = new MemoryVerifier();
    expect(await v.check("+12125551234", DEV_PHONE_CODE)).toBe(false);
    await v.start("+12125551234");
    expect(await v.check("+12125551234", DEV_PHONE_CODE)).toBe(true);
  });
});

describe("configuration", () => {
  const twilio = { TWILIO_ACCOUNT_SID: "AC", TWILIO_AUTH_TOKEN: "t", TWILIO_VERIFY_SERVICE_SID: "VA" };
  it("needs all three Twilio values", () => {
    expect(twilioConfigFromEnv(twilio)).not.toBeNull();
    expect(twilioConfigFromEnv({ ...twilio, TWILIO_AUTH_TOKEN: "" })).toBeNull();
    expect(verifierFromEnv(twilio).name).toBe("twilio");
    expect(verifierFromEnv({}).name).toBe("console");
  });
  it("never falls back to console codes in production", () => {
    expect(isPhoneSignInEnabled({ VERCEL_ENV: "production" })).toBe(false);
    expect(isPhoneSignInEnabled({ VERCEL_ENV: "production", ...twilio })).toBe(true);
    expect(isPhoneSignInEnabled({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isPhoneSignInEnabled({})).toBe(true);
  });
  it("sends texts through Twilio only with a messaging service", () => {
    expect(smsTransportFromEnv({ ...twilio, TWILIO_MESSAGING_SERVICE_SID: "MG" }).name).toBe("twilio");
    expect(smsTransportFromEnv(twilio).name).toBe("console");
  });
});

describe("sms sender", () => {
  it("posts to the Messages API with the messaging service", async () => {
    const f = fakeFetch(201, { sid: "SM1" });
    await new TwilioSmsTransport({ accountSid: "AC", authToken: "t", messagingServiceSid: "MG", fetch: f }).send({ to: "+12125551234", body: "hi" });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC/Messages.json");
    expect(String(init.body)).toBe("To=%2B12125551234&MessagingServiceSid=MG&Body=hi");
  });
  it("never throws: a failed send returns false", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = new TwilioSmsTransport({ accountSid: "AC", authToken: "t", messagingServiceSid: "MG", fetch: fakeFetch(400, { message: "bad" }) });
    expect(await createSmsSender(failing).send({ to: "+1", body: "x" })).toBe(false);
    const memory = new MemorySmsTransport();
    expect(await createSmsSender(memory).send({ to: "+1", body: "x" })).toBe(true);
    expect(memory.to("+1")).toHaveLength(1);
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await createSmsSender(new ConsoleSmsTransport()).send({ to: "+1", body: "x" })).toBe(true);
  });
});

describe("texts", () => {
  const startsAt = new Date("2026-12-06T00:00:00Z");
  const base = { guestName: "Ada", chefName: "Casa Wong", eventId: "evt_1", eventTitle: "Dim Sum Brunch Table", startsAt, bookingId: "bk_1" };
  const ADDRESS = "742 Evergreen Terrace, Apt 3";
  const all = () => ({
    seatRequested: S.seatRequestedText({ ...base, bookingType: "GROUP", partySize: 3, amountCents: 16500, dietaryNotes: "One vegetarian" }),
    confirmed: S.bookingConfirmedText({ ...base, partySize: 2, amountCents: 11000, neighborhood: "Flushing", crossStreets: "Main St & Roosevelt Ave", byob: true }),
    expired: S.requestExpiredText({ ...base, eventOver: false }),
    expiredOver: S.requestExpiredText({ ...base, eventOver: true }),
    cancelledGuest: S.eventCancelledText({ ...base, recipientName: "Ada", recipient: "guest", reason: "Fewer than the minimum confirmed by the cutoff.", cancelledBy: "system", paidCents: 5500 }),
    cancelledChef: S.eventCancelledText({ ...base, recipientName: "Casa Wong", recipient: "chef", reason: "Fewer than the minimum confirmed by the cutoff.", cancelledBy: "system", bookingsCancelled: 2 }),
    address: S.addressRevealText({ ...base, partySize: 2, venueName: null, address: ADDRESS, neighborhood: "Flushing", crossStreets: "Main St & Roosevelt Ave", byob: true, byobNote: null, dietaryNotes: null }),
    review: S.reviewRequestText(base),
    approved: S.chefApplicationDecidedText({ chefName: "Casa Wong", decision: "APPROVED", note: null }),
    rejected: S.chefApplicationDecidedText({ chefName: "Casa Wong", decision: "REJECTED", note: "Send a sample menu next time." }),
    attendance: S.markAttendanceText({ ...base, confirmedBookings: 4 }),
  });

  it("every text is short, branded and carries a link", () => {
    for (const [name, text] of Object.entries(all())) {
      expect(text, name).toMatch(/^Covers: /);
      expect(text, name).toMatch(/https?:\/\/\S+/);
      expect(text.length, name).toBeLessThan(320);
    }
  });

  it("only the address reveal carries the address", () => {
    const texts = all();
    expect(texts.address).toContain(ADDRESS);
    for (const [name, text] of Object.entries(texts)) if (name !== "address") expect(text, name).not.toContain(ADDRESS);
  });

  it("says what matters", () => {
    const t = all();
    expect(t.confirmed).toContain("You're in");
    expect(t.cancelledGuest).toContain("$55");
    expect(t.rejected).toContain("Send a sample menu next time.");
    expect(t.expiredOver).toContain("/events");
    expect(t.expired).toContain("/events/evt_1");
  });
});
