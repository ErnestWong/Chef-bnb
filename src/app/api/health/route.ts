import { getBuildInfo } from "@/lib/build-info";
import { isDevLoginEnabled } from "@/lib/auth/dev-login";
import { getDb } from "@/lib/db";

/**
 * Liveness plus a configuration readout (booleans only, never values), so a
 * glance at /api/health says which integrations a deployment is running with.
 */
export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await getDb().$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  const env = process.env;
  return Response.json(
    {
      status: database === "ok" ? "ok" : "degraded",
      ...getBuildInfo(),
      time: new Date().toISOString(),
      database,
      email: env.RESEND_API_KEY ? "resend" : "console",
      cron: Boolean(env.CRON_SECRET),
      maps: Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN),
      devLogin: isDevLoginEnabled(),
    },
    { status: database === "ok" ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
