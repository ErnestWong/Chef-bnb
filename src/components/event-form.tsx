"use client";

import { useActionState, useState } from "react";
import { saveEventAction, setEventStatusAction } from "@/app/actions/events";
import type { FormResult } from "@/app/actions/chefs";
import { RULES } from "@/lib/bookings/rules";
import { BOROUGH_LABELS } from "@/lib/format";
import { BOROUGHS } from "@/lib/queries/event-filters";
import { Field, FormError, fieldClass } from "./form-ui";

export type EventFormVenue = { id: string; neighborhood: string; borough: string; crossStreets: string };
export type EventFormMenu = { id: string; title: string };
export type EventFormValues = {
  id?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  durationMin: number;
  priceDollars: number;
  minGuests: number;
  maxGuests: number;
  allowedBookingTypes: string[];
  cuisineIds: string[];
  dietaryNotes: string;
  byobNote: string;
  venueId: string;
  menuId: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  locked?: boolean;
};

export function EventForm({ venues, menus, cuisines, values }: { cuisines: { id: string; name: string }[]; venues: EventFormVenue[]; menus: EventFormMenu[]; values: EventFormValues }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(saveEventAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  const [venueId, setVenueId] = useState(values.venueId || (venues[0]?.id ?? ""));
  const [menuId, setMenuId] = useState(values.menuId);
  const newVenue = venueId === "";
  const locked = values.locked ?? false;

  return (
    <form action={action} className="flex flex-col gap-6">
      {values.id && <input type="hidden" name="eventId" value={values.id} />}
      <FormError message={state && !state.ok ? state.error : undefined} />
      {locked && <p className="rounded-md bg-accent-soft px-3 py-2 text-sm">Guests hold seats on this dinner, so the date, price and capacity are locked.</p>}

      <Field label="Title" error={f.title}>
        <input name="title" defaultValue={values.title} required minLength={3} maxLength={80} className={fieldClass} />
      </Field>
      <Field label="Description" hint="What's on the table and what the night is like." error={f.description}>
        <textarea name="description" rows={3} defaultValue={values.description} maxLength={1000} className={fieldClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" error={f.date}>
          <input name="date" type="date" defaultValue={values.date} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Start (New York time)" error={f.time}>
          <input name="time" type="time" defaultValue={values.time} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Duration (minutes)" error={f.durationMin}>
          <input name="durationMin" type="number" min={30} max={600} step={15} defaultValue={values.durationMin} required className={fieldClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price per seat ($)" error={f.priceDollars}>
          <input name="priceDollars" type="number" min={0} max={1000} step={1} defaultValue={values.priceDollars} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Minimum guests" hint="Review confirmed headcount before deciding whether to run the dinner." error={f.minGuests}>
          <input name="minGuests" type="number" min={1} max={RULES.MAX_GUESTS} defaultValue={values.minGuests} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label={`Maximum guests (≤ ${RULES.MAX_GUESTS})`} error={f.maxGuests}>
          <input name="maxGuests" type="number" min={1} max={RULES.MAX_GUESTS} defaultValue={values.maxGuests} required readOnly={locked} className={fieldClass} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Cuisines (up to 4)</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {cuisines.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="checkbox" name="cuisineIds" value={c.id} defaultChecked={values.cuisineIds.includes(c.id)} className="accent-accent" />
              {c.name}
            </label>
          ))}
        </div>
        {f.cuisineIds && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{f.cuisineIds}</span>}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Ways to book</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ["SEAT", "Solo seats"],
            ["GROUP", `Groups of 2–${RULES.GROUP_CAP}`],
            ["BUYOUT", "Full buyout"],
          ].map(([v, label]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="checkbox" name="allowedBookingTypes" value={v} defaultChecked={values.allowedBookingTypes.includes(v)} className="accent-accent" />
              {label}
            </label>
          ))}
        </div>
        {f.allowedBookingTypes && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{f.allowedBookingTypes}</span>}
      </fieldset>

      <section className="rounded-2xl border border-line p-4">
        <p className="text-sm font-medium">Where</p>
        <p className="mt-1 text-xs text-muted">Guests see the neighborhood and cross streets only. Automated address delivery is not available yet.</p>
        <div className="mt-3">
          <Field label="Venue" error={f.venueId}>
            <select name="venueId" value={venueId} onChange={(e) => setVenueId(e.target.value)} className={fieldClass}>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.neighborhood}, {BOROUGH_LABELS[v.borough as keyof typeof BOROUGH_LABELS]} · near {v.crossStreets}
                </option>
              ))}
              <option value="">+ New venue</option>
            </select>
          </Field>
        </div>
        {newVenue && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Street address (private)" error={f.venueAddress}>
              <input name="venueAddress" className={fieldClass} placeholder="12 Orchard St, Apt 3" />
            </Field>
            <Field label="Neighborhood" error={f.venueNeighborhood}>
              <input name="venueNeighborhood" className={fieldClass} placeholder="Lower East Side" />
            </Field>
            <Field label="Borough" error={f.venueBorough}>
              <select name="venueBorough" className={fieldClass} defaultValue="">
                <option value="">Choose</option>
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>{BOROUGH_LABELS[b]}</option>
                ))}
              </select>
            </Field>
            <Field label="Nearest cross streets" error={f.venueCrossStreets}>
              <input name="venueCrossStreets" className={fieldClass} placeholder="Orchard St & Rivington St" />
            </Field>
            <Field label="Latitude (optional)" hint="Rounded to ~100 m before it's shown." error={f.venueLat}>
              <input name="venueLat" type="number" step="0.0001" className={fieldClass} />
            </Field>
            <Field label="Longitude (optional)" error={f.venueLng}>
              <input name="venueLng" type="number" step="0.0001" className={fieldClass} />
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line p-4">
        <p className="text-sm font-medium">Menu</p>
        <div className="mt-3">
          <Field label="Use a saved menu" error={f.menuId}>
            <select name="menuId" value={menuId} onChange={(e) => setMenuId(e.target.value)} className={fieldClass}>
              <option value="">No menu yet / write a new one</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </Field>
        </div>
        {!menuId && (
          <div className="mt-4 grid gap-4">
            <Field label="New menu title" error={f.menuTitle}>
              <input name="menuTitle" className={fieldClass} placeholder="Winter tasting" />
            </Field>
            <Field label="Courses, one per line" hint="Name — description" error={f.menuCourses}>
              <textarea name="menuCourses" rows={4} className={fieldClass} placeholder={"Welcome bites — something small while everyone arrives\nMains — family style"} />
            </Field>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dietary notes" hint="Allergens, what can be accommodated." error={f.dietaryNotes}>
          <textarea name="dietaryNotes" rows={2} defaultValue={values.dietaryNotes} maxLength={500} className={fieldClass} />
        </Field>
        <Field label="BYOB note" hint="It's always BYOB; add pairing suggestions if you like." error={f.byobNote}>
          <textarea name="byobNote" rows={2} defaultValue={values.byobNote} maxLength={200} className={fieldClass} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" name="intent" value="draft" disabled={pending} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent disabled:opacity-50">
          {values.status === "PUBLISHED" ? "Save changes" : "Save draft"}
        </button>
        {values.status !== "PUBLISHED" && (
          <button type="submit" name="intent" value="publish" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {pending ? "Saving…" : "Publish"}
          </button>
        )}
      </div>
    </form>
  );
}

export function EventStatusButton({ eventId, to, label, variant = "secondary", confirmText, withReason }: { eventId: string; to: "PUBLISHED" | "DRAFT" | "CANCELLED"; label: string; variant?: "primary" | "secondary" | "danger"; confirmText?: string; withReason?: boolean }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(setEventStatusAction, null);
  const styles = {
    primary: "bg-accent text-white",
    secondary: "border border-line hover:border-accent",
    danger: "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40",
  }[variant];
  return (
    <form
      action={action}
      className="inline-flex flex-col gap-1"
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="to" value={to} />
      {withReason && <input name="reason" placeholder="Cancellation reason" maxLength={300} className={`${fieldClass} w-64`} />}
      <button type="submit" disabled={pending} className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${styles}`}>
        {pending ? "…" : label}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span>}
    </form>
  );
}
