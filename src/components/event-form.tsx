"use client";

import { useActionState, useState } from "react";
import { saveEventAction, setEventStatusAction } from "@/app/actions/events";
import type { FormResult } from "@/app/actions/chefs";
import type { VenueType } from "@/generated/prisma/enums";
import { RULES } from "@/lib/bookings/rules";
import { dinnerLimits, type Drinks } from "@/lib/events/formats";
import { BOROUGH_LABELS } from "@/lib/format";
import { Field, FormError, fieldClass } from "./form-ui";
import { NeighborhoodSelect } from "./neighborhood-select";

export type EventFormVenue = {
  id: string;
  type: VenueType;
  name: string | null;
  neighborhood: string;
  borough: string;
  crossStreets: string;
  capacity: number;
  hasBar: boolean;
};
export type EventFormMenu = { id: string; title: string };
/** A dinner from an open night: the room, date and time are the night's, not the chef's to change. */
export type EventFormNight = {
  venue: EventFormVenue;
  dateLabel: string;
  minSeats: number;
  maxSeats: number;
  durationMin: number;
};
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
  drinks: Drinks;
  byobNote: string;
  venueId: string;
  menuId: string;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  locked?: boolean;
};

function venueOptionLabel(v: EventFormVenue): string {
  const where = `${v.neighborhood}, ${BOROUGH_LABELS[v.borough as keyof typeof BOROUGH_LABELS] ?? v.borough}`;
  return v.type === "CHEF_SPACE" ? `${v.name ?? "Your space"} · ${where} · seats ${v.capacity}` : `Home · ${where} · near ${v.crossStreets}`;
}

export function EventForm({
  venues,
  menus,
  cuisines,
  values,
  night,
}: {
  cuisines: { id: string; name: string }[];
  venues: EventFormVenue[];
  menus: EventFormMenu[];
  values: EventFormValues;
  night?: EventFormNight | null;
}) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(saveEventAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  const [venueId, setVenueId] = useState(night ? night.venue.id : values.venueId || (venues[0]?.id ?? ""));
  const [menuId, setMenuId] = useState(values.menuId);
  const [newKind, setNewKind] = useState<"HOME" | "SPACE">("HOME");
  const [newCapacity, setNewCapacity] = useState(16);
  const [newHasBar, setNewHasBar] = useState(false);
  const [drinks, setDrinks] = useState<Drinks>(values.drinks);
  const newVenue = !night && venueId === "";
  const locked = values.locked ?? false;

  // The same rules the server applies (src/lib/events/formats.ts), so the form only offers what will save.
  const selected = night?.venue ?? venues.find((v) => v.id === venueId);
  const venueShape = selected ?? { type: newKind === "SPACE" ? ("CHEF_SPACE" as const) : ("CHEF_HOME" as const), capacity: newKind === "SPACE" ? newCapacity : RULES.MAX_HOME_GUESTS, hasBar: newKind === "SPACE" && newHasBar };
  const limits = dinnerLimits(venueShape, night);
  const effectiveDrinks: Drinks = limits.barAllowed ? drinks : "BYOB";
  const seatHint = limits.format === "HOME" ? `At home: ${RULES.MAX_HOME_GUESTS} at most.` : night ? `The venue agreed to ${limits.minSeats}–${limits.maxSeats} for this night.` : `What the room holds: ${limits.maxSeats}.`;

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
        <Field label="Date" hint={night ? "Set by the open night." : undefined} error={f.date}>
          <input name="date" type="date" defaultValue={values.date} required readOnly={locked || Boolean(night)} className={fieldClass} />
        </Field>
        <Field label="Start (New York time)" error={f.time}>
          <input name="time" type="time" defaultValue={values.time} required readOnly={locked || Boolean(night)} className={fieldClass} />
        </Field>
        <Field label="Duration (minutes)" hint={night ? `The room is yours for ${night.durationMin} minutes.` : undefined} error={f.durationMin}>
          <input name="durationMin" type="number" min={30} max={night?.durationMin ?? 600} step={15} defaultValue={values.durationMin} required className={fieldClass} />
        </Field>
      </div>

      <section className="rounded-2xl border border-line p-4">
        <p className="text-sm font-medium">Where</p>
        {night ? (
          <>
            <input type="hidden" name="venueId" value={night.venue.id} />
            <p className="mt-2 font-mono text-xs uppercase tracking-wide text-muted">Room · open night · {night.dateLabel}</p>
            <p className="mt-1 font-display text-xl">{night.venue.name ?? "A room we've booked"}</p>
            <p className="text-sm text-muted">
              {night.venue.neighborhood} · near {night.venue.crossStreets} · {night.venue.hasBar ? "licensed bar" : "no bar, BYOB"}
            </p>
            <p className="mt-2 text-xs text-muted">The room, the date and the time come from the open night. Guests see the neighborhood; confirmed guests get the address 48 hours before.</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">Guests see the neighborhood and cross streets only. The address goes out by text 48 h before.</p>
            <div className="mt-3">
              <Field label="Venue" error={f.venueId}>
                <select name="venueId" value={venueId} onChange={(e) => setVenueId(e.target.value)} className={fieldClass}>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {venueOptionLabel(v)}
                    </option>
                  ))}
                  <option value="">+ New venue</option>
                </select>
              </Field>
            </div>
            {newVenue && (
              <>
                <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-medium">What kind of place?</legend>
                  {(
                    [
                      ["HOME", "My home", `Your kitchen, your table. ${RULES.MAX_HOME_GUESTS} guests at most, BYOB.`],
                      ["SPACE", "My own space", "A restaurant, studio or pop-up you can use. Seats what it holds."],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${newKind === value ? "border-accent bg-accent-soft" : "border-line hover:border-accent"}`}>
                      <input type="radio" name="venueKind" value={value} checked={newKind === value} onChange={() => setNewKind(value)} className="mt-1 accent-accent" />
                      <span>
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-muted">{hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {newKind === "SPACE" && (
                    <>
                      <Field label="Name of the space" hint="Told to confirmed guests with the address." error={f.venueName}>
                        <input name="venueName" maxLength={80} className={fieldClass} placeholder="The back room at Rosa's" />
                      </Field>
                      <Field label="Seats" hint="How many it holds at one table." error={f.venueCapacity}>
                        <input name="venueCapacity" type="number" min={2} max={RULES.MAX_VENUE_CAPACITY} value={newCapacity} onChange={(e) => setNewCapacity(Number(e.target.value) || 0)} className={fieldClass} />
                      </Field>
                      <label className="flex items-center gap-2 text-sm sm:col-span-2">
                        <input type="checkbox" name="venueHasBar" checked={newHasBar} onChange={(e) => setNewHasBar(e.target.checked)} className="accent-accent" />
                        The space has its own licensed bar
                      </label>
                    </>
                  )}
                  <Field label="Street address (private)" error={f.venueAddress}>
                    <input name="venueAddress" className={fieldClass} placeholder="12 Orchard St, Apt 3" />
                  </Field>
                  <Field label="Neighborhood" hint="This is what guests see." error={f.venueNeighborhood ?? f.venueBorough}>
                    <NeighborhoodSelect name="venueNeighborhood" anyLabel="Choose a neighborhood" className={fieldClass} />
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
              </>
            )}
          </>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price per seat ($)" error={f.priceDollars}>
          <input name="priceDollars" type="number" min={0} max={1000} step={1} defaultValue={values.priceDollars} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label="Minimum guests" hint="Below this at the cutoff, the dinner is cancelled and every guest is told." error={f.minGuests}>
          <input name="minGuests" type="number" min={limits.minSeats} max={limits.maxSeats} defaultValue={values.minGuests} required readOnly={locked} className={fieldClass} />
        </Field>
        <Field label={`Maximum guests (≤ ${limits.maxSeats})`} hint={seatHint} error={f.maxGuests}>
          <input name="maxGuests" type="number" min={1} max={limits.maxSeats} defaultValue={values.maxGuests} required readOnly={locked} className={fieldClass} />
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
        <p className="text-sm font-medium">Drinks</p>
        {limits.barAllowed ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["BYOB", "Bring your own", "Guests bring what they'd like to drink."],
                ["BAR", "The venue's bar is open", "The venue pours and charges for drinks under its own license. Never part of your ticket."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${effectiveDrinks === value ? "border-accent bg-accent-soft" : "border-line hover:border-accent"}`}>
                <input type="radio" name="drinks" value={value} checked={effectiveDrinks === value} onChange={() => setDrinks(value)} className="mt-1 accent-accent" />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <>
            <input type="hidden" name="drinks" value="BYOB" />
            <p className="mt-1 text-xs text-muted">{limits.format === "HOME" ? "Dinners at home are BYOB: you never sell drinks." : "BYOB: this space has no licensed bar on file."}</p>
          </>
        )}
        {f.drinks && <span role="alert" className="mt-2 block text-xs text-red-700 dark:text-red-300">{f.drinks}</span>}
        <div className="mt-3">
          <Field label="Drinks note" hint={effectiveDrinks === "BAR" ? "What the bar pours, if it helps." : "Pairing suggestions, if you like."} error={f.byobNote}>
            <textarea name="byobNote" rows={2} defaultValue={values.byobNote} maxLength={200} className={fieldClass} />
          </Field>
        </div>
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

      <Field label="Dietary notes" hint="Allergens, what can be accommodated." error={f.dietaryNotes}>
        <textarea name="dietaryNotes" rows={2} defaultValue={values.dietaryNotes} maxLength={500} className={fieldClass} />
      </Field>

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
      {withReason && <input name="reason" placeholder="Reason (sent to guests)" maxLength={300} className={`${fieldClass} w-56 py-1.5 text-xs`} />}
      <button type="submit" disabled={pending} className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${styles}`}>
        {pending ? "…" : label}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span>}
    </form>
  );
}
