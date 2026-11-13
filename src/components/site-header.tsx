import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="font-display text-xl font-semibold">
          Chef-bnb
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/events" className="hover:text-accent">
            Dinners
          </Link>
          <Link href="/chefs" className="hover:text-accent">
            Chefs
          </Link>
          {/* Session read streams in; the rest of the header is static. */}
          <Suspense fallback={<span className="inline-block h-8 w-20" aria-hidden />}>
            <UserMenu />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href="/signin"
        className="rounded-full bg-accent px-4 py-1.5 font-medium text-white hover:opacity-90"
      >
        Sign in
      </Link>
    );
  }
  return (
    <>
      {hasRole(user.roles, "ADMIN") && <Link href="/admin" className="hover:text-accent">Admin</Link>}
      {hasRole(user.roles, "CHEF") && <Link href="/chef" className="hover:text-accent">Chef</Link>}
      <Link href="/bookings" className="hover:text-accent">Bookings</Link>
      <Link href="/account" className="font-medium hover:text-accent">
        {user.name ?? user.email}
      </Link>
      <form action={signOutAction}>
        <button type="submit" className="text-muted underline-offset-2 hover:underline">
          Sign out
        </button>
      </form>
    </>
  );
}
