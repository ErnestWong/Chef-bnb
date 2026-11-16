"use client";

import { useActionState, useState } from "react";
import type { FormResult } from "@/app/actions/chefs";
import {
  cancelOpenNightAction,
  createOpenNightAction,
  createPartnerVenueAction,
  decidePitchAction,
  pitchNightAction,
  withdrawPitchAction,
} from "@/app/actions/nights";
import { RULES } from "@/lib/bookings/rules";
import { formatMoney } from "@/lib/format";
import { netAtFullTable, type VenueTake } from "@/lib/nights/terms";
import { Field, FormError, fieldClass } from "./form-ui";
import { NeighborhoodSelect } from "./neighborhood-select";

const errorsOf = (state: FormResult | null) => (state && !state.ok ? state.fields ?? {} : {});
const messageOf = (state: FormResult | null) => (state && !state.ok ? state.error : undefined);

/** A chef's pitch for one open night, with a live estimate of what a full table nets. */
export function PitchForm({ night }: { night: { id: string; minSeats: number; maxSeats: number; suggestedPriceCents: number | null } & VenueTake }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(pitchNightAction, null);
  const f = errorsOf(state);
  const [price, setPrice] = useState(night.suggestedPriceCents !== null ? night.suggestedPriceCents / 100 : 85);
  const [seats, setSeats] = useState(night.maxSeats);
  const [pitchLength, setPitchLength] = useState(0);
  const net = netAtFullTable(night, Math.round(price * 100), seats);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="nightId" value={night.id} />
      <FormError message={messageOf(state)} />
      <Field label="Name the dinner" error={f.title}>
        <input name="title" required minLength={3} maxLength={80} placeholder="Lunar New Year at the café" className={fieldClass} />
      </Field>
      <Field
        label="The menu, and what the night is like"
        hint={
          <span className="flex justify-between gap-4">
            <span>Four or five courses, one line each, and a sentence on the room. It becomes your dinner&apos;s description.</span>
            <span className="shrink-0">{pitchLength < 40 ? `${40 - pitchLength} more` : `${pitchLength} / 1500`}</span>
          </span>
        }
        error={f.pitch}
      >
        <textarea name="pitch" rows={6} required maxLength={1500} onChange={(e) => setPitchLength(e.target.value.trim().length)} className={fieldClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price per seat ($)" error={f.priceDollars}>
          <input name="priceDollars" type="number" min={0} max={1000} step={1} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} required className={fieldClass} />
        </Field>
        <Field label={`Seats (${night.minSeats}–${night.maxSeats})`} hint="One table, everyone at it." error={f.maxGuests}>
          <input name="maxGuests" type="number" min={night.minSeats} max={night.maxSeats} value={seats} onChange={(e) => setSeats(Number(e.target.value) || 0)} required className={fieldClass} />
        </Field>
      </div>
      <p className="rounded-xl bg-paper-2 px-4 py-3 text-sm">
        A full table of {seats} at {formatMoney(Math.round(price * 100))} nets you about <span className="font-medium">{formatMoney(net)}</span> after the venue&apos;s share, before food costs.
      </p>
      <div>
        <button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "Sending…" : "Pitch this night"}
        </button>
      </div>
    </form>
  );
}

export function WithdrawPitchButton({ pitchId, nightId }: { pitchId: string; nightId: string }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(withdrawPitchAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3" onSubmit={(e) => { if (!window.confirm("Withdraw your pitch for this night?")) e.preventDefault(); }}>
      <input type="hidden" name="pitchId" value={pitchId} />
      <input type="hidden" name="nightId" value={nightId} />
      <button type="submit" disabled={pending} className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50">
        {pending ? "…" : "Withdraw pitch"}
      </button>
      {messageOf(state) && <span className="text-xs text-red-700 dark:text-red-300">{messageOf(state)}</span>}
    </form>
  );
}

// ---------- Admin ----------

export function PartnerVenueForm() {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(createPartnerVenueAction, null);
  const f = errorsOf(state);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError message={messageOf(state)} />
      </div>
      <Field label="Name" hint="Told to chefs, and to confirmed guests with the address." error={f.name}>
        <input name="name" required maxLength={80} placeholder="Café on Fulton St" className={fieldClass} />
      </Field>
      <Field label="One line for chefs" hint="What the room is: “A café after close”." error={f.description}>
        <input name="description" required maxLength={120} className={fieldClass} />
      </Field>
      <Field label="Kitchen" hint="Burners, ovens, walk-in, what's missing." error={f.kitchenNotes}>
        <input name="kitchenNotes" maxLength={300} placeholder="6 burners · 2 ovens · walk-in" className={fieldClass} />
      </Field>
      <Field label="Seats at one table" error={f.capacity}>
        <input name="capacity" type="number" min={2} max={RULES.MAX_VENUE_CAPACITY} required className={fieldClass} />
      </Field>
      <Field label="Street address (private)" error={f.address}>
        <input name="address" required maxLength={200} className={fieldClass} />
      </Field>
      <Field label="Neighborhood" error={f.neighborhood}>
        <NeighborhoodSelect name="neighborhood" anyLabel="Choose a neighborhood" className={fieldClass} required />
      </Field>
      <Field label="Nearest cross streets" error={f.crossStreets}>
        <input name="crossStreets" required maxLength={80} className={fieldClass} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="hasBar" className="accent-accent" /> Licensed bar on site
      </label>
      <Field label="Latitude (optional)" error={f.lat}>
        <input name="lat" type="number" step="0.0001" className={fieldClass} />
      </Field>
      <Field label="Longitude (optional)" error={f.lng}>
        <input name="lng" type="number" step="0.0001" className={fieldClass} />
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent disabled:opacity-50">
          {pending ? "Saving…" : "Add room"}
        </button>
      </div>
    </form>
  );
}

export function OpenNightForm({ rooms }: { rooms: { id: string; label: string; capacity: number }[] }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(createOpenNightAction, null);
  const f = errorsOf(state);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <FormError message={messageOf(state)} />
      </div>
      <div className="sm:col-span-3">
        <Field label="Room" error={f.venueId}>
          <select name="venueId" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Choose a room
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} · seats {r.capacity}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Date" error={f.date}>
        <input name="date" type="date" required className={fieldClass} />
      </Field>
      <Field label="Start (New York time)" error={f.time}>
        <input name="time" type="time" defaultValue="19:00" required className={fieldClass} />
      </Field>
      <Field label="Room for (minutes)" error={f.durationMin}>
        <input name="durationMin" type="number" min={60} max={600} step={15} defaultValue={180} required className={fieldClass} />
      </Field>
      <Field label="Fewest guests" hint="The venue's floor for the night." error={f.minSeats}>
        <input name="minSeats" type="number" min={1} max={RULES.MAX_VENUE_CAPACITY} required className={fieldClass} />
      </Field>
      <Field label="Most guests" error={f.maxSeats}>
        <input name="maxSeats" type="number" min={1} max={RULES.MAX_VENUE_CAPACITY} required className={fieldClass} />
      </Field>
      <Field label="Guide price per seat ($)" hint="Optional; drives the chef's estimate." error={f.suggestedPriceDollars}>
        <input name="suggestedPriceDollars" type="number" min={0} max={1000} step={1} className={fieldClass} />
      </Field>
      <Field label="Venue's share of tickets (%)" error={f.venueSharePct}>
        <input name="venueSharePct" type="number" min={0} max={100} defaultValue={0} required className={fieldClass} />
      </Field>
      <Field label="Flat fee ($)" error={f.venueFeeDollars}>
        <input name="venueFeeDollars" type="number" min={0} step={1} defaultValue={0} required className={fieldClass} />
      </Field>
      <Field label="Other terms" hint="“keeps the bar”, “out by 11”" error={f.terms}>
        <input name="terms" maxLength={200} className={fieldClass} />
      </Field>
      <div className="sm:col-span-3">
        <Field label="Crew credits (public)" hint="Shown on the dinner page, e.g. “Hosted by Ana · Table by Rosa”." error={f.crew}>
          <input name="crew" maxLength={120} className={fieldClass} />
        </Field>
      </div>
      <div className="sm:col-span-3">
        <button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "Saving…" : "Put the night on the board"}
        </button>
      </div>
    </form>
  );
}

export function PitchDecisionForm({ pitchId, nightId }: { pitchId: string; nightId: string }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(decidePitchAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="pitchId" value={pitchId} />
      <input type="hidden" name="nightId" value={nightId} />
      <FormError message={messageOf(state)} />
      <input name="note" maxLength={500} placeholder="Note to the chef (optional)" className={`${fieldClass} text-xs`} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="APPROVE" disabled={pending} className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          Approve: give them the night
        </button>
        <button type="submit" name="decision" value="DECLINE" disabled={pending} className="rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-accent disabled:opacity-50">
          Decline
        </button>
      </div>
    </form>
  );
}

export function CancelNightButton({ nightId }: { nightId: string }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(cancelOpenNightAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" onSubmit={(e) => { if (!window.confirm("Take this night off the board? Pending pitches are declined and their chefs told.")) e.preventDefault(); }}>
      <input type="hidden" name="nightId" value={nightId} />
      <button type="submit" disabled={pending} className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40">
        {pending ? "…" : "Cancel night"}
      </button>
      {messageOf(state) && <span className="text-xs text-red-700 dark:text-red-300">{messageOf(state)}</span>}
    </form>
  );
}
