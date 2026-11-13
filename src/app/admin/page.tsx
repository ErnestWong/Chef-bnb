import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { RunJobsButton } from "@/components/run-jobs-button";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
        <AdminOverview />
      </Suspense>
    </main>
  );
}

async function AdminOverview() {
  await requireRole("ADMIN", "/admin");
  const db = getDb();
  const [pendingChefs, approvedChefs, upcomingEvents, requestedBookings] = await Promise.all([
    db.chefProfile.count({ where: { status: "APPLIED" } }),
    db.chefProfile.count({ where: { status: "APPROVED" } }),
    db.event.count({ where: { status: "PUBLISHED", startsAt: { gt: new Date() } } }),
    db.booking.count({ where: { status: "REQUESTED" } }),
  ]);

  const stats = [
    ["Chef applications waiting", pendingChefs],
    ["Approved chefs", approvedChefs],
    ["Upcoming published dinners", upcomingEvents],
    ["Seat requests awaiting payment", requestedBookings],
  ] as const;

  return (
    <>
      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-foreground/10 p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/chefs" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Review chef applications{pendingChefs > 0 ? ` (${pendingChefs})` : ""}
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Scheduled jobs</h2>
        <p className="mt-1 text-sm text-muted">
          Expire unpaid requests, decide go/no-go, reveal addresses, close finished dinners, request reviews. The cron route runs this on a schedule; every job is idempotent, so running it again here changes nothing it has already done.
        </p>
        <div className="mt-4">
          <RunJobsButton />
        </div>
      </section>
      <p className="mt-6 text-sm text-muted">Event moderation and booking tools are not available here yet.</p>
    </>
  );
}
