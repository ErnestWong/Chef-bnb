/** Shared with the admin UI, so nothing here may import server-only code. */

export const JOB_NAMES = ["expireRequests", "goNoGo", "revealAddresses", "closeEvents", "requestReviews"] as const;
export type JobName = (typeof JOB_NAMES)[number];

export const JOB_LABELS: Record<JobName, string> = {
  expireRequests: "Expire unpaid requests",
  goNoGo: "Go / no-go at the cutoff",
  revealAddresses: "Reveal addresses",
  closeEvents: "Close finished dinners",
  requestReviews: "Request reviews",
};

export type JobResult = {
  /** Rows this run changed (0 on a repeat run). */
  processed: number;
  /** Emails that went out. */
  emails: number;
  /** One message per row that failed; the sweep continues past failures. */
  errors: string[];
};

export type JobReport = { ranAt: string; jobs: Record<JobName, JobResult> };
