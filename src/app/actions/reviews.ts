"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth/session";
import { ReviewError, createReview, removeReview, restoreReview, reviewSchema } from "@/lib/reviews/reviews";
import { LIMITS } from "@/lib/security/limits";
import { rateLimitMessage } from "@/lib/security/rate-limit";
import type { ActionResult } from "./bookings";

/** Guest leaves the one review their attended booking allows. */
export async function submitReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse({ bookingId: formData.get("bookingId"), rating: formData.get("rating"), body: formData.get("body") || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const user = await requireUser(`/bookings/${parsed.data.bookingId}`);
  const limited = await rateLimitMessage(getDb(), `review:user:${user.id}`, LIMITS.reviewsPerUser);
  if (limited) return { ok: false, error: limited };
  let chefSlug: string | null = null;
  let eventId: string | null = null;
  try {
    const review = await createReview(getDb(), user.id, parsed.data);
    const chef = await getDb().chefProfile.findUnique({ where: { id: review.chefId }, select: { slug: true } });
    chefSlug = chef?.slug ?? null;
    eventId = review.eventId;
  } catch (err) {
    if (err instanceof ReviewError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  revalidatePath("/chefs");
  if (chefSlug) revalidatePath(`/chefs/${chefSlug}`);
  if (eventId) revalidatePath(`/events/${eventId}`);
  redirect(`/bookings/${parsed.data.bookingId}?reviewed=1`);
}

const moderateSchema = z.object({ reviewId: z.string().min(1), action: z.enum(["remove", "restore"]) });

/** Admin takedown or restore. */
export async function moderateReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireRole("ADMIN", "/admin/reviews");
  const limited = await rateLimitMessage(getDb(), `admin:user:${admin.id}`, LIMITS.adminActionsPerUser);
  if (limited) return { ok: false, error: limited };
  const parsed = moderateSchema.safeParse({ reviewId: formData.get("reviewId"), action: formData.get("action") });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const db = getDb();
  const review = parsed.data.action === "remove" ? await removeReview(db, parsed.data.reviewId) : await restoreReview(db, parsed.data.reviewId);
  const chef = await db.chefProfile.findUnique({ where: { id: review.chefId }, select: { slug: true } });
  revalidatePath("/admin/reviews");
  revalidatePath("/chefs");
  if (chef) revalidatePath(`/chefs/${chef.slug}`);
  revalidatePath(`/events/${review.eventId}`);
  return { ok: true };
}
