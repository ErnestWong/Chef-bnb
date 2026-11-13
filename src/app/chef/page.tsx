import type { Metadata } from "next";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Chef dashboard" };

export default function ChefPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Chef dashboard</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
        <ChefOverview />
      </Suspense>
    </main>
  );
}

async function ChefOverview() {
  const user = await requireRole("CHEF", "/chef");
  const profile = await getDb().chefProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      status: true,
      _count: { select: { events: true } },
    },
  });

  if (!profile) {
    return <p className="mt-6 text-sm text-muted">No chef profile found for this account.</p>;
  }

  return (
    <div className="mt-8 text-sm">
      <p>
        <span className="font-medium">{profile.displayName}</span> ·{" "}
        <span className="text-muted">{profile.status.toLowerCase()}</span> ·{" "}
        {profile._count.events} event{profile._count.events === 1 ? "" : "s"}
      </p>
      <p className="mt-6 text-muted">Event creation and the guest list arrive in M4.</p>
    </div>
  );
}
