import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Vercel sets x-forwarded-for with
 * the client first; locally there is no proxy, so fall back to "local".
 * Never trust this for authorization, only for throttling.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || h.get("x-real-ip")?.trim() || "local";
}
