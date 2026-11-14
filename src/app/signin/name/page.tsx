import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setNameAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "What should we call you?" };

const ERRORS: Record<string, string> = {
  invalid_name: "Tell us what to call you; a first name is fine.",
  rate_limited: "Too many attempts. Wait a few minutes and try again.",
};

/** First sign-in by phone: the one thing a chef needs to know before anything else. */
export default function NamePage({ searchParams }: PageProps<"/signin/name">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
        <NameForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NameForm({ searchParams }: { searchParams: PageProps<"/signin/name">["searchParams"] }) {
  const [user, params] = await Promise.all([requireUser("/signin/name"), searchParams]);
  const callbackUrl = typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/") ? params.callbackUrl : "/account";
  const error = typeof params.error === "string" ? params.error : undefined;
  if (user.name) redirect(callbackUrl);

  return (
    <>
      <h1 className="font-display text-4xl">What should the chef call you?</h1>
      <p className="mt-2 text-muted">Your name shows on the chef&apos;s guest list and nowhere else.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {ERRORS[error] ?? "Something went wrong. Try again."}
        </p>
      )}
      <form action={setNameAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="flex flex-col gap-1.5 text-sm">
          Your name
          <input name="name" type="text" autoComplete="name" autoFocus required maxLength={80} placeholder="Priya" className="rounded-xl border border-line bg-surface px-4 py-3 text-lg" />
        </label>
        <button type="submit" className="rounded-full bg-accent px-5 py-3 text-base font-medium text-white hover:opacity-90">Continue</button>
      </form>
    </>
  );
}
