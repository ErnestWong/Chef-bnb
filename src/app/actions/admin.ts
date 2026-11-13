"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getMailer } from "@/lib/email/mailer";
import { runJobs } from "@/lib/jobs/run-jobs";
import type { JobReport } from "@/lib/jobs/types";

export type RunJobsResult = { ok: true; report: JobReport; transport: string } | { ok: false; error: string };

/** Admin "run jobs now": the same sweep the cron route runs, on demand. */
export async function runJobsAction(): Promise<RunJobsResult> {
  await requireRole("ADMIN", "/admin");
  const mailer = getMailer();
  const report = await runJobs(getDb(), mailer);
  for (const path of ["/admin", "/events", "/chef", "/bookings"]) revalidatePath(path);
  return { ok: true, report, transport: mailer.transport.name };
}
