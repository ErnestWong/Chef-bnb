import type { Metadata } from "next";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

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
      <p className="mt-8 text-sm text-muted">
        The application queue, event moderation and booking tools arrive in M3–M7.
      </p>
    </>
  );
}
