import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChefCard } from "@/components/chef-card";
import { Container, EmptyState } from "@/components/ui";
import { listApprovedChefs } from "@/lib/queries/chefs";
import { listCuisines } from "@/lib/queries/events";

export const metadata: Metadata = { title: "Chefs" };

export default function ChefsPage({ searchParams }: PageProps<"/chefs">) {
  return (
    <main className="flex-1">
      <Container className="py-12">
        <h1 className="font-display text-4xl">The chefs</h1>
        <p className="mt-2 text-muted">Every chef is vetted by hand. Line cooks, sous chefs, supper-club hosts and private chefs with a stage of their own.</p>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading chefs…</p>}>
          <ChefDirectory searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

async function ChefDirectory({ searchParams }: { searchParams: PageProps<"/chefs">["searchParams"] }) {
  const params = await searchParams;
  const cuisine = typeof params.cuisine === "string" && /^[a-z0-9-]+$/.test(params.cuisine) ? params.cuisine : undefined;
  const [chefs, cuisines] = await Promise.all([listApprovedChefs(cuisine), listCuisines()]);

  return (
    <div className="mt-8 flex flex-col gap-6">
      <nav aria-label="Cuisine" className="flex flex-wrap gap-2">
        <Link href="/chefs" className={`rounded-full px-3 py-1 text-sm ${!cuisine ? "bg-foreground text-background" : "border border-line hover:border-accent"}`}>
          All
        </Link>
        {cuisines.map((c) => (
          <Link
            key={c.id}
            href={`/chefs?cuisine=${c.slug}`}
            className={`rounded-full px-3 py-1 text-sm ${cuisine === c.slug ? "bg-foreground text-background" : "border border-line hover:border-accent"}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      {chefs.length === 0 ? (
        <EmptyState title="No chefs for that cuisine yet" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {chefs.map((c) => (
            <ChefCard key={c.id} chef={c} />
          ))}
        </div>
      )}
    </div>
  );
}
