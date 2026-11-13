"use client";

import { useActionState } from "react";
import { applyAsChefAction, type FormResult } from "@/app/actions/chefs";
import { BOROUGH_LABELS } from "@/lib/format";
import { BOROUGHS } from "@/lib/queries/event-filters";
import { Field, FormError, fieldClass } from "./form-ui";

type Cuisine = { id: string; name: string };

export function ApplyForm({ cuisines, defaultName }: { cuisines: Cuisine[]; defaultName: string }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(applyAsChefAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};

  return (
    <form action={action} className="flex flex-col gap-6">
      <FormError message={state && !state.ok ? state.error : undefined} />

      <Field label="Name guests will see" error={f.displayName}>
        <input name="displayName" defaultValue={defaultName} required maxLength={60} className={fieldClass} />
      </Field>
      <Field label="About you and your food" hint="A few sentences. What you cook, where you learned, what a dinner with you is like." error={f.bio}>
        <textarea name="bio" rows={5} required maxLength={1200} className={fieldClass} />
      </Field>
      <Field label="Credentials" hint="Restaurants, school, certificates — optional but it helps approval." error={f.credentials}>
        <input name="credentials" maxLength={300} className={fieldClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website" error={f.website}>
          <input name="website" type="url" placeholder="https://" className={fieldClass} />
        </Field>
        <Field label="Instagram" error={f.instagram}>
          <input name="instagram" placeholder="@handle" className={fieldClass} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Cuisines (up to 4)</legend>
        <div className="flex flex-wrap gap-2">
          {cuisines.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" name="cuisineIds" value={c.id} className="accent-accent" />
              {c.name}
            </label>
          ))}
        </div>
        {f.cuisineIds && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{f.cuisineIds}</span>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Home borough" error={f.homeBorough}>
          <select name="homeBorough" className={fieldClass} defaultValue="">
            <option value="">Prefer not to say</option>
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>{BOROUGH_LABELS[b]}</option>
            ))}
          </select>
        </Field>
        <Field label="Where would you host?" error={f.hosting}>
          <select name="hosting" className={fieldClass} defaultValue="HOME">
            <option value="HOME">My home</option>
            <option value="VENUE">I&apos;d need a venue</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="needsFoh" className="accent-accent" /> I&apos;d want front-of-house help</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="needsServers" className="accent-accent" /> I&apos;d want servers</label>
      </div>

      <div className="rounded-2xl border border-line p-4">
        <p className="text-sm font-medium">Getting paid</p>
        <p className="mt-1 text-xs text-muted">Guests pay you directly for now. This is shown only to guests who request a seat.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Venmo / Zelle handle" error={f.paymentHandle}>
            <input name="paymentHandle" required placeholder="@yourname" maxLength={60} className={fieldClass} />
          </Field>
          <Field label="Payment note" hint="e.g. 'Venmo preferred, within 48 h'" error={f.paymentNote}>
            <input name="paymentNote" maxLength={200} className={fieldClass} />
          </Field>
        </div>
      </div>

      <Field label="NYC Food Protection Certificate number" hint="Optional now; it will matter for approval." error={f.foodCertNumber}>
        <input name="foodCertNumber" maxLength={40} className={fieldClass} />
      </Field>

      <p className="text-xs text-muted">Photos and a sample menu PDF can be added once file uploads are enabled (Vercel Blob).</p>

      <button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
