import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-foreground/10 px-6 py-4">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Chef-bnb
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {/* Session read streams in; the rest of the header is static. */}
        <Suspense fallback={<span className="h-5 w-24" aria-hidden />}>
          <UserMenu />
        </Suspense>
      </nav>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/signin" className="rounded-md bg-accent px-3 py-1.5 font-medium text-white">
        Sign in
      </Link>
    );
  }
  return (
    <>
      {hasRole(user.roles, "ADMIN") && <Link href="/admin">Admin</Link>}
      {hasRole(user.roles, "CHEF") && <Link href="/chef">Chef</Link>}
      <Link href="/account">{user.name ?? user.email}</Link>
      <form action={signOutAction}>
        <button type="submit" className="text-muted underline-offset-2 hover:underline">
          Sign out
        </button>
      </form>
    </>
  );
}
