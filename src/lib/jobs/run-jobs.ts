import type { Db } from "@/lib/db";
import type { Mailer } from "@/lib/email/mailer";
import { closeEvents } from "./close-events";
import { expireRequests } from "./expire-requests";
import { goNoGo } from "./go-no-go";
import { requestReviews } from "./request-reviews";
import { revealAddresses } from "./reveal-addresses";
import { errorMessage } from "./shared";
import { JOB_NAMES, type JobName, type JobReport, type JobResult } from "./types";

type Job = (db: Db, mailer: Mailer, now: Date) => Promise<JobResult>;

const JOBS: Record<JobName, Job> = { expireRequests, goNoGo, revealAddresses, closeEvents, requestReviews };

/**
 * The scheduled sweep (docs/strategy.md, Scheduled jobs), in order: expire
 * stale requests, decide go/no-go, reveal addresses, close finished dinners,
 * ask for reviews. Every job is idempotent, so running this twice in a row
 * changes nothing the second time. Called hourly by /api/cron and on demand
 * from the admin page.
 */
export async function runJobs(db: Db, mailer: Mailer, now = new Date()): Promise<JobReport> {
  const jobs = {} as Record<JobName, JobResult>;
  for (const name of JOB_NAMES) {
    try {
      jobs[name] = await JOBS[name](db, mailer, now);
    } catch (err) {
      jobs[name] = { processed: 0, emails: 0, errors: [errorMessage(err)] };
    }
  }
  return { ranAt: now.toISOString(), jobs };
}
