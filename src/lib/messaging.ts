import { type Mailer, getMailer } from "@/lib/email/mailer";
import { type SmsSender, createSmsSender, smsTransportFromEnv } from "@/lib/sms/sender";

/** Both outbound channels, handed to the notification senders and the jobs. */
export type Messenger = {
  readonly email: Mailer;
  readonly sms: SmsSender;
};

export function createMessenger(email: Mailer, sms: SmsSender): Messenger {
  return { email, sms };
}

const globalForMessenger = globalThis as unknown as { __chefbnbMessenger?: Messenger };

/** Shared app messenger, built on first use so nothing reads env at import time. */
export function getMessenger(): Messenger {
  if (!globalForMessenger.__chefbnbMessenger) {
    globalForMessenger.__chefbnbMessenger = createMessenger(getMailer(), createSmsSender(smsTransportFromEnv()));
  }
  return globalForMessenger.__chefbnbMessenger;
}
