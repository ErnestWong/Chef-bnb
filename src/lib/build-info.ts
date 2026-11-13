export type BuildInfo = {
  commit: string | null;
  branch: string | null;
  environment: "production" | "preview" | "development" | "test";
};

type Env = Record<string, string | undefined>;

/**
 * Build metadata, sourced from the variables Vercel injects at build time.
 * Falls back to nulls locally so the health route still works in dev.
 */
export function getBuildInfo(env: Env = process.env): BuildInfo {
  const vercelEnv = env.VERCEL_ENV;
  const environment: BuildInfo["environment"] =
    vercelEnv === "production" || vercelEnv === "preview"
      ? vercelEnv
      : env.NODE_ENV === "test"
        ? "test"
        : "development";

  return {
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    branch: env.VERCEL_GIT_COMMIT_REF ?? null,
    environment,
  };
}
