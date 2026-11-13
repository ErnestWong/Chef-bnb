import Link from "next/link";
import type { PublicChefCard } from "@/lib/queries/chefs";
import { BOROUGH_LABELS, pluralize } from "@/lib/format";
import { Badge, Monogram, Stars } from "./ui";

export function ChefCard({ chef }: { chef: PublicChefCard }) {
  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group flex gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-accent"
    >
      <Monogram name={chef.displayName} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="font-display text-xl leading-tight group-hover:text-accent">{chef.displayName}</h3>
        <p className="text-sm text-muted">
          {chef.homeBorough ? BOROUGH_LABELS[chef.homeBorough] : "NYC"} · {pluralize(chef.dinnersHosted, "dinner")} hosted
        </p>
        <Stars rating={chef.averageRating} count={chef.reviewCount || undefined} />
        <p className="line-clamp-2 text-sm">{chef.bio}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chef.cuisines.map((c) => (
            <Badge key={c.id}>{c.name}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
