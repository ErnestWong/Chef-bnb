import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApplyForm } from "@/components/apply-form";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { canApply } from "@/lib/chefs/apply";
import { getDb } from "@/lib/db";
import { listCuisines } from "@/lib/queries/events";

export const metadata: Metadata = { title: "Apply to host" };

export default function ApplyPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-2xl py-12">
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
    getDb().chefProfile.findUnique({
      where: { userId: user.id },
      select: {
        status: true, displayName: true, bio: true, credentials: true, instagram: true, website: true, homeBorough: true,
        needsVenue: true, needsFoh: true, needsServers: true, paymentHandle: true, paymentNote: true, foodCertNumber: true, reviewNote: true,
        cuisines: { select: { id: true } },
      },
    }),
    listCuisines(),
  ]);
  const verdict = canApply(existing);
  // Pending, approved or suspended: the chef page shows the status and what comes next.
  if (!verdict.ok) redirect("/chef");
  const reapplying = verdict.reapplying && existing;

  return (
    <>
      <p className="text-sm text-muted">
        <Link href="/host" className="hover:text-accent">Host a dinner</Link> / {reapplying ? "Apply again" : "Apply"}
      </p>
      <h1 className="font-display mt-2 text-4xl">{reapplying ? "Apply again" : "Apply to host"}</h1>
      {reapplying ? (
        <p className="mt-2 text-muted">
          Your earlier application is filled in below; update what changed and send it again.
          {existing.reviewNote && <> The note from last time: &ldquo;{existing.reviewNote}&rdquo;</>}
        </p>
      ) : (
        <p className="mt-2 text-muted">Three short screens. Every chef is reviewed by hand; you&apos;ll get an email with the decision.</p>
      )}
      <div className="mt-8">
        <ApplyForm
          cuisines={cuisines}
          defaultName={user.name ?? ""}
          defaults={
            reapplying
              ? {
                  displayName: existing.displayName,
                  bio: existing.bio,
                  credentials: existing.credentials ?? undefined,
                  instagram: existing.instagram ?? undefined,
                  website: existing.website ?? undefined,
                  cuisineIds: existing.cuisines.map((c) => c.id),
                  hosting: existing.needsVenue ? "VENUE" : "HOME",
                  homeBorough: existing.homeBorough ?? undefined,
                  needsFoh: existing.needsFoh,
                  needsServers: existing.needsServers,
                  paymentHandle: existing.paymentHandle ?? undefined,
                  paymentNote: existing.paymentNote ?? undefined,
                  foodCertNumber: existing.foodCertNumber ?? undefined,
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
