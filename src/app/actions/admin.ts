"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getMessenger } from "@/lib/messaging";
import { runJobs } from "@/lib/jobs/run-jobs";
import type { JobReport } from "@/lib/jobs/types";
import { LIMITS } from "@/lib/security/limits";
import { rateLimitMessage } from "@/lib/security/rate-limit";

export type RunJobsResult = { ok: true; report: JobReport; transport: string } | { ok: false; error: string };

/** Admin "run jobs now": the same sweep the cron route runs, on demand. */
export async function runJobsAction(): Promise<RunJobsResult> {
  const admin = await requireRole("ADMIN", "/admin");
  const limited = await rateLimitMessage(getDb(), `admin:user:${admin.id}`, LIMITS.adminActionsPerUser);
  if (limited) return { ok: false, error: limited };
  const messenger = getMessenger();
  const report = await runJobs(getDb(), messenger);
  for (const path of ["/admin", "/events", "/chef", "/bookings"]) revalidatePath(path);
  return { ok: true, report, transport: messenger.email.transport.name };
}
