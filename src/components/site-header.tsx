import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="font-display whitespace-nowrap text-xl font-semibold">
          Chef-bnb
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:gap-5">
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
      <>
      <Link href="/host" className="hover:text-accent">Host a dinner</Link>
      <Link
        href="/signin"
        className="rounded-full bg-accent px-4 py-1.5 font-medium text-white hover:opacity-90"
      >
        Sign in
      </Link>
      </>
    );
  }
  return (
    <>
      {hasRole(user.roles, "ADMIN") && <Link href="/admin" className="hover:text-accent">Admin</Link>}
      {hasRole(user.roles, "CHEF") ? <Link href="/chef" className="hover:text-accent">Chef</Link> : <Link href="/host" className="hover:text-accent">Host a dinner</Link>}
      <Link href="/bookings" className="hover:text-accent">Bookings</Link>
      <Link href="/account" className="max-w-[8rem] truncate font-medium hover:text-accent sm:max-w-[14rem]" title={user.name ?? user.email}>
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
