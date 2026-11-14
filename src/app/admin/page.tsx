import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { RunJobsButton } from "@/components/run-jobs-button";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-4xl py-12">
        <h1 className="font-display text-4xl">Admin</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
          <AdminOverview />
        </Suspense>
      </Container>
    </main>
  );
}

async function AdminOverview() {
  await requireRole("ADMIN", "/admin");
  const db = getDb();
  const [pendingChefs, approvedChefs, upcomingEvents, requestedBookings, reviewCount] = await Promise.all([
    db.chefProfile.count({ where: { status: "APPLIED" } }),
    db.chefProfile.count({ where: { status: "APPROVED" } }),
    db.event.count({ where: { status: "PUBLISHED", startsAt: { gt: new Date() } } }),
    db.booking.count({ where: { status: "REQUESTED" } }),
    db.review.count({ where: { removedAt: null } }),
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
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-display mt-1 text-3xl">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/chefs" className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Review chef applications{pendingChefs > 0 ? ` (${pendingChefs})` : ""}
        </Link>
        <Link href="/admin/reviews" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent">
          Guest reviews ({reviewCount})
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Scheduled jobs</h2>
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
