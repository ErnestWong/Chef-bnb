"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getMessenger } from "@/lib/messaging";
import { notifyPitchDecided } from "@/lib/email/notify";
import {
  NightError,
  approvePitch,
  cancelOpenNight,
  createOpenNight,
  createPartnerVenue,
  declinePitch,
  openNightSchema,
  partnerVenueSchema,
  pitchSchema,
  submitPitch,
  withdrawPitch,
} from "@/lib/nights/nights";
import { LIMITS } from "@/lib/security/limits";
import { rateLimitMessage } from "@/lib/security/rate-limit";
import type { FieldErrors, FormResult } from "./chefs";

function fieldErrors(issues: z.core.$ZodIssue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v === null || v === "" ? undefined : String(v);
};

function refreshBoard(nightId?: string) {
  for (const path of ["/chef", "/chef/nights", "/admin", "/admin/nights"]) revalidatePath(path);
  if (nightId) {
    revalidatePath(`/chef/nights/${nightId}`);
    revalidatePath(`/admin/nights/${nightId}`);
  }
}

// ---------- Chef ----------

/** An approved chef pitches a menu, a price and a seat count for an open night. */
export async function pitchNightAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const user = await requireRole("CHEF", "/chef/nights");
  const parsed = pitchSchema.safeParse({
    nightId: text(formData, "nightId"),
    title: text(formData, "title"),
    pitch: text(formData, "pitch"),
    priceDollars: text(formData, "priceDollars"),
    maxGuests: text(formData, "maxGuests"),
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error.issues) };
  const limited = await rateLimitMessage(getDb(), `pitch:user:${user.id}`, LIMITS.pitchesPerChef);
  if (limited) return { ok: false, error: limited };
  try {
    await submitPitch(getDb(), user.id, parsed.data);
  } catch (err) {
    if (err instanceof NightError) return err.code === "seats_out_of_range" ? { ok: false, fields: { maxGuests: err.message } } : { ok: false, error: err.message };
    throw err;
  }
  refreshBoard(parsed.data.nightId);
  redirect(`/chef/nights/${parsed.data.nightId}?pitched=1`);
}

export async function withdrawPitchAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const user = await requireRole("CHEF", "/chef/nights");
  const pitchId = text(formData, "pitchId");
  const nightId = text(formData, "nightId");
  if (!pitchId || !nightId) return { ok: false, error: "Invalid request." };
  const limited = await rateLimitMessage(getDb(), `pitch:user:${user.id}`, LIMITS.pitchesPerChef);
  if (limited) return { ok: false, error: limited };
  try {
    await withdrawPitch(getDb(), user.id, pitchId);
  } catch (err) {
    if (err instanceof NightError) return { ok: false, error: err.message };
    throw err;
  }
  refreshBoard(nightId);
  redirect(`/chef/nights/${nightId}`);
}

// ---------- Admin ----------

async function admin(path: string) {
  const user = await requireRole("ADMIN", path);
  return rateLimitMessage(getDb(), `admin:user:${user.id}`, LIMITS.adminActionsPerUser);
}

/** Add a room Covers has booked (a partner venue). */
export async function createPartnerVenueAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const limited = await admin("/admin/nights");
  if (limited) return { ok: false, error: limited };
  const parsed = partnerVenueSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    kitchenNotes: text(formData, "kitchenNotes") ?? "",
    hasBar: formData.get("hasBar") === "on",
    address: text(formData, "address"),
    neighborhood: text(formData, "neighborhood"),
    crossStreets: text(formData, "crossStreets"),
    capacity: text(formData, "capacity"),
    lat: text(formData, "lat"),
    lng: text(formData, "lng"),
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error.issues) };
  await createPartnerVenue(getDb(), parsed.data);
  refreshBoard();
  redirect("/admin/nights?room=added");
}

/** Put a night on the board for a partner venue. */
export async function createOpenNightAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const limited = await admin("/admin/nights");
  if (limited) return { ok: false, error: limited };
  const parsed = openNightSchema.safeParse({
    venueId: text(formData, "venueId"),
    date: text(formData, "date"),
    time: text(formData, "time"),
    durationMin: text(formData, "durationMin"),
    minSeats: text(formData, "minSeats"),
    maxSeats: text(formData, "maxSeats"),
    venueSharePct: text(formData, "venueSharePct") ?? "0",
    venueFeeDollars: text(formData, "venueFeeDollars") ?? "0",
    terms: text(formData, "terms") ?? "",
    suggestedPriceDollars: text(formData, "suggestedPriceDollars"),
    crew: text(formData, "crew") ?? "",
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error.issues) };
  let id: string;
  try {
    id = (await createOpenNight(getDb(), parsed.data)).id;
  } catch (err) {
    if (err instanceof NightError) return err.code === "over_capacity" ? { ok: false, fields: { maxSeats: err.message } } : { ok: false, error: err.message };
    throw err;
  }
  refreshBoard(id);
  redirect(`/admin/nights/${id}?added=1`);
}

const decisionSchema = z.object({
  pitchId: z.string().min(1),
  nightId: z.string().min(1),
  decision: z.enum(["APPROVE", "DECLINE"]),
  note: z.string().trim().max(500).optional(),
});

/** Approve (the night becomes the chef's draft dinner) or decline a pitch. Chefs hear either way. */
export async function decidePitchAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const limited = await admin("/admin/nights");
  if (limited) return { ok: false, error: limited };
  const parsed = decisionSchema.safeParse({
    pitchId: text(formData, "pitchId"),
    nightId: text(formData, "nightId"),
    decision: text(formData, "decision"),
    note: text(formData, "note"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { pitchId, nightId, decision, note } = parsed.data;
  let notify: string[];
  try {
    if (decision === "APPROVE") {
      const result = await approvePitch(getDb(), pitchId, note);
      notify = [pitchId, ...result.declinedPitchIds];
    } else {
      await declinePitch(getDb(), pitchId, note);
      notify = [pitchId];
    }
  } catch (err) {
    if (err instanceof NightError) return { ok: false, error: err.message };
    throw err;
  }
  const messenger = getMessenger();
  for (const id of notify) await notifyPitchDecided(getDb(), messenger, id);
  refreshBoard(nightId);
  revalidatePath("/events");
  redirect(`/admin/nights/${nightId}`);
}

export async function cancelOpenNightAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const limited = await admin("/admin/nights");
  if (limited) return { ok: false, error: limited };
  const nightId = text(formData, "nightId");
  if (!nightId) return { ok: false, error: "Invalid request." };
  let declined: string[];
  try {
    declined = (await cancelOpenNight(getDb(), nightId)).declinedPitchIds;
  } catch (err) {
    if (err instanceof NightError) return { ok: false, error: err.message };
    throw err;
  }
  const messenger = getMessenger();
  for (const id of declined) await notifyPitchDecided(getDb(), messenger, id);
  refreshBoard(nightId);
  redirect(`/admin/nights/${nightId}`);
}
