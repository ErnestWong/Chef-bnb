"use client";

import { useActionState, useMemo, useState, type FormEvent } from "react";
import { saveEventAction, setEventStatusAction } from "@/app/actions/events";
import type { FormResult, SubmittedValues } from "@/app/actions/chefs";
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

const EMPTY: ReadonlySet<string> = new Set();
const str = (x: string | string[] | undefined): string | undefined => (Array.isArray(x) ? x[0] : x);
const num = (x: string | string[] | undefined, fallback: number): number => {
  const n = Number(str(x));
  return Number.isFinite(n) && str(x) !== undefined && str(x) !== "" ? n : fallback;
};

/** After a failed save, the form shows what was typed, not the original values (React resets a form once its action returns). */
function withSubmitted(base: EventFormValues, s: SubmittedValues): EventFormValues {
  return {
    ...base,
    title: str(s.title) ?? "",
    description: str(s.description) ?? "",
    date: str(s.date) ?? "",
    time: str(s.time) ?? base.time,
    durationMin: num(s.durationMin, base.durationMin),
    priceDollars: num(s.priceDollars, base.priceDollars),
    minGuests: num(s.minGuests, base.minGuests),
    maxGuests: num(s.maxGuests, base.maxGuests),
    cuisineIds: Array.isArray(s.cuisineIds) ? s.cuisineIds : [],
    allowedBookingTypes: Array.isArray(s.allowedBookingTypes) ? s.allowedBookingTypes : [],
    dietaryNotes: str(s.dietaryNotes) ?? "",
    byobNote: str(s.byobNote) ?? "",
    venueId: str(s.venueId) ?? "",
    menuId: str(s.menuId) ?? "",
  };
}

export function EventForm({ venues, menus, cuisines, values }: { cuisines: { id: string; name: string }[]; venues: EventFormVenue[]; menus: EventFormMenu[]; values: EventFormValues }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(saveEventAction, null);
  const failed = state && !state.ok ? state : null;
  const submitted = failed?.values;
  const v = useMemo(() => (submitted ? withSubmitted(values, submitted) : values), [values, submitted]);
  const [venueId, setVenueId] = useState(values.venueId || (venues[0]?.id ?? ""));
  const [menuId, setMenuId] = useState(values.menuId);
  // A failed save just arrived: remount the fields so their defaultValues are what was typed,
  // and point the venue/menu selects at what was submitted (state adjusted during render, not in an effect).
  const [seen, setSeen] = useState<FormResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  if (failed && seen !== failed) {
    setSeen(failed);
    setAttempt((a) => a + 1);
    if (submitted) {
      setVenueId(str(submitted.venueId) ?? "");
      setMenuId(str(submitted.menuId) ?? "");
    }
  }
  // Field errors go away as soon as the field (or, for the venue block, any venue field) changes;
  // the set is tied to the result it belongs to, so a new result shows all its errors again.
  const [cleared, setCleared] = useState<{ of: FormResult | null; names: Set<string> }>({ of: null, names: new Set() });
  const clearedNames = cleared.of === state ? cleared.names : EMPTY;
  const fields = failed?.fields ?? {};
  const err = (name: string) => (clearedNames.has(name) ? undefined : fields[name]);
  function onChange(e: FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (!name) return;
    setCleared((prev) => {
      const names = new Set(prev.of === state ? prev.names : []);
      names.add(name);
      if (name.startsWith("venue")) names.add("venueId");
      if (name.startsWith("menu")) names.add("menuId");
      return { of: state, names };
    });
  }
  const newVenue = venueId === "";
  const locked = values.locked ?? false;

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-6">
      {values.id && <input type="hidden" name="eventId" value={values.id} />}
      <FormError message={failed?.error} />
      {locked && <p className="rounded-md bg-accent-soft px-3 py-2 text-sm">Guests hold seats on this dinner, so the date, price and capacity are locked.</p>}

      <div key={attempt} className="contents">
      <Field label="Title" error={err("title")}>
        <input name="title" defaultValue={v.title} required minLength={3} maxLength={80} className={fieldClass} />
      </Field>
      <Field label="Description" hint="What's on the table and what the night is like." error={err("description")}>
        <textarea name="description" rows={3} defaultValue={v.description} maxLength={1000} className={fieldClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" error={err("date")}>
          <input name="date" type="date" defaultValue={v.date} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Start (New York time)" error={err("time")}>
          <input name="time" type="time" defaultValue={v.time} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Duration (minutes)" error={err("durationMin")}>
          <input name="durationMin" type="number" min={30} max={600} step={15} defaultValue={v.durationMin} required className={fieldClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price per seat ($)" error={err("priceDollars")}>
          <input name="priceDollars" type="number" min={0} max={1000} step={1} defaultValue={v.priceDollars} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Minimum guests" hint={`If fewer have paid ${RULES.GO_NO_GO_HOURS} hours before the start, the dinner is cancelled and guests are emailed.`} error={err("minGuests")}>
          <input name="minGuests" type="number" min={1} max={RULES.MAX_GUESTS} defaultValue={v.minGuests} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label={`Maximum guests (≤ ${RULES.MAX_GUESTS})`} error={err("maxGuests")}>
          <input name="maxGuests" type="number" min={1} max={RULES.MAX_GUESTS} defaultValue={v.maxGuests} required readOnly={locked} className={fieldClass} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Cuisines (up to 4)</legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {cuisines.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="checkbox" name="cuisineIds" value={c.id} defaultChecked={v.cuisineIds.includes(c.id)} className="accent-accent" />
              {c.name}
            </label>
          ))}
        </div>
        {err("cuisineIds") && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{err("cuisineIds")}</span>}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Ways to book</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            ["SEAT", "Solo seats"],
            ["GROUP", `Groups of 2–${RULES.GROUP_CAP}`],
            ["BUYOUT", "Full buyout"],
          ].map(([val, label]) => (
            <label key={val} className="flex items-center gap-2">
              <input type="checkbox" name="allowedBookingTypes" value={val} defaultChecked={v.allowedBookingTypes.includes(val)} className="accent-accent" />
              {label}
            </label>
          ))}
        </div>
        {err("allowedBookingTypes") && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{err("allowedBookingTypes")}</span>}
      </fieldset>

      <section className="rounded-2xl border border-line p-4">
        <p className="text-sm font-medium">Where</p>
        <p className="mt-1 text-xs text-muted">Guests see the neighborhood and cross streets only. The address goes out by email 48 h before.</p>
        <div className="mt-3">
          <Field label="Venue" error={err("venueId")}>
            <select name="venueId" value={venueId} onChange={(e) => setVenueId(e.target.value)} className={fieldClass}>
              {venues.map((ven) => (
                <option key={ven.id} value={ven.id}>
                  {ven.neighborhood}, {BOROUGH_LABELS[ven.borough as keyof typeof BOROUGH_LABELS]} · near {ven.crossStreets}
                </option>
              ))}
              <option value="">{venues.length ? "+ New venue" : "Add the place you'll cook"}</option>
            </select>
          </Field>
        </div>
        {newVenue && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Street address (private)" error={err("venueAddress")}>
              <input name="venueAddress" defaultValue={str(submitted?.venueAddress)} className={fieldClass} placeholder="12 Orchard St, Apt 3" />
            </Field>
            <Field label="Neighborhood" error={err("venueNeighborhood")}>
              <input name="venueNeighborhood" defaultValue={str(submitted?.venueNeighborhood)} className={fieldClass} placeholder="Lower East Side" />
            </Field>
            <Field label="Borough" error={err("venueBorough")}>
              <select name="venueBorough" className={fieldClass} defaultValue={str(submitted?.venueBorough) ?? ""}>
                <option value="">Choose</option>
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>{BOROUGH_LABELS[b]}</option>
                ))}
              </select>
            </Field>
            <Field label="Nearest cross streets" error={err("venueCrossStreets")}>
              <input name="venueCrossStreets" defaultValue={str(submitted?.venueCrossStreets)} className={fieldClass} placeholder="Orchard St & Rivington St" />
            </Field>
            <Field label="Latitude (optional)" hint="Rounded to ~100 m before it's shown." error={err("venueLat")}>
              <input name="venueLat" type="number" step="0.0001" defaultValue={str(submitted?.venueLat)} className={fieldClass} />
            </Field>
            <Field label="Longitude (optional)" error={err("venueLng")}>
              <input name="venueLng" type="number" step="0.0001" defaultValue={str(submitted?.venueLng)} className={fieldClass} />
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line p-4">
        <p className="text-sm font-medium">Menu</p>
        <div className="mt-3">
          <Field label="Use a saved menu" error={err("menuId")}>
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
            <Field label="New menu title" error={err("menuTitle")}>
              <input name="menuTitle" defaultValue={str(submitted?.menuTitle)} className={fieldClass} placeholder="Winter tasting" />
            </Field>
            <Field label="Courses, one per line" hint="Name — description" error={err("menuCourses")}>
              <textarea name="menuCourses" rows={4} defaultValue={str(submitted?.menuCourses)} className={fieldClass} placeholder={"Welcome bites — something small while everyone arrives\nMains — family style"} />
            </Field>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dietary notes" hint="Allergens, what can be accommodated." error={err("dietaryNotes")}>
          <textarea name="dietaryNotes" rows={2} defaultValue={v.dietaryNotes} maxLength={500} className={fieldClass} />
        </Field>
        <Field label="BYOB note" hint="It's always BYOB; add pairing suggestions if you like." error={err("byobNote")}>
          <textarea name="byobNote" rows={2} defaultValue={v.byobNote} maxLength={200} className={fieldClass} />
        </Field>
      </div>
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
      className="inline-flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="to" value={to} />
      {withReason && <input name="reason" placeholder="Reason (emailed to guests)" maxLength={300} className={`${fieldClass} w-56 py-1.5 text-xs`} />}
      <button type="submit" disabled={pending} className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${styles}`}>
        {pending ? "…" : label}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span>}
    </form>
  );
}
