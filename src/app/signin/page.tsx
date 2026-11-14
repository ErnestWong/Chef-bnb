import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { devSignIn, restartPhoneSignIn, startPhoneSignIn, verifyPhoneSignIn } from "@/app/actions/auth";
import { CodeField, PhoneField } from "@/components/phone-signin";
import { isDevLoginEnabled } from "@/lib/auth/dev-login";
import { maskPhone } from "@/lib/auth/phone";
import { PENDING_PHONE_COOKIE } from "@/lib/auth/phone-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { isPhoneSignInEnabled } from "@/lib/sms/verify";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  invalid_phone: "That doesn't look like a mobile number. Try again with the area code.",
  invalid_code: "Enter the six digits from the text.",
  wrong_code: "That code didn't match. Check the text and try again, or ask for a new one.",
  code_expired: "That code has expired. Ask for a new one.",
  send_failed: "We couldn't send a text to that number right now. Try again in a minute.",
  phone_unavailable: "Phone sign-in isn't set up on this site yet.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
  invalid_email: "Enter a valid email address.",
  CredentialsSignin: "That sign-in didn't work. Try again.",
  AccessDenied: "Sign-in is not available right now.",
};

const button = "rounded-full bg-accent px-5 py-3 text-base font-medium text-white hover:opacity-90";

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
        <SignIn searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SignIn({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/") ? params.callbackUrl : "/account";
  const error = typeof params.error === "string" ? params.error : undefined;
  const dev = isDevLoginEnabled();
  const phoneOn = isPhoneSignInEnabled();

  const user = await getCurrentUser();
  if (user) redirect(callbackUrl);

  const pendingPhone = (await cookies()).get(PENDING_PHONE_COOKIE)?.value;
  const step = params.step === "code" && pendingPhone ? "code" : "phone";
  const showDev = dev && (params.dev === "1" || !phoneOn);

  const alert = error && (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
      {ERRORS[error] ?? "Something went wrong. Try again."}
    </p>
  );

  if (showDev) {
    return (
      <>
        <h1 className="font-display text-4xl">Developer sign-in</h1>
        <p className="mt-2 text-sm text-muted">Any email, no password. For seeded chef and admin accounts; off in production.</p>
        {alert && <div className="mt-4">{alert}</div>}
        <form action={devSignIn} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="rounded-md border border-line bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Name <span className="text-muted">(optional, first sign-in only)</span>
            <input name="name" type="text" maxLength={80} autoComplete="name" className="rounded-md border border-line bg-surface px-3 py-2" />
          </label>
          <button type="submit" className={button}>Continue</button>
        </form>
        <details className="mt-8 text-xs text-muted">
          <summary className="cursor-pointer">Seeded accounts</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><code>casa.wong@example.test</code> — approved chef</li>
            <li><code>guest1@example.test</code> — guest with bookings</li>
            <li>Any address in <code>ADMIN_EMAILS</code> — admin</li>
          </ul>
        </details>
        {phoneOn && (
          <p className="mt-6 text-sm text-muted">
            <Link href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-accent underline-offset-2 hover:underline">Sign in with your phone instead</Link>
          </p>
        )}
      </>
    );
  }

  if (!phoneOn) {
    return (
      <>
        <h1 className="font-display text-4xl">Sign in</h1>
        <p className="mt-6 text-sm text-muted">Sign-in isn&apos;t available yet. Check back soon.</p>
      </>
    );
  }

  if (step === "code") {
    return (
      <>
        <h1 className="font-display text-4xl">Check your texts</h1>
        <p className="mt-2 text-muted">We sent a code to {maskPhone(pendingPhone!)}.</p>
        {alert && <div className="mt-4">{alert}</div>}
        <form action={verifyPhoneSignIn} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <CodeField error={error} />
          <button type="submit" className={button}>Sign in</button>
        </form>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <form action={startPhoneSignIn}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input type="hidden" name="phone" value={pendingPhone} />
            <button type="submit" className="text-accent underline-offset-2 hover:underline">Send a new code</button>
          </form>
          <form action={restartPhoneSignIn}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button type="submit" className="text-muted underline-offset-2 hover:underline">Use a different number</button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-4xl">Sign in</h1>
      <p className="mt-2 text-muted">We&apos;ll text you a code. No password, no app.</p>
      {alert && <div className="mt-4">{alert}</div>}
      <form action={startPhoneSignIn} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <PhoneField error={error} />
        <button type="submit" className={button}>Text me a code</button>
      </form>
      <p className="mt-4 text-xs text-muted">
        Standard message rates may apply. By continuing you agree to the{" "}
        <Link href="/terms" className="text-accent underline-offset-2 hover:underline">terms</Link> and{" "}
        <Link href="/privacy" className="text-accent underline-offset-2 hover:underline">privacy policy</Link>.
      </p>
      {dev && (
        <p className="mt-8 text-xs text-muted">
          <Link href={`/signin?dev=1&callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline-offset-2 hover:underline">Developer sign-in by email</Link>
        </p>
      )}
    </>
  );
}
