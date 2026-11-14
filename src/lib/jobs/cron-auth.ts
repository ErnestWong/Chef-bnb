import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron calls /api/cron with `Authorization: Bearer <CRON_SECRET>`
 * (it sends the project's CRON_SECRET env var on its own). Anything else is
 * rejected; an unset secret rejects everything.
 */
export function isCronAuthorized(authorization: string | null | undefined, secret: string | undefined): boolean {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization ?? "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
