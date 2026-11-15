import Image from "next/image";
import Link from "next/link";
import type { PublicChefCard } from "@/lib/queries/chefs";
import { BOROUGH_LABELS, pluralize } from "@/lib/format";
import { Badge, Monogram, Stars } from "./ui";

export function ChefCard({ chef }: { chef: PublicChefCard }) {
  const photo = chef.photoUrls[1] ?? chef.photoUrls[0];
  return (
    <Link
      href={`/chefs/${chef.slug}`}
      className="group flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-accent"
    >
      {photo ? (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-paper-2">
          <Image src={photo} alt="" fill sizes="112px" className="object-cover" />
        </div>
      ) : (
        <Monogram name={chef.displayName} size="lg" />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {chef.homeBorough ? BOROUGH_LABELS[chef.homeBorough] : "NYC"} · {pluralize(chef.dinnersHosted, "dinner")} hosted
        </p>
        <h3 className="font-display text-2xl leading-tight group-hover:text-accent">{chef.displayName}</h3>
        <Stars rating={chef.averageRating} count={chef.reviewCount || undefined} />
        <p className="line-clamp-2 text-sm text-muted">{chef.bio}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chef.cuisines.map((c) => (
            <Badge key={c.id}>{c.name}</Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}
