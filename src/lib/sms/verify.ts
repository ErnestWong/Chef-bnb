/**
 * One-time login codes by SMS. Twilio Verify generates, sends and checks the
 * codes and handles carrier registration for them; in development and tests a
 * console verifier accepts a fixed code so nothing waits on an account.
 */
export interface PhoneVerifier {
  readonly name: "twilio" | "console" | "memory";
  /** Send a code to this E.164 number. Throws on provider failure. */
  start(phone: string): Promise<void>;
  /** True when the code matches and hasn't expired. Never throws for a wrong code. */
  check(phone: string, code: string): Promise<boolean>;
}

export class VerifyError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "VerifyError";
  }
}

type TwilioConfig = { accountSid: string; authToken: string; verifyServiceSid: string; fetch?: typeof fetch };

/** Twilio Verify over its REST API; no SDK, one dependency fewer in the serverless bundle. */
export class TwilioVerifier implements PhoneVerifier {
  readonly name = "twilio";
  private readonly base: string;
  private readonly auth: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly cfg: TwilioConfig) {
    this.base = `https://verify.twilio.com/v2/Services/${cfg.verifyServiceSid}`;
    this.auth = "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    this.fetchImpl = cfg.fetch ?? fetch;
  }

  private async post(path: string, body: Record<string, string>) {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      method: "POST",
      headers: { authorization: this.auth, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    const json = (await res.json().catch(() => ({}))) as { status?: string; message?: string; code?: number };
    return { ok: res.ok, status: res.status, json };
  }

  async start(phone: string) {
    const { ok, status, json } = await this.post("/Verifications", { To: phone, Channel: "sms" });
    if (!ok) throw new VerifyError(`Twilio Verify start failed (${status}): ${json.message ?? "unknown"}`, status);
  }

  async check(phone: string, code: string) {
    const { ok, status, json } = await this.post("/VerificationCheck", { To: phone, Code: code });
    // 404 = no pending verification (expired or already used): treat as a wrong code.
    if (status === 404) return false;
    if (!ok) throw new VerifyError(`Twilio Verify check failed (${status}): ${json.message ?? "unknown"}`, status);
    return json.status === "approved";
  }
}

/** Dev fallback: every number gets the same code, printed to the server log. Never enabled in production. */
export const DEV_PHONE_CODE = "000000";

export class ConsoleVerifier implements PhoneVerifier {
  readonly name = "console";
  async start(phone: string) {
    console.info(`[sms] login code for ${phone}: ${DEV_PHONE_CODE} (console verifier; set TWILIO_* to send real codes)`);
  }
  async check(_phone: string, code: string) {
    return code === DEV_PHONE_CODE;
  }
}

/** Tests: remembers which numbers were sent a code; accepts DEV_PHONE_CODE only for those. */
export class MemoryVerifier implements PhoneVerifier {
  readonly name = "memory";
  readonly started: string[] = [];
  async start(phone: string) {
    this.started.push(phone);
  }
  async check(phone: string, code: string) {
    return this.started.includes(phone) && code === DEV_PHONE_CODE;
  }
}

type Env = Record<string, string | undefined>;

export function twilioConfigFromEnv(env: Env = process.env): TwilioConfig | null {
  const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken, TWILIO_VERIFY_SERVICE_SID: verifyServiceSid } = env;
  return accountSid && authToken && verifyServiceSid ? { accountSid, authToken, verifyServiceSid } : null;
}

/**
 * Phone sign-in is on when Twilio Verify is configured, and otherwise only
 * outside production (console codes). Production without Twilio has no
 * phone sign-in rather than a sign-in anyone can pass.
 */
export function isPhoneSignInEnabled(env: Env = process.env): boolean {
  return Boolean(twilioConfigFromEnv(env)) || env.VERCEL_ENV !== "production";
}

export function verifierFromEnv(env: Env = process.env): PhoneVerifier {
  const cfg = twilioConfigFromEnv(env);
  return cfg ? new TwilioVerifier(cfg) : new ConsoleVerifier();
}

const globalForVerifier = globalThis as unknown as { __chefbnbVerifier?: PhoneVerifier };

/** Shared verifier, built on first use so nothing reads env at import time. */
export function getVerifier(): PhoneVerifier {
  if (!globalForVerifier.__chefbnbVerifier) globalForVerifier.__chefbnbVerifier = verifierFromEnv();
  return globalForVerifier.__chefbnbVerifier;
}
