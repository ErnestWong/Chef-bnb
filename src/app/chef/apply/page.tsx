import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApplyForm } from "@/components/apply-form";
import { Badge, Container } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listCuisines } from "@/lib/queries/events";

export const metadata: Metadata = { title: "Host a dinner" };

export default function ApplyPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-2xl py-12">
        <h1 className="font-display text-4xl">Host a dinner</h1>
        <p className="mt-2 text-muted">Tell us about you and your food. Every chef is reviewed by hand; you&apos;ll see the decision on your account page.</p>
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
    getDb().chefProfile.findUnique({ where: { userId: user.id }, select: { status: true, reviewNote: true, slug: true } }),
    listCuisines(),
  ]);

  if (existing) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-sm">
        <p className="flex items-center gap-2">
          Application status <Badge tone={existing.status === "APPROVED" ? "accent" : existing.status === "APPLIED" ? "warn" : "neutral"}>{existing.status.toLowerCase()}</Badge>
        </p>
        {existing.reviewNote && <p className="mt-3 text-muted">Note from the team: {existing.reviewNote}</p>}
        {existing.status === "APPROVED" && (
          <p className="mt-3">
            You&apos;re approved. <Link href="/chef" className="text-accent underline-offset-2 hover:underline">Open your chef dashboard</Link> or <Link href={`/chefs/${existing.slug}`} className="text-accent underline-offset-2 hover:underline">see your public profile</Link>.
          </p>
        )}
        {existing.status === "APPLIED" && <p className="mt-3 text-muted">We&apos;ll review it soon.</p>}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <ApplyForm cuisines={cuisines} defaultName={user.name ?? ""} />
    </div>
  );
}
