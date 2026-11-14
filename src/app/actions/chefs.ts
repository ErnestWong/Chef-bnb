"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth/session";
import { ApplyError, applySchema, createApplication, reviewApplication } from "@/lib/chefs/apply";
import { getMailer } from "@/lib/email/mailer";
import { notifyChefDecision } from "@/lib/email/notify";
import { LIMITS } from "@/lib/security/limits";
import { rateLimitMessage } from "@/lib/security/rate-limit";
import type { ActionResult } from "./bookings";

export type FieldErrors = Record<string, string>;
export type FormResult = { ok: true } | { ok: false; error?: string; fields?: FieldErrors };

function fieldErrors(issues: z.core.$ZodIssue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

export async function applyAsChefAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const user = await requireUser("/chef/apply");
  const parsed = applySchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    credentials: formData.get("credentials") || undefined,
    website: formData.get("website") || "",
    instagram: formData.get("instagram") || "",
    homeBorough: formData.get("homeBorough") || "",
    cuisineIds: formData.getAll("cuisineIds").map(String),
    hosting: formData.get("hosting"),
    needsFoh: formData.get("needsFoh") === "on",
    needsServers: formData.get("needsServers") === "on",
    paymentHandle: formData.get("paymentHandle"),
    paymentNote: formData.get("paymentNote") || undefined,
    foodCertNumber: formData.get("foodCertNumber") || undefined,
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error.issues) };
  const limited = await rateLimitMessage(getDb(), `apply:user:${user.id}`, LIMITS.applyPerUser);
  if (limited) return { ok: false, error: limited };

  try {
    await createApplication(getDb(), user.id, parsed.data);
  } catch (err) {
    if (err instanceof ApplyError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/account");
  revalidatePath("/chef");
  revalidatePath("/admin");
  redirect("/chef?applied=1");
}

const reviewSchema = z.object({
  profileId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewChefAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireRole("ADMIN", "/admin/chefs");
  const limited = await rateLimitMessage(getDb(), `admin:user:${admin.id}`, LIMITS.adminActionsPerUser);
  if (limited) return { ok: false, error: limited };
  const parsed = reviewSchema.safeParse({
    profileId: formData.get("profileId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  await reviewApplication(getDb(), parsed.data);
  if (parsed.data.decision !== "SUSPENDED") await notifyChefDecision(getDb(), getMailer(), parsed.data.profileId);
  revalidatePath("/admin/chefs");
  revalidatePath(`/admin/chefs/${parsed.data.profileId}`);
  revalidatePath("/chefs");
  redirect(`/admin/chefs/${parsed.data.profileId}`);
}
