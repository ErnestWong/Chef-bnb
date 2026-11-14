/**
 * Outbound notification texts (not login codes; those go through Verify).
 * Twilio Messages API when a Messaging Service is configured, the console
 * otherwise, memory in tests. Mirrors src/lib/email/mailer.ts.
 */
export type OutgoingSms = { to: string; body: string };

export interface SmsTransport {
  readonly name: "twilio" | "console" | "memory";
  send(sms: OutgoingSms): Promise<void>;
}

export type SmsSender = {
  readonly transport: SmsTransport;
  /** Send one text. Returns false (and logs) on failure; never throws. */
  send(sms: OutgoingSms): Promise<boolean>;
};

export class MemorySmsTransport implements SmsTransport {
  readonly name = "memory";
  readonly sent: OutgoingSms[] = [];
  async send(sms: OutgoingSms) {
    this.sent.push(sms);
  }
  to(phone: string) {
    return this.sent.filter((s) => s.to === phone);
  }
}

export class ConsoleSmsTransport implements SmsTransport {
  readonly name = "console";
  async send(sms: OutgoingSms) {
    console.info(`[sms] to=${sms.to}\n${sms.body}`);
  }
}

type TwilioSmsConfig = { accountSid: string; authToken: string; messagingServiceSid: string; fetch?: typeof fetch };

export class TwilioSmsTransport implements SmsTransport {
  readonly name = "twilio";
  private readonly url: string;
  private readonly auth: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly cfg: TwilioSmsConfig) {
    this.url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
    this.auth = "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    this.fetchImpl = cfg.fetch ?? fetch;
  }

  async send(sms: OutgoingSms) {
    const res = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { authorization: this.auth, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: sms.to, MessagingServiceSid: this.cfg.messagingServiceSid, Body: sms.body }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`Twilio Messages ${res.status}: ${json.message ?? "unknown"}`);
    }
  }
}

export function createSmsSender(transport: SmsTransport): SmsSender {
  return {
    transport,
    async send(sms) {
      try {
        await transport.send(sms);
        return true;
      } catch (err) {
        console.error(`[sms] failed to ${sms.to}`, err);
        return false;
      }
    },
  };
}

type Env = Record<string, string | undefined>;

export function smsTransportFromEnv(env: Env = process.env): SmsTransport {
  const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken, TWILIO_MESSAGING_SERVICE_SID: messagingServiceSid } = env;
  return accountSid && authToken && messagingServiceSid
    ? new TwilioSmsTransport({ accountSid, authToken, messagingServiceSid })
    : new ConsoleSmsTransport();
}
