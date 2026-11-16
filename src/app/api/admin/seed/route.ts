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
  // The seed deletes every chef profile and dinner. Once a real chef exists, refuse, flag or no flag.
  const realChefs = await getDb().chefProfile.count({
    where: { user: { OR: [{ email: null }, { NOT: { email: { endsWith: "@example.test" } } }] } },
  });
  if (realChefs > 0) {
    return Response.json({ error: `Refusing to seed: ${realChefs} real chef profile(s) exist. Turn DEMO_SEED off.` }, { status: 409, headers });
  }
  const summary = await seedDemo(getDb());
  return Response.json({ ok: true, summary }, { headers });
}
