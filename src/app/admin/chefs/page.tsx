import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Container, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatEventDay } from "@/lib/format";

export const metadata: Metadata = { title: "Chef applications" };

const TONE = { APPLIED: "warn", APPROVED: "accent", REJECTED: "neutral", SUSPENDED: "neutral" } as const;

export default function AdminChefsPage({ searchParams }: PageProps<"/admin/chefs">) {
  return (
    <main className="flex-1">
      <Container className="max-w-4xl py-12">
        <p className="text-sm text-muted"><Link href="/admin" className="hover:text-accent">Admin</Link> / Chefs</p>
        <h1 className="font-display mt-2 text-4xl">Chef applications</h1>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <Queue searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

async function Queue({ searchParams }: { searchParams: PageProps<"/admin/chefs">["searchParams"] }) {
  await requireRole("ADMIN", "/admin/chefs");
  const params = await searchParams;
  const show = params.show === "all" ? "all" : "pending";
  const profiles = await getDb().chefProfile.findMany({
    where: show === "pending" ? { status: "APPLIED" } : {},
    select: { id: true, displayName: true, status: true, createdAt: true, homeBorough: true, user: { select: { email: true } }, cuisines: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mt-6">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin/chefs" className={`rounded-full px-3 py-1 ${show === "pending" ? "bg-foreground text-background" : "border border-line"}`}>Pending</Link>
        <Link href="/admin/chefs?show=all" className={`rounded-full px-3 py-1 ${show === "all" ? "bg-foreground text-background" : "border border-line"}`}>All</Link>
      </nav>
      {profiles.length === 0 ? (
        <div className="mt-4"><EmptyState title="Queue is empty" /></div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/chefs/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
                <div>
                  <p className="font-display text-xl">{p.displayName}</p>
                  <p className="text-sm text-muted">{p.user.email} · applied {formatEventDay(p.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.cuisines.map((c) => <Badge key={c.id}>{c.name}</Badge>)}
                  <Badge tone={TONE[p.status]}>{p.status.toLowerCase()}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
