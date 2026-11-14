"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { DEV_PROVIDER_ID } from "@/lib/auth/dev-login";
import { getDb } from "@/lib/db";
import { LIMITS } from "@/lib/security/limits";
import { RateLimitError, enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  name: z.string().trim().max(80).optional(),
  callbackUrl: z.string().optional(),
});

/** Only allow same-origin relative paths as post-sign-in destinations. */
function safeCallbackUrl(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/account";
  return url;
}

export async function devSignIn(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  const callbackUrl = safeCallbackUrl(parsed.success ? parsed.data.callbackUrl : undefined);
  if (!parsed.success) {
    redirect(`/signin?error=invalid_email&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  try {
    const db = getDb();
    await enforceRateLimit(db, `signin:ip:${await clientIp()}`, LIMITS.signInPerIp);
    await enforceRateLimit(db, `signin:email:${parsed.data.email.toLowerCase()}`, LIMITS.signInPerEmail);
  } catch (err) {
    if (err instanceof RateLimitError) redirect(`/signin?error=rate_limited&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    throw err;
  }
  try {
    await signIn(DEV_PROVIDER_ID, {
      email: parsed.data.email,
      name: parsed.data.name ?? "",
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/signin?error=${encodeURIComponent(err.type)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw err; // includes Next's redirect
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
