import { getBuildInfo } from "@/lib/build-info";
import { isDevLoginEnabled } from "@/lib/auth/dev-login";
import { getDb } from "@/lib/db";
import { isPhoneSignInEnabled, twilioConfigFromEnv } from "@/lib/sms/verify";

/**
 * The database ping is remembered for a few seconds per instance, so hammering
 * this public endpoint can't turn into a stream of database queries.
 */
const PING_TTL_MS = 15_000;
let lastPing: { at: number; result: Promise<"ok" | "error"> } | null = null;

function pingDatabase(): Promise<"ok" | "error"> {
  const now = Date.now();
  if (lastPing && now - lastPing.at < PING_TTL_MS) return lastPing.result;
  const result = getDb()
    .$queryRaw`SELECT 1`.then(() => "ok" as const)
    .catch(() => "error" as const);
  lastPing = { at: now, result };
  return result;
}

/**
 * Liveness plus a configuration readout (booleans only, never values), so a
 * glance at /api/health says which integrations a deployment is running with.
 */
export async function GET() {
  const database = await pingDatabase();
  const env = process.env;
  return Response.json(
    {
      status: database === "ok" ? "ok" : "degraded",
      ...getBuildInfo(),
      time: new Date().toISOString(),
      database,
      email: env.RESEND_API_KEY ? "resend" : "console",
      sms: env.TWILIO_MESSAGING_SERVICE_SID && env.TWILIO_ACCOUNT_SID ? "twilio" : "console",
      phoneSignIn: twilioConfigFromEnv(env) ? "twilio" : isPhoneSignInEnabled(env) ? "console" : "off",
      cron: Boolean(env.CRON_SECRET),
      maps: Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN),
      devLogin: isDevLoginEnabled(),
    },
    { status: database === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
