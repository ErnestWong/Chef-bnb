"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut, updateSession } from "@/auth";
import { DEV_PROVIDER_ID } from "@/lib/auth/dev-login";
import { isSignInPhone, normalizeCode, normalizePhone } from "@/lib/auth/phone";
import { PENDING_PHONE_COOKIE, PENDING_PHONE_MAX_AGE_SECONDS, PHONE_PROVIDER_ID } from "@/lib/auth/phone-provider";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { LIMITS } from "@/lib/security/limits";
import { RateLimitError, enforceRateLimit, rateLimitMessage } from "@/lib/security/rate-limit";
import { safeRedirectPath } from "@/lib/security/redirect";
import { clientIp } from "@/lib/security/request";
import { getVerifier, isPhoneSignInEnabled } from "@/lib/sms/verify";

/** Only allow paths on this site as post-sign-in destinations (see safeRedirectPath). */
function safeCallbackUrl(url: string | undefined): string {
  return safeRedirectPath(url, "/account");
}

function signInUrl(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/signin?${s}` : "/signin";
}

const callbackOf = (formData: FormData) => safeCallbackUrl(String(formData.get("callbackUrl") || "") || undefined);

/** Step 1: send a login code to the number. Keeps the number in a short-lived cookie for step 2. */
export async function startPhoneSignIn(formData: FormData): Promise<void> {
  const callbackUrl = callbackOf(formData);
  if (!isPhoneSignInEnabled()) redirect(signInUrl({ error: "phone_unavailable", callbackUrl }));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) redirect(signInUrl({ error: "invalid_phone", callbackUrl }));
  if (!isSignInPhone(phone)) redirect(signInUrl({ error: "unsupported_phone", callbackUrl }));

  const db = getDb();
  try {
    // Per-IP and per-number first, so one source can't spend the site-wide budget below.
    const ip = await clientIp();
    await enforceRateLimit(db, `signin:ip:${ip}`, LIMITS.signInPerIp);
    await enforceRateLimit(db, `code:ip:${ip}`, LIMITS.codesPerIp);
    await enforceRateLimit(db, `code:phone:${phone}`, LIMITS.codesPerPhone);
  } catch (err) {
    if (err instanceof RateLimitError) redirect(signInUrl({ error: "rate_limited", callbackUrl }));
    throw err;
  }
  try {
    await enforceRateLimit(db, "code:global:hour", LIMITS.codesGlobalPerHour);
    await enforceRateLimit(db, "code:global:day", LIMITS.codesGlobalPerDay);
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.error("[auth] login texts paused: the site-wide cap was reached; check for SMS abuse");
      redirect(signInUrl({ error: "sign_in_busy", callbackUrl }));
    }
    throw err;
  }

  try {
    await getVerifier().start(phone);
  } catch (err) {
    console.error("[auth] could not send login code", err);
    redirect(signInUrl({ error: "send_failed", callbackUrl }));
  }

  (await cookies()).set(PENDING_PHONE_COOKIE, phone, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/signin", maxAge: PENDING_PHONE_MAX_AGE_SECONDS,
  });
  redirect(signInUrl({ step: "code", callbackUrl }));
}

/** Step 2: check the code and sign in. */
export async function verifyPhoneSignIn(formData: FormData): Promise<void> {
  const callbackUrl = callbackOf(formData);
  const jar = await cookies();
  const phone = jar.get(PENDING_PHONE_COOKIE)?.value;
  if (!phone) redirect(signInUrl({ error: "code_expired", callbackUrl }));
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) redirect(signInUrl({ step: "code", error: "invalid_code", callbackUrl }));

  // The per-number check limit lives in the phone provider's authorize(), so it
  // also covers code checks posted straight to /api/auth/callback/phone.
  try {
    await signIn(PHONE_PROVIDER_ID, { phone, code, redirectTo: callbackUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as { code?: string }).code ?? err.type;
      redirect(signInUrl({ step: "code", error: code === "wrong_code" ? "wrong_code" : code, callbackUrl }));
    }
    // Includes Next's redirect: the sign-in worked. Drop the pending number on the way out.
    jar.delete(PENDING_PHONE_COOKIE);
    throw err;
  }
}

/** "Use a different number": forget the pending one and start over. */
export async function restartPhoneSignIn(formData: FormData): Promise<void> {
  (await cookies()).delete(PENDING_PHONE_COOKIE);
  redirect(signInUrl({ callbackUrl: callbackOf(formData) }));
}

const nameSchema = z.string().trim().min(1, "Tell us what to call you.").max(80);

/** First sign-in by phone: one field, the name the chef will see. */
export async function setNameAction(formData: FormData): Promise<void> {
  const user = await requireUser("/signin/name");
  const callbackUrl = callbackOf(formData);
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) redirect(`/signin/name?error=invalid_name&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const limited = await rateLimitMessage(getDb(), `profile:user:${user.id}`, LIMITS.bookingActionsPerUser);
  if (limited) redirect(`/signin/name?error=rate_limited&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await getDb().user.update({ where: { id: user.id }, data: { name: parsed.data } });
  // The proxy gates on the JWT, so refresh it now rather than at the next 2-minute role check.
  await updateSession({ user: { name: parsed.data } });
  redirect(callbackUrl);
}

const devSchema = z.object({
  email: z.email("Enter a valid email address."),
  name: z.string().trim().max(80).optional(),
  callbackUrl: z.string().optional(),
});

/** Development-only email sign-in (no password). */
export async function devSignIn(formData: FormData): Promise<void> {
  const parsed = devSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  const callbackUrl = safeCallbackUrl(parsed.success ? parsed.data.callbackUrl : undefined);
  if (!parsed.success) {
    redirect(signInUrl({ dev: "1", error: "invalid_email", callbackUrl }));
  }
  try {
    const db = getDb();
    await enforceRateLimit(db, `signin:ip:${await clientIp()}`, LIMITS.signInPerIp);
    await enforceRateLimit(db, `signin:email:${parsed.data.email.toLowerCase()}`, LIMITS.signInPerEmail);
  } catch (err) {
    if (err instanceof RateLimitError) redirect(signInUrl({ dev: "1", error: "rate_limited", callbackUrl }));
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
      redirect(signInUrl({ dev: "1", error: err.type, callbackUrl }));
    }
    throw err; // includes Next's redirect
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
