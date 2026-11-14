import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

export type OutgoingEmail = { from: string; to: string; subject: string; html: string; text: string };

/** Where rendered emails go: Resend in deployed environments, the console in dev, memory in tests. */
export interface EmailTransport {
  readonly name: string;
  send(email: OutgoingEmail): Promise<void>;
}

export type EmailInput = { to: string; subject: string; react: ReactElement };

export type Mailer = {
  readonly transport: EmailTransport;
  /** Render and send one email. Returns false (and logs) on failure; never throws, so a mail outage can't break a booking. */
  send(input: EmailInput): Promise<boolean>;
};

export class MemoryTransport implements EmailTransport {
  readonly name = "memory";
  readonly sent: OutgoingEmail[] = [];
  async send(email: OutgoingEmail) {
    this.sent.push(email);
  }
  /** Emails sent to one address, oldest first. */
  to(address: string) {
    return this.sent.filter((e) => e.to === address);
  }
}

/** Dev fallback when RESEND_API_KEY is unset: print the plain-text version. */
export class ConsoleTransport implements EmailTransport {
  readonly name = "console";
  async send(email: OutgoingEmail) {
    console.info(`[email] to=${email.to} subject=${JSON.stringify(email.subject)}\n${email.text}`);
  }
}

export class ResendTransport implements EmailTransport {
  readonly name = "resend";
  private readonly client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(email: OutgoingEmail) {
    const { error } = await this.client.emails.send(email);
    if (error) throw new Error(`Resend ${error.name}: ${error.message}`);
  }
}

export function createMailer(transport: EmailTransport, from: string): Mailer {
  return {
    transport,
    async send(input) {
      try {
        const [html, text] = await Promise.all([render(input.react), render(input.react, { plainText: true })]);
        await transport.send({ from, to: input.to, subject: input.subject, html, text });
        return true;
      } catch (err) {
        console.error(`[email] failed: ${JSON.stringify(input.subject)} to ${input.to}`, err);
        return false;
      }
    },
  };
}

/** Resend's shared test sender, usable before a domain is verified (delivers only to the Resend account's own address). */
export const DEFAULT_FROM = "Chef-bnb <onboarding@resend.dev>";

type Env = Record<string, string | undefined>;

export function transportFromEnv(env: Env = process.env): EmailTransport {
  return env.RESEND_API_KEY ? new ResendTransport(env.RESEND_API_KEY) : new ConsoleTransport();
}

export function fromAddress(env: Env = process.env): string {
  return env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

const globalForMailer = globalThis as unknown as { __chefbnbMailer?: Mailer };

/** Shared app mailer, built on first use so nothing reads env at import time. */
export function getMailer(): Mailer {
  if (!globalForMailer.__chefbnbMailer) {
    globalForMailer.__chefbnbMailer = createMailer(transportFromEnv(), fromAddress());
  }
  return globalForMailer.__chefbnbMailer;
}
