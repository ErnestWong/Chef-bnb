import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ModerateReviewButton } from "@/components/review-form";
import { Badge, Container, EmptyState, Stars } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatEventDay } from "@/lib/format";

export const metadata: Metadata = { title: "Guest reviews" };

export default function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <main className="flex-1">
      <Container className="max-w-4xl py-12">
        <p className="text-sm text-muted"><Link href="/admin" className="hover:text-accent">Admin</Link> / Reviews</p>
        <h1 className="font-display mt-2 text-4xl">Guest reviews</h1>
        <p className="mt-2 text-sm text-muted">Public pages show these anonymously. Here you see the author, so you can act on abuse; removing a review hides it and drops it from the chef&apos;s average.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <ReviewList searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

async function ReviewList({ searchParams }: { searchParams: PageProps<"/admin/reviews">["searchParams"] }) {
  await requireRole("ADMIN", "/admin/reviews");
  const params = await searchParams;
  const show = params.show === "removed" ? "removed" : "live";
  // Admin view: reviewer identity is intentionally included here.
  const reviews = await getDb().review.findMany({
    where: show === "removed" ? { removedAt: { not: null } } : { removedAt: null },
    select: {
      id: true, rating: true, body: true, createdAt: true, removedAt: true,
      author: { select: { name: true, email: true } },
      chef: { select: { displayName: true, slug: true } },
      event: { select: { id: true, title: true, startsAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mt-6">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin/reviews" className={`rounded-full px-3 py-1 ${show === "live" ? "bg-foreground text-background" : "border border-line"}`}>Live</Link>
        <Link href="/admin/reviews?show=removed" className={`rounded-full px-3 py-1 ${show === "removed" ? "bg-foreground text-background" : "border border-line"}`}>Removed</Link>
      </nav>
      {reviews.length === 0 ? (
        <div className="mt-4"><EmptyState title={show === "live" ? "No reviews yet" : "Nothing removed"} /></div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} />
                    {r.removedAt && <Badge tone="warn">removed {formatEventDay(r.removedAt)}</Badge>}
                  </div>
                  {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                  <p className="mt-2 text-xs text-muted">
                    <Link href={`/chefs/${r.chef.slug}`} className="hover:text-accent">{r.chef.displayName}</Link> · <Link href={`/events/${r.event.id}`} className="hover:text-accent">{r.event.title}</Link>, {formatEventDay(r.event.startsAt)} · posted {formatEventDay(r.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted">By {r.author.name ?? "—"} ({r.author.email})</p>
                </div>
                <ModerateReviewButton reviewId={r.id} removed={Boolean(r.removedAt)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
