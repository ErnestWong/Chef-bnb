import type { Db } from "@/lib/db";
import { RATE_LIMIT_RETENTION_SECONDS, type RateLimitRule } from "./limits";

export type RateLimitResult = { ok: boolean; count: number; limit: number; retryAfterSeconds: number };

export function retryMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait = retryAfterSeconds < 90 ? "a minute" : `${minutes} minutes`;
  return `Too many attempts. Try again in ${wait}.`;
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(retryMessage(retryAfterSeconds));
    this.name = "RateLimitError";
  }
}

/**
 * Count one hit against `key` in a fixed window. One atomic upsert: the row
 * is created or, if its window has lapsed, reset; otherwise incremented.
 * Returns whether the hit is within the limit. Keys look like
 * "signin:ip:203.0.113.9" or "book:user:<id>".
 */
export async function rateLimit(db: Db, key: string, rule: RateLimitRule, now = new Date()): Promise<RateLimitResult> {
  const cutoff = new Date(now.getTime() - rule.windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number; window_start: Date }[]>`
    INSERT INTO "rate_limits" ("key", "window_start", "count") VALUES (${key}, ${now}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."window_start" <= ${cutoff} THEN 1 ELSE "rate_limits"."count" + 1 END,
      "window_start" = CASE WHEN "rate_limits"."window_start" <= ${cutoff} THEN ${now} ELSE "rate_limits"."window_start" END
    RETURNING "count", "window_start"
  `;
  const row = rows[0];
  const ok = row.count <= rule.limit;
  const retryAfterSeconds = ok ? 0 : Math.max(1, Math.ceil((row.window_start.getTime() + rule.windowSeconds * 1000 - now.getTime()) / 1000));
  return { ok, count: row.count, limit: rule.limit, retryAfterSeconds };
}

/** Throw a RateLimitError when over the limit. */
export async function enforceRateLimit(db: Db, key: string, rule: RateLimitRule, now = new Date()): Promise<void> {
  const result = await rateLimit(db, key, rule, now);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}

/** For server actions: the error message to show, or null when the hit is allowed. */
export async function rateLimitMessage(db: Db, key: string, rule: RateLimitRule, now = new Date()): Promise<string | null> {
  const result = await rateLimit(db, key, rule, now);
  return result.ok ? null : retryMessage(result.retryAfterSeconds);
}

/** Drop counters whose window ended long ago. Returns how many rows went. */
export async function pruneRateLimits(db: Db, now = new Date(), olderThanSeconds = RATE_LIMIT_RETENTION_SECONDS): Promise<number> {
  const { count } = await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - olderThanSeconds * 1000) } } });
  return count;
}
