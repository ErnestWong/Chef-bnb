import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { PUBLIC_CHEF_CARD_SELECT, PUBLIC_CHEF_PROFILE_SELECT, PUBLIC_REVIEW_SELECT } from "./public-select";

export type ChefStats = { dinnersHosted: number; averageRating: number | null; reviewCount: number };

export type PublicChefCard = Prisma.ChefProfileGetPayload<{ select: typeof PUBLIC_CHEF_CARD_SELECT }> & ChefStats;
export type PublicChefProfile = Prisma.ChefProfileGetPayload<{ select: typeof PUBLIC_CHEF_PROFILE_SELECT }> &
  ChefStats & { reviews: Prisma.ReviewGetPayload<{ select: typeof PUBLIC_REVIEW_SELECT }>[] };

/** Dinners hosted = completed events; rating = mean of non-removed reviews. */
async function statsFor(chefIds: string[]): Promise<Map<string, ChefStats>> {
  if (chefIds.length === 0) return new Map();
  const db = getDb();
  const [hosted, ratings] = await Promise.all([
    db.event.groupBy({ by: ["chefId"], where: { chefId: { in: chefIds }, status: "COMPLETED" }, _count: { _all: true } }),
    db.review.groupBy({
      by: ["chefId"],
      where: { chefId: { in: chefIds }, removedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);
  const map = new Map<string, ChefStats>();
  for (const id of chefIds) map.set(id, { dinnersHosted: 0, averageRating: null, reviewCount: 0 });
  for (const h of hosted) map.get(h.chefId)!.dinnersHosted = h._count._all;
  for (const r of ratings) {
    const s = map.get(r.chefId)!;
    s.averageRating = r._avg.rating === null ? null : Math.round(r._avg.rating * 10) / 10;
    s.reviewCount = r._count._all;
  }
  return map;
}

export async function listApprovedChefs(cuisineSlug?: string): Promise<PublicChefCard[]> {
  const chefs = await getDb().chefProfile.findMany({
    where: { status: "APPROVED", ...(cuisineSlug ? { cuisines: { some: { slug: cuisineSlug } } } : {}) },
    select: PUBLIC_CHEF_CARD_SELECT,
    orderBy: { displayName: "asc" },
  });
  const stats = await statsFor(chefs.map((c) => c.id));
  return chefs.map((c) => ({ ...c, ...stats.get(c.id)! }));
}

export async function getChefBySlug(slug: string): Promise<PublicChefProfile | null> {
  const chef = await getDb().chefProfile.findFirst({
    where: { slug, status: { in: ["APPROVED", "SUSPENDED"] } },
    select: PUBLIC_CHEF_PROFILE_SELECT,
  });
  if (!chef) return null;
  const [stats, reviews] = await Promise.all([
    statsFor([chef.id]),
    getDb().review.findMany({
      where: { chefId: chef.id, removedAt: null },
      select: PUBLIC_REVIEW_SELECT,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return { ...chef, ...stats.get(chef.id)!, reviews };
}
