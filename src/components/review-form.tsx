"use client";

import { useActionState, useState } from "react";
import { submitReviewAction } from "@/app/actions/reviews";
import { moderateReviewAction } from "@/app/actions/reviews";
import type { ActionResult } from "@/app/actions/bookings";
import { fieldClass, FormError } from "./form-ui";

const WORDS = ["", "Not for me", "Okay", "Good", "Great", "One of the best"];

/** 1–5 stars as big radio buttons, an optional note, one submit. */
export function ReviewForm({ bookingId, chefName }: { bookingId: string; chefName: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(submitReviewAction, null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <fieldset>
        <legend className="text-sm font-medium">How was dinner with {chefName}?</legend>
        <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)} title={WORDS[n]}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} required className="sr-only" />
              <span aria-hidden className={`font-display text-4xl leading-none ${n <= shown ? "text-accent" : "text-line"}`}>★</span>
              <span className="sr-only">{n} {n === 1 ? "star" : "stars"}: {WORDS[n]}</span>
            </label>
          ))}
          <span className="ml-3 text-sm text-muted">{WORDS[shown]}</span>
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">A few words <span className="font-normal text-muted">(optional, shown anonymously)</span></span>
        <textarea name="body" rows={3} maxLength={1000} placeholder="The food, the table, the host. What should the next guest know?" className={fieldClass} />
      </label>
      <div>
        <button type="submit" disabled={pending || rating === 0} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          {pending ? "Posting…" : "Post review"}
        </button>
      </div>
    </form>
  );
}

/** Admin: remove or restore one review. */
export function ModerateReviewButton({ reviewId, removed }: { reviewId: string; removed: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(moderateReviewAction, null);
  return (
    <form
      action={action}
      className="inline-flex flex-col gap-1"
      onSubmit={(e) => {
        if (!removed && !window.confirm("Remove this review from the chef's profile and averages? You can restore it later.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="action" value={removed ? "restore" : "remove"} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${removed ? "border-line hover:border-accent" : "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"}`}
      >
        {pending ? "…" : removed ? "Restore" : "Remove"}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700 dark:text-red-300">{state.error}</span>}
    </form>
  );
}
