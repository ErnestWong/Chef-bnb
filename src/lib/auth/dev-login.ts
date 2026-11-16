type Env = Record<string, string | undefined>;

/**
 * The placeholder email-only sign-in (no password) reaches the seeded chef and
 * admin accounts. It is on only where the database is a local one: on your
 * machine (no VERCEL_ENV) or under `vercel dev`. Vercel previews share the
 * production database, so a password-less sign-in there would let anyone who
 * reaches a preview act as any user, admins included. It is off on previews
 * and production unless AUTH_DEV_LOGIN=true is set explicitly; never set that
 * where the database holds real people.
 */
export function isDevLoginEnabled(env: Env = process.env): boolean {
  if (env.AUTH_DEV_LOGIN === "true") return true;
  if (env.AUTH_DEV_LOGIN === "false") return false;
  return env.VERCEL_ENV === undefined || env.VERCEL_ENV === "development";
}

export const DEV_PROVIDER_ID = "dev";
