import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleTransport, DEFAULT_FROM, MemoryTransport, ResendTransport, createMailer, fromAddress, transportFromEnv } from "./mailer";

const hello = createElement("p", null, "Hello there");

describe("createMailer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders html and text and hands both to the transport", async () => {
    const memory = new MemoryTransport();
    const mailer = createMailer(memory, "Chef-bnb <hello@example.test>");
    expect(await mailer.send({ to: "ada@example.test", subject: "Hi", react: hello })).toBe(true);
    expect(memory.sent).toHaveLength(1);
    const [email] = memory.sent;
    expect(email).toMatchObject({ from: "Chef-bnb <hello@example.test>", to: "ada@example.test", subject: "Hi" });
    expect(email.html).toContain("<p>Hello there</p>");
    expect(email.text.trim()).toBe("Hello there");
    expect(memory.to("ada@example.test")).toHaveLength(1);
    expect(memory.to("nobody@example.test")).toHaveLength(0);
  });

  it("returns false and logs instead of throwing when the transport fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = { name: "failing", send: async () => { throw new Error("boom"); } };
    const mailer = createMailer(failing, DEFAULT_FROM);
    expect(await mailer.send({ to: "ada@example.test", subject: "Hi", react: hello })).toBe(false);
    expect(error).toHaveBeenCalledOnce();
  });
});

describe("transportFromEnv", () => {
  it("uses Resend when a key is set, the console otherwise", () => {
    expect(transportFromEnv({ RESEND_API_KEY: "re_test" })).toBeInstanceOf(ResendTransport);
    expect(transportFromEnv({})).toBeInstanceOf(ConsoleTransport);
    expect(transportFromEnv({ RESEND_API_KEY: "" })).toBeInstanceOf(ConsoleTransport);
  });

  it("falls back to Resend's test sender until EMAIL_FROM is set", () => {
    expect(fromAddress({})).toBe(DEFAULT_FROM);
    expect(fromAddress({ EMAIL_FROM: "  " })).toBe(DEFAULT_FROM);
    expect(fromAddress({ EMAIL_FROM: "Chef-bnb <hello@chef-bnb.nyc>" })).toBe("Chef-bnb <hello@chef-bnb.nyc>");
  });
});
