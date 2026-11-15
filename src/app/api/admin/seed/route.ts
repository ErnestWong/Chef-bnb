import { getDb } from "@/lib/db";
import { isCronAuthorized } from "@/lib/jobs/cron-auth";
import { seedDemo } from "../../../../../prisma/seed";

const headers = { "cache-control": "no-store" };

// Seeding a few hundred rows over a pooled connection takes a while.
export const maxDuration = 60;

/**
 * Load the demo chefs, dinners and reviews into this deployment's database.
 * Only exists while DEMO_SEED=true is set (pre-launch); needs the CRON_SECRET
 * bearer like the cron route. Wipes every *@example.test user and all
 * dinners first, so never leave DEMO_SEED on once real content is in.
 */
export async function POST(request: Request) {
  if (process.env.DEMO_SEED !== "true") return new Response(null, { status: 404, headers });
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  const summary = await seedDemo(getDb());
  return Response.json({ ok: true, summary }, { headers });
}
