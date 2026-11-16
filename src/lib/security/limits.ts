/** Rate-limit rules: fixed windows, counted per key in Postgres so every serverless instance sees the same numbers. */
export type RateLimitRule = { limit: number; windowSeconds: number };

export const LIMITS = {
  /** Sign-in attempts from one IP. */
  signInPerIp: { limit: 20, windowSeconds: 15 * 60 },
  /** Sign-in attempts for one email address, from anywhere. */
  signInPerEmail: { limit: 10, windowSeconds: 60 * 60 },
  /** Login codes sent to one phone number (each costs money and a carrier message). */
  codesPerPhone: { limit: 5, windowSeconds: 60 * 60 },
  /** Code checks for one phone number: six digits, so guessing must stay expensive. */
  codeChecksPerPhone: { limit: 8, windowSeconds: 15 * 60 },
  /** Seat requests, cancellations and chef booking decisions by one signed-in user. */
  bookingActionsPerUser: { limit: 30, windowSeconds: 60 * 60 },
  /** Chef applications (including re-applications) by one user. */
  applyPerUser: { limit: 3, windowSeconds: 24 * 60 * 60 },
  /** Reviews posted by one user. */
  reviewsPerUser: { limit: 10, windowSeconds: 24 * 60 * 60 },
  /** Event creates and edits by one chef. */
  eventSavesPerChef: { limit: 60, windowSeconds: 60 * 60 },
  /** Open-night pitches and withdrawals by one chef. */
  pitchesPerChef: { limit: 20, windowSeconds: 60 * 60 },
  /** Admin moderation actions (approve, reject, remove review). */
  adminActionsPerUser: { limit: 120, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

/** Rows older than this are pruned by the scheduled jobs; no window is longer. */
export const RATE_LIMIT_RETENTION_SECONDS = 2 * 24 * 60 * 60;
