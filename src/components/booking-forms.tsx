"use client";

import { useActionState, useState } from "react";
import type { BookingType } from "@/generated/prisma/enums";
import { requestSeatsAction, transitionBookingAction, type ActionResult } from "@/app/actions/bookings";
import { RULES } from "@/lib/bookings/rules";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-sm";

type EventForBooking = {
  id: string;
  allowedBookingTypes: BookingType[];
  minGuests: number;
  maxGuests: number;
  seatsLeft: number;
  mode: "UNSOLD" | "OPEN" | "BOUGHT_OUT";
  priceCents: number;
};

export function RequestSeatsForm({ event }: { event: EventForBooking }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(requestSeatsAction, null);
  const types = event.allowedBookingTypes;
  const buyoutPossible = types.includes("BUYOUT") && event.mode === "UNSOLD";
  const groupMax = Math.min(RULES.GROUP_CAP, event.seatsLeft);
  const options: { value: BookingType; label: string; hint: string; disabled: boolean }[] = [
    { value: "SEAT", label: "Solo seat", hint: "One seat at the table, join the others.", disabled: !types.includes("SEAT") || event.seatsLeft < 1 },
    { value: "GROUP", label: "Group", hint: `2–${RULES.GROUP_CAP} guests seated together.`, disabled: !types.includes("GROUP") || groupMax < 2 },
    { value: "BUYOUT", label: "Buy out the table", hint: `${event.minGuests}–${event.maxGuests} guests; the whole dinner is yours.`, disabled: !buyoutPossible },
  ];
  const firstEnabled = options.find((o) => !o.disabled)?.value;
  const [type, setType] = useState<BookingType | undefined>(firstEnabled);
  // Party size follows the booking type: a solo seat is exactly 1; a group is
  // 2 to the cap (or what's left); a buyout is the chef's min to max.
  const range = type === "GROUP" ? { min: 2, max: groupMax } : type === "BUYOUT" ? { min: event.minGuests, max: event.maxGuests } : { min: 1, max: 1 };
  const [partySize, setPartySize] = useState(range.min);
  const choose = (next: BookingType) => {
    setType(next);
    const r = next === "GROUP" ? { min: 2, max: groupMax } : next === "BUYOUT" ? { min: event.minGuests, max: event.maxGuests } : { min: 1, max: 1 };
    setPartySize((current) => Math.min(Math.max(current, r.min), r.max));
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="eventId" value={event.id} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">How are you coming?</legend>
        {options
          .filter((o) => types.includes(o.value))
          .map((o) => (
            <label key={o.value} className={`flex items-start gap-3 rounded-xl border border-line p-3 ${o.disabled ? "opacity-50" : "cursor-pointer hover:border-accent"}`}>
              <input type="radio" name="type" value={o.value} checked={type === o.value} onChange={() => choose(o.value)} disabled={o.disabled} required className="mt-1 accent-accent" />
              <span>
                <span className="block font-medium">{o.label}</span>
                <span className="block text-xs text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Party size
        <input
          type="number"
          name="partySize"
          min={range.min}
          max={range.max}
          value={partySize}
          onChange={(e) => setPartySize(Number(e.target.value))}
          readOnly={range.min === range.max}
          required
          className={`${field} w-32 ${range.min === range.max ? "text-muted" : ""}`}
        />
        <span className="text-xs text-muted">
          {type === "SEAT" && "One seat, just you."}
          {type === "GROUP" && `${range.min}–${range.max} guests, seated together.`}
          {type === "BUYOUT" && `${range.min}–${range.max} guests; you pay for at least ${event.minGuests}.`}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dietary notes <span className="text-muted">(optional, shared with the chef)</span>
        <textarea name="dietaryNotes" rows={3} maxLength={500} className={field} placeholder="Allergies, vegetarian, anything the chef should know" />
      </label>
      {state && !state.ok && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending || !firstEnabled} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Requesting…" : "Request seats"}
      </button>
      <p className="text-xs text-muted">
        Nothing is charged here. You&apos;ll get the chef&apos;s payment details next; the seat is held for {RULES.REQUEST_EXPIRY_HOURS} hours while you pay.
      </p>
    </form>
  );
}

export function TransitionButton({
  bookingId,
  to,
  label,
  returnTo,
  variant = "secondary",
  confirmText,
}: {
  bookingId: string;
  to: "CONFIRMED" | "CANCELLED" | "ATTENDED" | "NO_SHOW";
  label: string;
  returnTo: string;
  variant?: "primary" | "secondary" | "danger";
  confirmText?: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(transitionBookingAction, null);
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
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" disabled={pending} className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${styles}`}>
        {pending ? "…" : label}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span>}
    </form>
  );
}
