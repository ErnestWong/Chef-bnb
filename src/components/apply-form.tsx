"use client";

import { useActionState, useRef, useState, type KeyboardEvent } from "react";
import { applyAsChefAction, type FieldErrors, type FormResult } from "@/app/actions/chefs";
import { applySchema } from "@/lib/chefs/apply";
import { BOROUGH_LABELS } from "@/lib/format";
import { BOROUGHS } from "@/lib/queries/event-filters";
import { Field, FormError, fieldClass } from "./form-ui";

type Cuisine = { id: string; name: string };

const STEPS = [
  { title: "You", blurb: "Who's cooking" },
  { title: "Your food", blurb: "What, and where" },
  { title: "Getting paid", blurb: "How guests pay you" },
] as const;

/** Which schema fields live on which step, so errors land on the right screen. */
const STEP_FIELDS: readonly (readonly string[])[] = [
  ["displayName", "bio", "credentials", "website", "instagram"],
  ["cuisineIds", "homeBorough", "hosting", "needsFoh", "needsServers"],
  ["paymentHandle", "paymentNote", "foodCertNumber"],
];

/** Same shape the server action builds, so client and server validation agree. */
function rawValues(form: HTMLFormElement) {
  const fd = new FormData(form);
  return {
    displayName: fd.get("displayName"),
    bio: fd.get("bio"),
    credentials: fd.get("credentials") || undefined,
    website: fd.get("website") || "",
    instagram: fd.get("instagram") || "",
    homeBorough: fd.get("homeBorough") || "",
    cuisineIds: fd.getAll("cuisineIds").map(String),
    hosting: fd.get("hosting"),
    needsFoh: fd.get("needsFoh") === "on",
    needsServers: fd.get("needsServers") === "on",
    paymentHandle: fd.get("paymentHandle"),
    paymentNote: fd.get("paymentNote") || undefined,
    foodCertNumber: fd.get("foodCertNumber") || undefined,
  };
}

function stepFor(field: string): number {
  const i = STEP_FIELDS.findIndex((fields) => fields.includes(field));
  return i === -1 ? 0 : i;
}

/**
 * Three short screens, one form. Every field stays mounted (hidden screens
 * are just display:none) so the final submit carries everything; each
 * "Continue" validates only its own screen with the shared zod schema.
 */
export function ApplyForm({ cuisines, defaultName }: { cuisines: Cuisine[]; defaultName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  // A server-side rejection lands on the first screen that has a problem.
  const [state, action, pending] = useActionState<FormResult | null, FormData>(async (prev, formData) => {
    const result = await applyAsChefAction(prev, formData);
    if (!result.ok && result.fields) {
      const keys = Object.keys(result.fields);
      if (keys.length) setStep(Math.min(...keys.map(stepFor)));
    }
    return result;
  }, null);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [bioLength, setBioLength] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [hosting, setHosting] = useState<"HOME" | "VENUE">("HOME");

  const serverErrors = state && !state.ok ? state.fields ?? {} : {};
  const errors: FieldErrors = { ...serverErrors, ...clientErrors };
  const last = STEPS.length - 1;

  function validateStep(i: number): boolean {
    const form = formRef.current;
    if (!form) return true;
    const result = applySchema.safeParse(rawValues(form));
    const own: FieldErrors = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (STEP_FIELDS[i].includes(key) && !own[key]) own[key] = issue.message;
      }
    }
    setClientErrors(own);
    if (Object.keys(own).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(own)[0]}"]`)?.focus();
      return false;
    }
    return true;
  }

  function next() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, last));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function back() {
    setClientErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  // Enter in a text field moves forward instead of submitting a half-finished form.
  function onKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    const t = e.target as HTMLElement;
    if (e.key === "Enter" && t.tagName === "INPUT" && step < last) {
      e.preventDefault();
      next();
    }
  }

  const toggleCuisine = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
  const cuisineNames = cuisines.filter((c) => picked.includes(c.id)).map((c) => c.name);

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        if (step < last || !validateStep(last)) e.preventDefault();
      }}
      className="flex flex-col gap-8"
    >
      <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.title} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (done ? setStep(i) : undefined)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${current ? "border-accent bg-accent-soft text-accent" : done ? "border-line hover:border-accent" : "border-line text-muted"}`}
              >
                <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${current ? "bg-accent text-white" : done ? "bg-accent text-white" : "border border-line"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className="font-medium">{s.title}</span>
              </button>
              {i < last && <span aria-hidden className="h-px w-4 bg-line" />}
            </li>
          );
        })}
      </ol>

      <FormError message={state && !state.ok ? state.error : undefined} />

      {/* Step 1: You */}
      <section hidden={step !== 0} className="flex flex-col gap-5">
        <header>
          <h2 className="font-display text-3xl">{STEPS[0].title}</h2>
          <p className="mt-1 text-sm text-muted">Guests book the person as much as the menu. Say who you are in your own words.</p>
        </header>
        <Field label="Name guests will see" error={errors.displayName}>
          <input name="displayName" defaultValue={defaultName} maxLength={60} autoComplete="name" className={fieldClass} />
        </Field>
        <Field
          label="About you and your food"
          hint={
            <span className="flex justify-between gap-4">
              <span>What you cook, where you learned it, what a night at your table is like.</span>
              <span className={`shrink-0 whitespace-nowrap ${bioLength < 40 ? "" : "text-accent"}`}>{bioLength < 40 ? `${40 - bioLength} more characters` : `${bioLength} / 1200`}</span>
            </span>
          }
          error={errors.bio}
        >
          <textarea
            name="bio"
            rows={5}
            maxLength={1200}
            onChange={(e) => setBioLength(e.target.value.trim().length)}
            placeholder="Oaxacan moles and fresh masa. Eight seats around one long table in Bushwick; tortillas come off the comal while you watch."
            className={fieldClass}
          />
        </Field>
        <Field label="Credentials" hint="Restaurants, school, certificates. Optional, but it speeds up approval." error={errors.credentials}>
          <input name="credentials" maxLength={300} placeholder="Line cook, 6 years; NYC Food Protection Certificate" className={fieldClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" hint="Optional" error={errors.instagram}>
            <input name="instagram" placeholder="@handle" className={fieldClass} />
          </Field>
          <Field label="Website" hint="Optional" error={errors.website}>
            <input name="website" type="url" placeholder="https://" className={fieldClass} />
          </Field>
        </div>
      </section>

      {/* Step 2: Your food */}
      <section hidden={step !== 1} className="flex flex-col gap-5">
        <header>
          <h2 className="font-display text-3xl">{STEPS[1].title}</h2>
          <p className="mt-1 text-sm text-muted">Pick up to four cuisines. They become the tags guests filter by.</p>
        </header>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Cuisines</legend>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((c) => {
              const on = picked.includes(c.id);
              const full = picked.length >= 4 && !on;
              return (
                <label key={c.id} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent-soft text-accent" : full ? "cursor-not-allowed border-line text-muted opacity-60" : "cursor-pointer border-line hover:border-accent"}`}>
                  <input type="checkbox" name="cuisineIds" value={c.id} checked={on} disabled={full} onChange={(e) => toggleCuisine(c.id, e.target.checked)} className="sr-only" />
                  {on && <span aria-hidden>✓</span>}
                  {c.name}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted">{picked.length === 0 ? "Pick at least one." : `${picked.length} of 4 picked.`}</p>
          {errors.cuisineIds && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{errors.cuisineIds}</span>}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Where would you host?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["HOME", "My home", "Your kitchen, your table. The address stays private until 48 hours before."],
                ["VENUE", "I'd need a venue", "You cook; we'll help find a room. Fine to apply now and sort this later."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${hosting === value ? "border-accent bg-accent-soft" : "border-line hover:border-accent"}`}>
                <input type="radio" name="hosting" value={value} checked={hosting === value} onChange={() => setHosting(value)} className="mt-1 accent-accent" />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.hosting && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{errors.hosting}</span>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Home borough" hint="Shown on your profile" error={errors.homeBorough}>
            <select name="homeBorough" className={fieldClass} defaultValue="">
              <option value="">Prefer not to say</option>
              {BOROUGHS.map((b) => (
                <option key={b} value={b}>{BOROUGH_LABELS[b]}</option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Would you want help on the night?</span>
            <label className="flex items-center gap-2"><input type="checkbox" name="needsFoh" className="accent-accent" /> Front-of-house (greeting, seating, pacing)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="needsServers" className="accent-accent" /> Servers</label>
            <span className="text-xs text-muted">Just so we know; nothing is arranged yet.</span>
          </div>
        </div>
      </section>

      {/* Step 3: Getting paid */}
      <section hidden={step !== 2} className="flex flex-col gap-5">
        <header>
          <h2 className="font-display text-3xl">{STEPS[2].title}</h2>
          <p className="mt-1 text-sm text-muted">Guests pay you directly. Your handle is shown only to someone who has requested a seat.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venmo or Zelle handle" error={errors.paymentHandle}>
            <input name="paymentHandle" placeholder="@yourname" maxLength={60} className={fieldClass} />
          </Field>
          <Field label="Payment note" hint="Optional, e.g. “Venmo preferred, within 48 h”" error={errors.paymentNote}>
            <input name="paymentNote" maxLength={200} className={fieldClass} />
          </Field>
        </div>
        <Field label="NYC Food Protection Certificate number" hint="Optional now; it matters for approval. Leave it blank if you're still getting one." error={errors.foodCertNumber}>
          <input name="foodCertNumber" maxLength={40} className={`${fieldClass} sm:w-1/2`} />
        </Field>

        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <p className="font-medium">What happens next</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
            <li>We read your application, usually within a few days.</li>
            <li>You get an email either way; your status also shows on your chef page.</li>
            <li>Once approved, you publish your first dinner. Photos and a menu PDF can be added then.</li>
          </ol>
          {cuisineNames.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              Applying as <span className="text-foreground">{cuisineNames.join(", ")}</span>, hosting {hosting === "HOME" ? "at home" : "at a venue"}.
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {step > 0 && (
          <button type="button" onClick={back} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent">
            Back
          </button>
        )}
        {/* Distinct keys: React must not reuse the Continue <button> node as the submit button, or the
            click that advances to the last step continues as a native submit of the half-filled form. */}
        {step < last ? (
          <button key="continue" type="button" onClick={next} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Continue
          </button>
        ) : (
          <button key="submit" type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {pending ? "Sending…" : "Send application"}
          </button>
        )}
        <span className="text-xs text-muted">
          Step {step + 1} of {STEPS.length} · {STEPS[step].blurb}
        </span>
      </div>
    </form>
  );
}
