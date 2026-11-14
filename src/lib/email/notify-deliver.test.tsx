import { describe, expect, it, vi } from "vitest";
import { MemoryTransport, createMailer } from "@/lib/email/mailer";
import { createMessenger } from "@/lib/messaging";
import { MemorySmsTransport, createSmsSender } from "@/lib/sms/sender";
import { deliver } from "./notify";

function setup() {
  const mail = new MemoryTransport();
  const sms = new MemorySmsTransport();
  const m = createMessenger(createMailer(mail, "Covers <test@example.test>"), createSmsSender(sms));
  const message = { email: { subject: "Hello", react: <p>Hello</p> }, sms: "Covers: hello" };
  return { mail, sms, m, message };
}

describe("deliver", () => {
  it("texts people with a phone, emails the rest", async () => {
    const { mail, sms, m, message } = setup();
    expect(await deliver(m, { name: "Ada", email: "ada@example.test", phone: "+12125551234" }, message)).toBe(true);
    expect(await deliver(m, { name: "Bo", email: "bo@example.test", phone: null }, message)).toBe(true);
    expect(sms.sent.map((s) => s.to)).toEqual(["+12125551234"]);
    expect(mail.sent.map((e) => e.to)).toEqual(["bo@example.test"]);
  });

  it("can prefer email when the message is long, and still falls back to sms", async () => {
    const { mail, sms, m, message } = setup();
    await deliver(m, { name: "Ada", email: "ada@example.test", phone: "+12125551234" }, message, "email");
    await deliver(m, { name: "Cy", email: null, phone: "+12125550000" }, message, "email");
    expect(mail.sent.map((e) => e.to)).toEqual(["ada@example.test"]);
    expect(sms.sent.map((s) => s.to)).toEqual(["+12125550000"]);
  });

  it("returns false and logs when there is nobody to reach", async () => {
    const { m, message } = setup();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deliver(m, { name: "Nobody", email: null, phone: null }, message)).toBe(false);
    expect(error).toHaveBeenCalled();
  });
});
