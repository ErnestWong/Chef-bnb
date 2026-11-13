import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReviewChefForm } from "@/components/review-chef-form";
import { Badge, Container } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { BOROUGH_LABELS, formatEventDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Chef application" };

export default function AdminChefPage({ params }: PageProps<"/admin/chefs/[id]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <Application params={params} />
      </Suspense>
    </main>
  );
}

async function Application({ params }: { params: PageProps<"/admin/chefs/[id]">["params"] }) {
  const { id } = await params;
  await requireRole("ADMIN", `/admin/chefs/${id}`);
  // Admin view: private columns are intentionally included here.
  const p = await getDb().chefProfile.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, createdAt: true } }, cuisines: true, _count: { select: { events: true } } },
  });
  if (!p) notFound();

  const rows: [string, string | null | undefined][] = [
    ["Email", p.user.email],
    ["Bio", p.bio],
    ["Credentials", p.credentials],
    ["Website", p.website],
    ["Instagram", p.instagram ? `@${p.instagram}` : null],
    ["Home borough", p.homeBorough ? BOROUGH_LABELS[p.homeBorough] : null],
    ["Hosting", p.needsVenue ? "Needs a venue" : "Own home"],
    ["Wants help", [p.needsFoh && "front of house", p.needsServers && "servers"].filter(Boolean).join(", ") || "No"],
    ["Payment handle", p.paymentHandle],
    ["Payment note", p.paymentNote],
    ["Food Protection Certificate", p.foodCertNumber],
    ["Insurance on file", p.insuranceOnFile ? "Yes" : "No"],
    ["Applied", formatEventDateTime(p.createdAt)],
    ["Events", String(p._count.events)],
  ];

  return (
    <Container className="max-w-3xl py-12">
      <p className="text-sm text-muted"><Link href="/admin/chefs" className="hover:text-accent">Chef applications</Link> / {p.displayName}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl">{p.displayName}</h1>
        <Badge tone={p.status === "APPROVED" ? "accent" : p.status === "APPLIED" ? "warn" : "neutral"}>{p.status.toLowerCase()}</Badge>
        {p.status === "APPROVED" && <Link href={`/chefs/${p.slug}`} className="text-sm text-accent underline-offset-2 hover:underline">Public profile</Link>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{p.cuisines.map((c) => <Badge key={c.id}>{c.name}</Badge>)}</div>

      <dl className="mt-8 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="whitespace-pre-wrap">{v}</dd>
          </div>
        ))}
      </dl>

      {p.reviewNote && <p className="mt-6 rounded-xl bg-accent-soft px-3 py-2 text-sm">Previous note: {p.reviewNote}</p>}

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-2xl">Decision</h2>
        <div className="mt-3">
          <ReviewChefForm profileId={p.id} status={p.status} />
        </div>
      </section>
    </Container>
  );
}
