import { getDb } from "@/lib/db";
import { getMailer } from "@/lib/email/mailer";
import { isCronAuthorized } from "@/lib/jobs/cron-auth";
import { runJobs } from "@/lib/jobs/run-jobs";

const headers = { "cache-control": "no-store" };

/** Scheduled sweep (vercel.json → crons). Requires the CRON_SECRET bearer token. */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 500, headers });
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  const report = await runJobs(getDb(), getMailer());
  return Response.json(report, { headers });
}

export const GET = handle;
export const POST = handle;
