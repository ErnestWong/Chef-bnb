import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { devSignIn } from "@/app/actions/auth";
import { isDevLoginEnabled } from "@/lib/auth/dev-login";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  CredentialsSignin: "That sign-in didn't work. Try again.",
  AccessDenied: "Sign-in is not available right now.",
};

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
        <SignInForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInForm({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/account";
  const error = typeof params.error === "string" ? params.error : undefined;

  const user = await getCurrentUser();
  if (user) redirect(callbackUrl.startsWith("/") ? callbackUrl : "/account");

  if (!isDevLoginEnabled()) {
    return (
      <p className="mt-6 text-sm text-muted">
        Sign-in isn&apos;t available yet. Google sign-in is coming soon.
      </p>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm text-muted">
        Placeholder sign-in for development: any email, no password. Google sign-in replaces this
        later.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {ERRORS[error] ?? "Something went wrong. Try again."}
        </p>
      )}
      <form action={devSignIn} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-md border border-foreground/20 bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Name <span className="text-muted">(optional, first sign-in only)</span>
          <input
            name="name"
            type="text"
            maxLength={80}
            autoComplete="name"
            className="rounded-md border border-foreground/20 bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 font-medium text-white"
        >
          Continue
        </button>
      </form>
      <details className="mt-8 text-xs text-muted">
        <summary className="cursor-pointer">Seeded accounts</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <code>casa.wong@example.test</code> — approved chef
          </li>
          <li>
            <code>guest1@example.test</code> — guest with bookings
          </li>
          <li>Any address in <code>ADMIN_EMAILS</code> — admin</li>
        </ul>
      </details>
    </>
  );
}
