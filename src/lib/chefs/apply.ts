import { z } from "zod";
import type { Db } from "@/lib/db";
import type { ChefStatus } from "@/generated/prisma/enums";
import { BOROUGHS } from "@/lib/queries/event-filters";

export const applySchema = z.object({
  displayName: z.string().trim().min(2, "Tell us your name as guests should see it.").max(60),
  bio: z.string().trim().min(40, "A few sentences, at least — guests book the person.").max(1200),
  credentials: z.string().trim().max(300).optional(),
  website: z.url("Enter a full URL, including https://").optional().or(z.literal("")),
  instagram: z.string().trim().regex(/^@?[A-Za-z0-9._]{1,30}$/, "Just the handle, like @yourname").optional().or(z.literal("")),
  homeBorough: z.enum(BOROUGHS).optional().or(z.literal("")),
  cuisineIds: z.array(z.string().min(1)).min(1, "Pick at least one cuisine.").max(4),
  hosting: z.enum(["HOME", "VENUE"]),
  needsFoh: z.boolean().default(false),
  needsServers: z.boolean().default(false),
  paymentHandle: z.string().trim().min(2, "Guests pay you directly — add a Venmo or Zelle handle.").max(60),
  paymentNote: z.string().trim().max(200).optional(),
  foodCertNumber: z.string().trim().max(40).optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;

export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "chef"
  );
}

export class ApplyError extends Error {
  constructor(public readonly code: "already_applied" | "already_approved" | "suspended") {
    super(
      {
        already_applied: "You already have an application in review.",
        already_approved: "You're already approved to host; your dashboard is at /chef.",
        suspended: "Your hosting is paused. Reply to the email you received to discuss it.",
      }[code],
    );
    this.name = "ApplyError";
  }
}

export function canApply(existing: { status: ChefStatus } | null): { ok: true; reapplying: boolean } | { ok: false; code: "already_applied" | "already_approved" | "suspended" } {
  if (!existing) return { ok: true, reapplying: false };
  if (existing.status === "REJECTED") return { ok: true, reapplying: true };
  if (existing.status === "APPROVED") return { ok: false, code: "already_approved" };
  if (existing.status === "SUSPENDED") return { ok: false, code: "suspended" };
  return { ok: false, code: "already_applied" };
}

/**
 * Create a chef application, or re-apply after a rejection: the rejected
 * profile is updated in place and goes back to APPLIED, keeping the admin's
 * earlier note so the reviewer has the history. Approved, suspended and
 * pending profiles can't apply again.
 */
export async function createApplication(db: Db, userId: string, input: ApplyInput) {
  const existing = await db.chefProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  const verdict = canApply(existing);
  if (!verdict.ok) throw new ApplyError(verdict.code);

  if (existing) {
    return db.chefProfile.update({
      where: { id: existing.id },
      data: {
        displayName: input.displayName,
        bio: input.bio,
        credentials: input.credentials || null,
        website: input.website || null,
        instagram: input.instagram ? input.instagram.replace(/^@/, "") : null,
        homeBorough: input.homeBorough || null,
        needsVenue: input.hosting === "VENUE",
        needsFoh: input.needsFoh,
        needsServers: input.needsServers,
        paymentHandle: input.paymentHandle,
        paymentNote: input.paymentNote || null,
        foodCertNumber: input.foodCertNumber || null,
        status: "APPLIED",
        cuisines: { set: input.cuisineIds.map((id) => ({ id })) },
      },
    });
  }

  const base = slugify(input.displayName);
  const taken = await db.chefProfile.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
  const slugs = new Set(taken.map((t) => t.slug));
  let slug = base;
  for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;

  return db.chefProfile.create({
    data: {
      userId,
      displayName: input.displayName,
      slug,
      bio: input.bio,
      credentials: input.credentials || null,
      website: input.website || null,
      instagram: input.instagram ? input.instagram.replace(/^@/, "") : null,
      homeBorough: input.homeBorough || null,
      needsVenue: input.hosting === "VENUE",
      needsFoh: input.needsFoh,
      needsServers: input.needsServers,
      paymentHandle: input.paymentHandle,
      paymentNote: input.paymentNote || null,
      foodCertNumber: input.foodCertNumber || null,
      status: "APPLIED",
      cuisines: { connect: input.cuisineIds.map((id) => ({ id })) },
    },
  });
}

export type ReviewDecision = "APPROVED" | "REJECTED" | "SUSPENDED";

/** Admin decision. Approval grants the CHEF role; rejection/suspension removes it. */
export async function reviewApplication(db: Db, input: { profileId: string; decision: ReviewDecision; note?: string }) {
  return db.$transaction(async (tx) => {
    const profile = await tx.chefProfile.update({
      where: { id: input.profileId },
      data: { status: input.decision, reviewNote: input.note?.trim() || null },
      include: { user: { select: { id: true, roles: true } } },
    });
    const roles = new Set(profile.user.roles);
    if (input.decision === "APPROVED") roles.add("CHEF");
    else roles.delete("CHEF");
    await tx.user.update({ where: { id: profile.user.id }, data: { roles: [...roles] } });
    return profile;
  });
}
