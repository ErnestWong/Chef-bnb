import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventCard } from "@/components/event-card";
import { Badge, Container, EmptyState, Monogram, Stars } from "@/components/ui";
import { BOROUGH_LABELS, formatEventDay, pluralize } from "@/lib/format";
import { getChefBySlug } from "@/lib/queries/chefs";
import { listUpcomingEventsForChef } from "@/lib/queries/events";

export async function generateMetadata({ params }: PageProps<"/chefs/[slug]">): Promise<Metadata> {
  const chef = await getChefBySlug((await params).slug);
  return { title: chef?.displayName ?? "Chef" };
}

export default function ChefPage({ params }: PageProps<"/chefs/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<Container className="py-12 text-sm text-muted">Loading…</Container>}>
        <ChefProfile params={params} />
      </Suspense>
    </main>
  );
}

async function ChefProfile({ params }: { params: PageProps<"/chefs/[slug]">["params"] }) {
  const chef = await getChefBySlug((await params).slug);
  if (!chef) notFound();
  const events = await listUpcomingEventsForChef(chef.id);

  return (
    <Container className="py-12">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <Link href="/chefs" className="hover:text-accent">Chefs</Link> / {chef.displayName}
      </p>
      {chef.photoUrls[0] && (
        <div className="relative mt-4 aspect-[21/9] overflow-hidden rounded-2xl bg-paper-2 sm:aspect-[3/1]">
          <Image src={chef.photoUrls[0]} alt="" fill priority sizes="(min-width: 1152px) 1104px, 100vw" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-5 pt-16 text-white sm:px-8">
            <p className="font-display text-4xl italic sm:text-6xl">{chef.displayName}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-white/80">
              {chef.homeBorough ? BOROUGH_LABELS[chef.homeBorough] : "New York City"}
            </p>
          </div>
        </div>
      )}
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
        {chef.photoUrls[1] ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-paper-2">
            <Image src={chef.photoUrls[1]} alt="" fill sizes="96px" className="object-cover" />
          </div>
        ) : (
          <Monogram name={chef.displayName} size="lg" />
        )}
        <div className="flex-1">
          <h1 className={`font-display text-4xl sm:text-5xl ${chef.photoUrls[0] ? "sr-only" : ""}`}>{chef.displayName}</h1>
          <p className="font-mono text-sm text-muted">
            {chef.homeBorough ? BOROUGH_LABELS[chef.homeBorough] : "New York City"} · {pluralize(chef.dinnersHosted, "dinner")} hosted
          </p>
          <div className="mt-2">
            <Stars rating={chef.averageRating} count={chef.reviewCount || undefined} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chef.cuisines.map((c) => (
              <Badge key={c.id}>{c.name}</Badge>
            ))}
            {chef.insuranceOnFile && <Badge tone="accent">Insured</Badge>}
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <section>
            <h2 className="font-display text-2xl">About</h2>
            <p className="mt-3 max-w-prose leading-relaxed">{chef.bio}</p>
            {chef.credentials && (
              <p className="mt-3 text-sm text-muted">
                <span className="font-medium text-foreground">Credentials.</span> {chef.credentials}
              </p>
            )}
            <p className="mt-3 flex gap-4 text-sm">
              {chef.website && (
                <a href={chef.website} rel="noopener noreferrer" target="_blank" className="text-accent underline-offset-2 hover:underline">
                  Website
                </a>
              )}
              {chef.instagram && (
                <a href={`https://instagram.com/${chef.instagram.replace(/^@/, "")}`} rel="noopener noreferrer" target="_blank" className="text-accent underline-offset-2 hover:underline">
                  Instagram
                </a>
              )}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl">Upcoming dinners</h2>
            {events.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nothing scheduled right now" />
              </div>
            ) : (
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside>
          <h2 className="font-display text-2xl">Reviews</h2>
          <p className="mt-1 text-xs text-muted">From guests who attended. Shown anonymously.</p>
          {chef.reviews.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No reviews yet — be at the first table.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {chef.reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                  <Stars rating={r.rating} />
                  {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                  <p className="mt-2 text-xs text-muted">
                    {r.event.title} · {formatEventDay(r.event.startsAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </Container>
  );
}
