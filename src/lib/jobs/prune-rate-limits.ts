import type { Db } from "@/lib/db";
import type { Mailer } from "@/lib/email/mailer";
import { pruneRateLimits as prune } from "@/lib/security/rate-limit";
import { emptyResult } from "./shared";
import type { JobResult } from "./types";

/** Housekeeping: drop rate-limit counters whose window ended long ago. */
export async function pruneRateLimits(db: Db, _mailer: Mailer, now = new Date()): Promise<JobResult> {
  const result = emptyResult();
  result.processed = await prune(db, now);
  return result;
}
