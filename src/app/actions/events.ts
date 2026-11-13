"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { getMailer } from "@/lib/email/mailer";
import { notifyEventCancelled } from "@/lib/email/notify";
import { CHEF_CANCEL_REASON, EventError, eventSchema, saveEvent, setEventStatus } from "@/lib/events/manage";
import type { FormResult } from "./chefs";

function fieldErrors(issues: z.core.$ZodIssue[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

export async function saveEventAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const user = await requireRole("CHEF", "/chef");
  const eventId = (formData.get("eventId") as string | null) || undefined;
  const raw: Record<string, unknown> = {};
  for (const key of [
    "title", "description", "date", "time", "durationMin", "priceDollars", "minGuests", "maxGuests", "dietaryNotes", "byobNote",
    "venueId", "venueAddress", "venueNeighborhood", "venueBorough", "venueCrossStreets", "venueLat", "venueLng", "menuId", "menuTitle", "menuCourses", "intent",
  ]) {
    const v = formData.get(key);
    raw[key] = v === null || v === "" ? undefined : v;
  }
  raw.cuisineIds = formData.getAll("cuisineIds").map(String);
  raw.allowedBookingTypes = formData.getAll("allowedBookingTypes").map(String);
  if (raw.venueBorough === undefined) raw.venueBorough = "";
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error.issues) };

  let id: string;
  try {
    id = (await saveEvent(getDb(), user.id, parsed.data, eventId)).id;
  } catch (err) {
    if (err instanceof EventError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/chef");
  redirect(`/chef/events/${id}?saved=1`);
}

const statusSchema = z.object({
  eventId: z.string().min(1),
  to: z.enum(["PUBLISHED", "DRAFT", "CANCELLED"]),
  reason: z.string().trim().max(300).optional(),
});

export async function setEventStatusAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const user = await requireRole("CHEF", "/chef");
  const parsed = statusSchema.safeParse({ eventId: formData.get("eventId"), to: formData.get("to"), reason: formData.get("reason") || undefined });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const { cancelledBookings } = await setEventStatus(getDb(), user.id, parsed.data.eventId, parsed.data.to, parsed.data.reason);
    if (parsed.data.to === "CANCELLED") {
      await notifyEventCancelled(getDb(), getMailer(), parsed.data.eventId, cancelledBookings, { reason: parsed.data.reason?.trim() || CHEF_CANCEL_REASON, cancelledBy: "chef" });
    }
  } catch (err) {
    if (err instanceof EventError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/events");
  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath("/chef");
  redirect(`/chef/events/${parsed.data.eventId}`);
}
