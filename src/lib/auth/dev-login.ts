type Env = Record<string, string | undefined>;

/**
 * The placeholder email-only sign-in (no password) stands in for Google OAuth
 * until checklist item 4 is done. It is on in development and on Vercel
 * previews, and off in production unless AUTH_DEV_LOGIN=true is set explicitly.
 */
export function isDevLoginEnabled(env: Env = process.env): boolean {
  if (env.AUTH_DEV_LOGIN === "true") return true;
  if (env.AUTH_DEV_LOGIN === "false") return false;
  return env.VERCEL_ENV !== "production";
}

export const DEV_PROVIDER_ID = "dev";
