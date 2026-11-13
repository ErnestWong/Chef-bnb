import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApplyForm } from "@/components/apply-form";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listCuisines } from "@/lib/queries/events";

export const metadata: Metadata = { title: "Apply to host" };

export default function ApplyPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-2xl py-12">
        <p className="text-sm text-muted">
          <Link href="/host" className="hover:text-accent">Host a dinner</Link> / Apply
        </p>
        <h1 className="font-display mt-2 text-4xl">Apply to host</h1>
        <p className="mt-2 text-muted">Three short screens. Every chef is reviewed by hand; you&apos;ll get an email with the decision.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <ApplyOrStatus />
        </Suspense>
      </Container>
    </main>
  );
}

async function ApplyOrStatus() {
  const user = await requireUser("/chef/apply");
  const [existing, cuisines] = await Promise.all([
    getDb().chefProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    listCuisines(),
  ]);
  // Already applied: the chef page shows the status and what comes next.
  if (existing) redirect("/chef");

  return (
    <div className="mt-8">
      <ApplyForm cuisines={cuisines} defaultName={user.name ?? ""} />
    </div>
  );
}
