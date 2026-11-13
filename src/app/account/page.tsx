import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="font-display text-4xl">Your account</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
        <AccountDetails searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AccountDetails({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const [user, params] = await Promise.all([requireUser("/account"), searchParams]);
  const db = getDb();
  const [dinnersAttended, chef] = await Promise.all([
    db.booking.count({ where: { guestUserId: user.id, status: "ATTENDED" } }),
    db.chefProfile.findUnique({ where: { userId: user.id }, select: { status: true, slug: true } }),
  ]);

  return (
    <div className="mt-8 flex flex-col gap-6">
      {params.notice === "not-a-chef" && (
        <p role="status" className="rounded-md bg-accent/10 px-3 py-2 text-sm">
          The chef dashboard is for approved chefs. Apply below to host a dinner.
        </p>
      )}
      <div className="flex items-center gap-4">
        {user.image ? (
          <Image src={user.image} alt="" width={56} height={56} className="rounded-full" />
        ) : (
          <div
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-xl font-semibold text-accent"
          >
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-lg font-medium">{user.name ?? "No name yet"}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Dinners attended</dt>
          <dd className="text-2xl font-semibold">{dinnersAttended}</dd>
        </div>
        <div>
          <dt className="text-muted">Roles</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span key={r} className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs">
                {r.toLowerCase()}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      {params.applied === "1" && (
        <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm">Application received — we review every chef by hand.</p>
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/bookings" className="rounded-full border border-line px-4 py-2 hover:border-accent">Your bookings</Link>
        {!chef && <Link href="/chef/apply" className="rounded-full border border-line px-4 py-2 hover:border-accent">Host a dinner</Link>}
        {chef?.status === "APPLIED" && <span className="rounded-full border border-line px-4 py-2 text-muted">Chef application pending</span>}
        {chef?.status === "APPROVED" && <Link href="/chef" className="rounded-full border border-line px-4 py-2 hover:border-accent">Chef dashboard</Link>}
        {chef && (chef.status === "REJECTED" || chef.status === "SUSPENDED") && <Link href="/chef/apply" className="rounded-full border border-line px-4 py-2 text-muted hover:border-accent">Chef application: {chef.status.toLowerCase()}</Link>}
      </div>
    </div>
  );
}
